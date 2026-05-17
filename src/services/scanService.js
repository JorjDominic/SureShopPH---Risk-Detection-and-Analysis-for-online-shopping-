const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function detectPlatform(url) {
  const h = new URL(url).hostname.toLowerCase();
  if (h.includes('shopee')) return 'shopee';
  if (h.includes('lazada')) return 'lazada';
  if (h.includes('facebook') || h.includes('fb.com')) return 'facebook';
  throw new Error('Product Listing mode only supports Shopee, Lazada, or Facebook URLs. Use "Website / URL" mode for other sites.');
}

async function apiPost(path, body, token) {
  const res = await fetch(API_BASE + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token,
      'Idempotency-Key': crypto.randomUUID(),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `Request failed (${res.status})`);
  return data;
}

export async function runScan({ url, scanType, token }) {
  const clean = (url || '').trim();
  if (!clean) throw new Error('Please enter a URL to scan.');
  if (!token) throw new Error('Missing auth token. Please log in again.');

  if (scanType === 'url') {
    const r = await apiPost('/analyze/url', { url: clean }, token);
    return { ...r, notes: r.risk_message || '', source: 'edge' };
  }

  const payload = {
    platform: detectPlatform(clean),
    url: clean,
    data_quality: { missing: [] },
  };
  const r = await apiPost('/analyze/listing', payload, token);
  return { ...r, notes: r.risk_message || '', source: r.risk_message_source || 'edge' };
}
