
import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../context/AuthContext';
import { logAdminAction } from '../../services/adminLogService';

import AdminSubNav, { MODERATION_TABS } from '../../components/AdminSubNav';
import '../../styles/dashboard.css';

function AdminFlaggedUrls() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);

  const [highRiskScans, setHighRiskScans] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [flagUrl, setFlagUrl] = useState('');
  const [flagReason, setFlagReason] = useState('');
  const [flagBusy, setFlagBusy] = useState(false);
  const [flagAlert, setFlagAlert] = useState(null);

  const alertRef = useRef(null);

  useEffect(() => {
    if (authLoading) return;
    let active = true;

    const load = async () => {
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from('scan_history')
        .select('id, user_id, url, platform, scan_mode, risk_score, risk_level, created_at')
        .gte('risk_score', 80)
        .order('risk_score', { ascending: false })
        .order('created_at', { ascending: false });

      if (active) {
        setHighRiskScans(data ?? []);
        setLoading(false);
      }
    };

    load();
    return () => { active = false; };
  }, [authLoading, user]);

  const filtered = highRiskScans.filter((s) => {
    const term = searchTerm.toLowerCase();
    return (
      (s.url ?? '').toLowerCase().includes(term) ||
      (s.platform ?? '').toLowerCase().includes(term) ||
      (s.scan_mode ?? '').toLowerCase().includes(term)
    );
  });

  const handleHardFlag = async (e) => {
    e.preventDefault();
    const url = flagUrl.trim();
    if (!url) return;

    setFlagBusy(true);
    setFlagAlert(null);

    const { error } = await supabase.from('high_risk_listings').upsert(
      {
        url,
        platform: 'web',
        risk_score: 100,
        risk_level: 'High',
        flags: [flagReason.trim() || 'Manual admin flag'],
        verified: true,
        verified_by: user.id,
      },
      { onConflict: 'url' }
    );

    if (error) {
      setFlagAlert({ type: 'error', message: error.message || 'Could not save flag. Ensure the high_risk_listings table exists.' });
    } else {
      await logAdminAction({
        userId: user.id,
        action: 'blacklist.added',
        details: { url, reason: flagReason.trim() || null },
      });
      setFlagAlert({ type: 'success', message: `“${url}” has been flagged as high risk.` });
      setFlagUrl('');
      setFlagReason('');
    }

    setFlagBusy(false);
    alertRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const formatDate = (iso) =>
    iso
      ? new Date(iso).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
      : '\u2014';

  if (loading) return <div className="ss-dashboard-page" aria-busy="true" />;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="ss-dashboard-page">
      <main className="ss-dashboard-main">

        <AdminSubNav eyebrow="Admin › Moderation" tabs={MODERATION_TABS} />

        {/* Header */}
        <div className="ss-dashboard-section">
          <div className="container">
            <div className="ss-dashboard-section-heading">
              <div>
                <h2>High-Risk URL Registry</h2>
              </div>
              <p style={{ alignSelf: 'center', color: 'var(--ss-dashboard-muted)', fontSize: '0.9rem' }}>
                {highRiskScans.length} high-risk record{highRiskScans.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Hard-Flag Form */}
        <div className="ss-dashboard-section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="ss-dashboard-panel">
              <p className="ss-dashboard-eyebrow" style={{ marginBottom: '0.6rem' }}>Manual Flag</p>
              <h3 style={{ color: 'var(--ss-dashboard-text)', marginBottom: '1rem', fontFamily: 'var(--font-display)' }}>
                Flag a URL as High Risk
              </h3>

              <div ref={alertRef}>
                {flagAlert && (
                  <div
                    className={`udb-alert ${flagAlert.type === 'error' ? 'udb-alert-error' : 'udb-alert-success'}`}
                    style={{ marginBottom: '1rem' }}
                  >
                    <i className={`fas ${flagAlert.type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'}`} style={{ marginRight: '0.5rem' }}></i>
                    {flagAlert.message}
                  </div>
                )}
              </div>

              <form onSubmit={handleHardFlag} style={{ display: 'grid', gap: '1rem', maxWidth: 560 }}>
                <div className="udb-form-group">
                  <label htmlFor="flag-url" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                    URL *
                  </label>
                  <input
                    id="flag-url"
                    type="text"
                    className="udb-form-input"
                    placeholder="https://shopee.ph/product/..."
                    value={flagUrl}
                    onChange={(e) => setFlagUrl(e.target.value)}
                    required
                  />
                </div>
                <div className="udb-form-group">
                  <label htmlFor="flag-reason" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                    Reason (optional)
                  </label>
                  <input
                    id="flag-reason"
                    type="text"
                    className="udb-form-input"
                    placeholder="e.g. Confirmed scam pattern, elevated risk signals&hellip;"
                    value={flagReason}
                    onChange={(e) => setFlagReason(e.target.value)}
                  />
                </div>
                <div>
                  <button
                    type="submit"
                    disabled={flagBusy || !flagUrl.trim()}
                    className="ss-dashboard-btn ss-dashboard-btn-primary"
                    style={{ minHeight: 42 }}
                  >
                    <i className="fas fa-flag" style={{ marginRight: '0.45rem' }}></i>
                    {flagBusy ? 'Adding\u2026' : 'Hard-Flag This URL'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* High-risk scan table */}
        <div className="ss-dashboard-section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="ss-dashboard-section-heading">
              <div>
                <h3 style={{ color: 'var(--ss-dashboard-text)', fontFamily: 'var(--font-display)' }}>High-Risk Scans (Score &ge; 80)</h3>
              </div>
              <div className="ss-admin-search">
                <i className="fas fa-search" style={{ color: '#94a3b8', fontSize: '0.9rem' }}></i>
                <input
                  type="text"
                  placeholder="Search product, type&hellip;"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="ss-dashboard-panel">
              {filtered.length === 0 ? (
                <div className="udb-empty-state">
                  <i className="fas fa-shield-halved" style={{ fontSize: '2rem', marginBottom: '0.75rem' }}></i>
                  <h3>{searchTerm ? 'No matches found' : 'No high-risk scans yet'}</h3>
                  <p>
                    {searchTerm
                      ? 'Try a different search term.'
                      : 'Scans with a risk score of 80 or above will appear here.'}
                  </p>
                </div>
              ) : (
                <div className="ss-dashboard-table-wrap">
                  <table className="ss-dashboard-table">
                    <thead>
                      <tr>
                        <th>URL</th>
                        <th>Platform</th>
                        <th>Scan Mode</th>
                        <th>Risk Score</th>
                        <th>Risk Level</th>
                        <th>User ID</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((s) => (
                        <tr key={s.id}>
                          <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {s.url || '\u2014'}
                          </td>
                          <td>{s.platform || '\u2014'}</td>
                          <td>{s.scan_mode ? s.scan_mode.charAt(0).toUpperCase() + s.scan_mode.slice(1) : '\u2014'}</td>
                          <td>
                            <span
                              style={{
                                fontFamily: 'monospace', fontWeight: 800,
                                color: s.risk_score >= 90 ? '#b91c1c' : '#c2410c',
                              }}
                            >
                              {s.risk_score}%
                            </span>
                          </td>
                          <td>
                            <span className="ss-dashboard-risk ss-dashboard-risk-high">
                              {s.risk_level || 'High'}
                            </span>
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.76rem', color: '#94a3b8' }}>
                            {s.user_id?.slice(0, 8)}\u2026
                          </td>
                          <td style={{ whiteSpace: 'nowrap', fontSize: '0.82rem' }}>{formatDate(s.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}

export default AdminFlaggedUrls;
