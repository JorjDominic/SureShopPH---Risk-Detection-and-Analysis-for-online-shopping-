import { supabase } from '../config/supabase';

// ---------------------------------------------------------------------------
// Scan Service
// ---------------------------------------------------------------------------
// Performs URL risk analysis for SureShopPH and persists the result so the
// scan can be reviewed later in the user's history.
//
// Strategy:
//   1. Validate + normalize the URL.
//   2. Try the Supabase `scan` Edge Function (richer, server-side analysis).
//   3. If the Edge Function is not available or fails, fall back to a local
//      client-side heuristic so the user always gets a usable result.
//   4. Persist to `public.scan_history` (best-effort, non-fatal on insert
//      failure — the analysis result is still returned).
//
// scan_history columns referenced (must exist in DB):
//   id          uuid PK (default uuid_generate_v4())
//   user_id     uuid (auth.users.id)
//   url         text
//   scan_mode   text   ('product' | 'url')
//   platform    text   (e.g. 'shopee', 'lazada', 'tiktok', 'web')
//   product_name text  (best-effort label / hostname)
//   risk_score  int    (0–100)
//   risk_level  text   ('Low' | 'Medium' | 'High')
//   notes       text   (human-readable summary of signals)
//   flags       jsonb  (array of detected signal codes)
//   source      text   ('edge' | 'heuristic')
//   created_at  timestamptz default now()
// ---------------------------------------------------------------------------

const HIGH_RISK_TLDS = new Set([
  'zip', 'mov', 'top', 'xyz', 'click', 'link', 'work', 'support', 'country',
  'gq', 'tk', 'ml', 'cf', 'ga', 'rest', 'fit', 'icu', 'cam', 'wang', 'loan',
]);

const SUSPICIOUS_KEYWORDS = [
  'free', 'giveaway', 'promo', 'discount', 'voucher', 'rebate', 'login',
  'verify', 'account', 'secure', 'update', 'wallet', 'bank', 'gcash',
  'paymaya', 'otp', 'redeem', 'claim', 'win', 'reward', 'bonus',
];

const BRAND_KEYWORDS = ['shopee', 'lazada', 'tiktok', 'shoppe', 'lazda', 'amazon', 'meta', 'facebook'];

const KNOWN_PLATFORMS = [
  { match: /(^|\.)shopee\.ph$/i, platform: 'shopee' },
  { match: /(^|\.)shopee\.com$/i, platform: 'shopee' },
  { match: /(^|\.)lazada\.com\.ph$/i, platform: 'lazada' },
  { match: /(^|\.)tiktok\.com$/i, platform: 'tiktok' },
  { match: /(^|\.)facebook\.com$/i, platform: 'facebook' },
];

// ---------------------------------------------------------------------------
// URL parsing
// ---------------------------------------------------------------------------

const normalizeAndParseUrl = (raw) => {
  if (typeof raw !== 'string') {
    throw new Error('A URL string is required.');
  }
  let trimmed = raw.trim();
  if (!trimmed) throw new Error('Please enter a URL to scan.');

  // Add a scheme if the user pasted "shopee.ph/foo".
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('That does not look like a valid URL.');
  }

  if (!parsed.hostname || !parsed.hostname.includes('.')) {
    throw new Error('That URL is missing a valid hostname.');
  }

  return parsed;
};

const detectPlatform = (hostname) => {
  for (const entry of KNOWN_PLATFORMS) {
    if (entry.match.test(hostname)) return entry.platform;
  }
  return 'web';
};

const isIpHost = (hostname) =>
  /^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname.includes(':');

const hasIdnHomographRisk = (hostname) => {
  // xn-- prefix means IDN; combined with brand-like text is suspicious.
  if (!hostname.includes('xn--')) return false;
  const lower = hostname.toLowerCase();
  return BRAND_KEYWORDS.some((b) => lower.includes(b));
};

const containsBrandSpoof = (hostname) => {
  const lower = hostname.toLowerCase();
  // Look for brand name embedded as a sub-label of a non-brand domain.
  // e.g. shopee.someoneelse.com, lazada-promo.xyz
  return BRAND_KEYWORDS.some((b) => {
    if (!lower.includes(b)) return false;
    return !KNOWN_PLATFORMS.some((p) => p.match.test(hostname));
  });
};

// ---------------------------------------------------------------------------
// Heuristic analyzer
// ---------------------------------------------------------------------------

const analyzeHeuristically = (parsedUrl) => {
  const hostname = parsedUrl.hostname.toLowerCase();
  const fullUrl = parsedUrl.href.toLowerCase();
  const flags = [];
  let score = 0;

  if (parsedUrl.protocol !== 'https:') {
    score += 25;
    flags.push('insecure_scheme');
  }

  if (isIpHost(hostname)) {
    score += 35;
    flags.push('ip_host');
  }

  const tld = hostname.split('.').pop();
  if (HIGH_RISK_TLDS.has(tld)) {
    score += 20;
    flags.push(`risky_tld:${tld}`);
  }

  if (hasIdnHomographRisk(hostname)) {
    score += 30;
    flags.push('idn_homograph');
  }

  if (containsBrandSpoof(hostname)) {
    score += 30;
    flags.push('brand_spoof');
  }

  // Excessive subdomains (e.g. login.update.shopee.fakehost.tld).
  const labels = hostname.split('.');
  if (labels.length > 4) {
    score += 10;
    flags.push('deep_subdomain');
  }

  if (fullUrl.length > 200) {
    score += 10;
    flags.push('long_url');
  }

  // Suspicious keywords in the path / query.
  const path = `${parsedUrl.pathname}${parsedUrl.search}`.toLowerCase();
  const matchedKeywords = SUSPICIOUS_KEYWORDS.filter((k) => path.includes(k));
  if (matchedKeywords.length) {
    score += Math.min(20, matchedKeywords.length * 6);
    flags.push(`keywords:${matchedKeywords.slice(0, 5).join(',')}`);
  }

  // Hyphenated brand combos (lazada-promo, shopee-deal).
  if (BRAND_KEYWORDS.some((b) => hostname.includes(`${b}-`) || hostname.includes(`-${b}`))) {
    score += 15;
    flags.push('brand_hyphen_combo');
  }

  // Cap score at 100.
  if (score > 100) score = 100;

  let risk_level;
  if (score >= 70) risk_level = 'High';
  else if (score >= 40) risk_level = 'Medium';
  else risk_level = 'Low';

  const noteParts = [];
  if (flags.includes('insecure_scheme')) noteParts.push('No HTTPS — traffic is not encrypted.');
  if (flags.includes('ip_host')) noteParts.push('Hostname is a raw IP address.');
  if (flags.some((f) => f.startsWith('risky_tld:'))) noteParts.push(`Top-level domain ".${tld}" is commonly abused.`);
  if (flags.includes('idn_homograph')) noteParts.push('Internationalized domain mimicking a known brand.');
  if (flags.includes('brand_spoof')) noteParts.push('A known brand name appears on a non-official domain.');
  if (flags.includes('brand_hyphen_combo')) noteParts.push('Brand name combined with hyphenated marketing words.');
  if (flags.includes('deep_subdomain')) noteParts.push('Unusually deep subdomain chain.');
  if (flags.includes('long_url')) noteParts.push('URL is unusually long.');
  if (flags.find((f) => f.startsWith('keywords:'))) {
    noteParts.push('URL contains words frequently used in scam pages.');
  }
  if (!noteParts.length) {
    noteParts.push('No high-risk signals detected by the local heuristic.');
  }

  return {
    risk_score: score,
    risk_level,
    flags,
    notes: noteParts.join(' '),
    source: 'heuristic',
  };
};

// ---------------------------------------------------------------------------
// Optional server-side enrichment via Edge Function.
// If the function is missing or errors, we silently fall back to heuristics.
// ---------------------------------------------------------------------------

const tryEdgeAnalyze = async ({ url, scanType, userId }) => {
  try {
    const { data, error } = await supabase.functions.invoke('scan', {
      body: { url, scan_type: scanType, user_id: userId },
    });
    if (error || !data || typeof data.risk_score !== 'number') return null;
    return {
      risk_score: Math.max(0, Math.min(100, Math.round(data.risk_score))),
      risk_level: data.risk_level || 'Low',
      flags: Array.isArray(data.flags) ? data.flags : [],
      notes: data.notes || '',
      product_name: data.product_name,
      platform: data.platform,
      source: 'edge',
    };
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run a scan on the given URL and persist it for the signed-in user.
 *
 * @param {{ url: string, scanType: 'product' | 'url', userId: string }} args
 * @returns {Promise<{
 *   id?: string,
 *   url: string,
 *   scan_mode: string,
 *   platform: string,
 *   product_name: string,
 *   risk_score: number,
 *   risk_level: string,
 *   notes: string,
 *   flags: string[],
 *   source: 'edge' | 'heuristic',
 *   persisted: boolean,
 *   persistError?: string,
 * }>}
 */
export const runScan = async ({ url, scanType = 'product', userId }) => {
  if (!userId) {
    throw new Error('You must be signed in to run a scan.');
  }

  const parsed = normalizeAndParseUrl(url);
  const platform = detectPlatform(parsed.hostname);

  const edge = await tryEdgeAnalyze({
    url: parsed.href,
    scanType,
    userId,
  });

  const local = analyzeHeuristically(parsed);
  const analysis = edge || local;

  const productName =
    analysis.product_name ||
    (scanType === 'product'
      ? `${platform === 'web' ? parsed.hostname : platform} listing`
      : parsed.hostname);

  const row = {
    user_id: userId,
    url: parsed.href,
    scan_mode: scanType,
    platform: edge?.platform || platform,
    product_name: productName,
    risk_score: analysis.risk_score,
    risk_level: analysis.risk_level,
    notes: analysis.notes,
    flags: analysis.flags,
    source: analysis.source,
  };

  let persisted = false;
  let persistError;
  let insertedId;

  try {
    const { data, error } = await supabase
      .from('scan_history')
      .insert(row)
      .select('id')
      .single();
    if (error) {
      persistError = error.message;
    } else {
      insertedId = data?.id;
      persisted = true;
    }
  } catch (err) {
    persistError = err?.message || 'Insert failed.';
  }

  return {
    ...row,
    id: insertedId,
    persisted,
    persistError,
  };
};

/**
 * Lightweight, side-effect-free version (no DB write) used for previews.
 */
export const previewScan = (url) => {
  const parsed = normalizeAndParseUrl(url);
  const platform = detectPlatform(parsed.hostname);
  const local = analyzeHeuristically(parsed);
  return {
    url: parsed.href,
    platform,
    ...local,
  };
};
