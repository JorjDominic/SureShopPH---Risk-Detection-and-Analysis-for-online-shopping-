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
// scan_history columns (actual DB schema):
//   id               uuid PK
//   user_id          uuid (auth.users.id)
//   platform         text   (e.g. 'shopee', 'lazada', 'tiktok', 'web')
//   url              text
//   risk_score       int4   (0–100)
//   risk_level       text   ('Low' | 'Medium' | 'High')
//   flags            jsonb  (array of detected signal codes)
//   confidence_level text   ('Low' | 'Medium' | 'High')
//   confidence_pct   int4   (0–100)
//   scan_mode        text   ('product' | 'url')
//   created_at       timestamptz default now()
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

// Tracking / marketing query params we want to strip so two URLs that point
// at the same listing don't end up as separate rows in scan_history /
// high_risk_listings.
const TRACKING_PARAM_PREFIXES = ['utm_', 'fbclid', 'gclid', 'mc_', '_ga'];
const TRACKING_PARAMS = new Set([
  'fbclid', 'gclid', 'msclkid', 'mc_cid', 'mc_eid', 'igshid', 'yclid',
  '_branch_match_id', 'ref', 'ref_src', 'ref_url', 'spm',
]);

/**
 * Returns a stable canonical form of a URL, suitable for blacklist lookups.
 * Lowercases the host, drops the default port, strips tracking params,
 * removes trailing slashes, and discards the fragment.
 */
const canonicalizeUrl = (parsed) => {
  const u = new URL(parsed.href);
  u.hostname = u.hostname.toLowerCase();
  u.hash = '';

  const params = u.searchParams;
  const drop = [];
  params.forEach((_, key) => {
    const lowered = key.toLowerCase();
    if (
      TRACKING_PARAMS.has(lowered) ||
      TRACKING_PARAM_PREFIXES.some((p) => lowered.startsWith(p))
    ) {
      drop.push(key);
    }
  });
  drop.forEach((k) => params.delete(k));

  // Strip trailing slash from non-root paths.
  if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
    u.pathname = u.pathname.replace(/\/+$/, '');
  }

  return u.toString();
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
// Rate limiting. Prevents a single user (or runaway client) from hammering
// the scan_history table or the optional Edge Function.
// ---------------------------------------------------------------------------

const SCAN_LIMIT_PER_HOUR = 30;

const enforceRateLimit = async (userId) => {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  try {
    const { count, error } = await supabase
      .from('scan_history')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', since);
    if (error) return; // fail open — don't block users on a count error
    if ((count ?? 0) >= SCAN_LIMIT_PER_HOUR) {
      const err = new Error(
        `Scan limit reached (${SCAN_LIMIT_PER_HOUR}/hour). Please try again later.`
      );
      err.code = 'rate_limited';
      throw err;
    }
  } catch (e) {
    if (e?.code === 'rate_limited') throw e;
    // network/db hiccup — don't block the scan
  }
};

// ---------------------------------------------------------------------------
// Curated registry lookup. If a URL was already verified as high-risk by an
// admin, short-circuit straight to a High verdict before doing anything else.
// ---------------------------------------------------------------------------

const tryRegistryLookup = async (canonicalUrl) => {
  try {
    const { data, error } = await supabase
      .from('high_risk_listings')
      .select('id, platform, risk_score, risk_level, flags, verified')
      .eq('url', canonicalUrl)
      .eq('verified', true)
      .maybeSingle();

    if (error || !data) return null;

    const flags = Array.isArray(data.flags) ? data.flags : [];
    return {
      risk_score: typeof data.risk_score === 'number' ? data.risk_score : 100,
      risk_level: data.risk_level || 'High',
      flags: ['registry_match', ...flags],
      notes: 'This URL is in SureShopPH\u2019s verified high-risk registry.',
      platform: data.platform,
      source: 'registry',
      confidence_pct: 100,
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

  // Rate limit: at most SCAN_LIMIT_PER_HOUR scans per user per rolling hour.
  // Counted before parsing so a flood of bad URLs still hits the cap.
  await enforceRateLimit(userId);

  const parsed = normalizeAndParseUrl(url);
  const canonicalUrl = canonicalizeUrl(parsed);
  const platform = detectPlatform(parsed.hostname);

  // 1. If the URL is already in the verified registry, skip analysis.
  const registry = await tryRegistryLookup(canonicalUrl);

  // 2. Otherwise try the optional Edge Function.
  const edge = !registry
    ? await tryEdgeAnalyze({ url: canonicalUrl, scanType, userId })
    : null;

  // 3. Always have the local heuristic as a safety net.
  const local = analyzeHeuristically(parsed);
  const analysis = registry || edge || local;

  const productName =
    analysis.product_name ||
    (scanType === 'product'
      ? `${platform === 'web' ? parsed.hostname : platform} listing`
      : parsed.hostname);

  // Confidence = how sure we are about the verdict.
  // Edge results are taken at face value; the heuristic gets a confidence
  // proportional to how many distinct signals fired (or how clean it was).
  let confidencePct;
  if (typeof analysis.confidence_pct === 'number') {
    confidencePct = Math.max(0, Math.min(100, Math.round(analysis.confidence_pct)));
  } else if (analysis.source === 'edge') {
    confidencePct = 90;
  } else {
    const flagsCount = Array.isArray(analysis.flags) ? analysis.flags.length : 0;
    confidencePct = Math.max(40, Math.min(95, 50 + flagsCount * 10));
  }
  const confidenceLevel =
    confidencePct >= 80 ? 'High' : confidencePct >= 55 ? 'Medium' : 'Low';

  // Row written to DB — must match `public.scan_history` columns exactly.
  const row = {
    user_id: userId,
    platform: analysis.platform || platform,
    url: canonicalUrl,
    risk_score: analysis.risk_score,
    risk_level: analysis.risk_level,
    flags: analysis.flags,
    confidence_level: confidenceLevel,
    confidence_pct: confidencePct,
    scan_mode: scanType,
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

  // The returned object also carries UI-only fields that aren't in the DB
  // (product_name, notes, source) so the scan page can render rich detail.
  return {
    ...row,
    id: insertedId,
    product_name: productName,
    notes: analysis.notes,
    source: analysis.source,
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
    url: canonicalizeUrl(parsed),
    platform,
    ...local,
  };
};
