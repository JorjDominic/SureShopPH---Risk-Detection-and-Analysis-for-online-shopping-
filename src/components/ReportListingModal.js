import { useEffect, useState } from 'react';
import { supabase } from '../config/supabase';

const REPORT_TYPES = [
  { value: 'scam', label: 'Scam / Fraud' },
  { value: 'counterfeit', label: 'Counterfeit / Fake item' },
  { value: 'phishing', label: 'Phishing / Steals account info' },
  { value: 'misleading', label: 'Misleading description' },
  { value: 'other', label: 'Other' },
];

/**
 * Modal that lets a signed-in user submit a report against a listing URL.
 * Inserts into public.user_reports with status='pending'.
 */
function ReportListingModal({ open, onClose, userId, listingUrl, defaultType = 'scam' }) {
  const [reportType, setReportType] = useState(defaultType);
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState(null);

  useEffect(() => {
    if (!open) return;
    setReportType(defaultType);
    setDescription('');
    setError('');
    setDone(false);
    setBusy(false);
    setDuplicateInfo(null);
  }, [open, defaultType]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId) { setError('You must be signed in to report a listing.'); return; }
    if (!listingUrl) { setError('No listing URL was provided.'); return; }

    setBusy(true);
    setError('');

    // 1. Already in the verified registry? → mark this report as duplicate
    //    so the admin queue isn't spammed with the same URL.
    let status = 'pending';
    let listingId = null;
    let duplicateReason = null;
    try {
      const { data: registry } = await supabase
        .from('high_risk_listings')
        .select('id')
        .eq('url', listingUrl)
        .eq('verified', true)
        .maybeSingle();
      if (registry?.id) {
        status = 'duplicate';
        listingId = registry.id;
        duplicateReason = 'registry';
      }
    } catch { /* ignore */ }

    // 2. Same user already reported this URL? → also duplicate.
    if (status === 'pending') {
      try {
        const { data: existing } = await supabase
          .from('user_reports')
          .select('id')
          .eq('user_id', userId)
          .eq('listing_url', listingUrl)
          .limit(1)
          .maybeSingle();
        if (existing?.id) {
          status = 'duplicate';
          duplicateReason = 'self';
        }
      } catch { /* ignore */ }
    }

    const { error: insertErr } = await supabase.from('user_reports').insert({
      user_id: userId,
      listing_url: listingUrl,
      report_type: reportType,
      description: description.trim() || null,
      status,
      listing_id: listingId,
    });

    if (insertErr) {
      setError(insertErr.message || 'Could not submit report.');
      setBusy(false);
      return;
    }

    setBusy(false);
    setDuplicateInfo(duplicateReason);
    setDone(true);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(15,23,42,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: '#fff', borderRadius: 18, width: 'min(520px, 100%)',
          padding: '1.5rem', boxShadow: '0 30px 80px rgba(15,23,42,0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 800, color: '#dc2626', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Report
            </p>
            <h3 id="report-modal-title" style={{ margin: '0.25rem 0 0', fontSize: '1.15rem', color: 'var(--ss-dashboard-text, #0f172a)' }}>
              Report this listing
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'transparent', border: 0, fontSize: '1.25rem', color: '#64748b', cursor: 'pointer' }}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <p style={{ fontSize: '0.82rem', color: '#475569', margin: '0 0 1rem', wordBreak: 'break-all' }}>
          {listingUrl}
        </p>

        {done ? (
          <div className="udb-alert udb-alert-success" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <i className="fas fa-circle-check"></i>
            <div>
              <strong>
                {duplicateInfo === 'registry'
                  ? 'Already flagged.'
                  : duplicateInfo === 'self'
                  ? 'You already reported this.'
                  : 'Report submitted.'}
              </strong>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.83rem' }}>
                {duplicateInfo === 'registry'
                  ? 'This listing is already in our verified high-risk registry. Thanks for double-checking.'
                  : duplicateInfo === 'self'
                  ? 'Your earlier report for this URL is still on file. We\u2019ve logged this one as a duplicate.'
                  : 'Our moderators will review it. Thank you for helping keep the community safe.'}
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.9rem' }}>
            <div className="udb-form-group">
              <label htmlFor="report-type" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.85rem' }}>
                Reason
              </label>
              <select
                id="report-type"
                className="udb-form-input"
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                required
              >
                {REPORT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="udb-form-group">
              <label htmlFor="report-desc" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.85rem' }}>
                Details (optional)
              </label>
              <textarea
                id="report-desc"
                className="udb-form-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                maxLength={500}
                placeholder="What made you suspicious? (max 500 chars)"
                style={{ resize: 'vertical' }}
              />
              <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '0.25rem 0 0', textAlign: 'right' }}>
                {description.length}/500
              </p>
            </div>

            {error && (
              <div className="udb-alert udb-alert-error">
                <i className="fas fa-circle-exclamation" style={{ marginRight: '0.4rem' }}></i>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={onClose}
                className="ss-dashboard-btn ss-dashboard-btn-secondary"
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="ss-dashboard-btn ss-dashboard-btn-primary"
                disabled={busy}
              >
                {busy ? (<><i className="fas fa-spinner fa-spin"></i> Submitting…</>) : (<><i className="fas fa-flag"></i> Submit Report</>)}
              </button>
            </div>
          </form>
        )}

        {done && (
          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              className="ss-dashboard-btn ss-dashboard-btn-primary"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ReportListingModal;
