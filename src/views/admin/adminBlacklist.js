
import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import { logoutUser } from '../../services/authService';
import AdminHeader from '../../components/AdminHeader';
import DashboardFooter from '../../components/DashboardFooter';
import '../../styles/dashboard.css';

function AdminBlacklist() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logoutBusy, setLogoutBusy] = useState(false);

  const [highRiskScans, setHighRiskScans] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [flagUrl, setFlagUrl] = useState('');
  const [flagReason, setFlagReason] = useState('');
  const [flagBusy, setFlagBusy] = useState(false);
  const [flagAlert, setFlagAlert] = useState(null);

  const alertRef = useRef(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!active) return;
      const u = authData?.user ?? null;
      setUser(u);

      if (!u) { setLoading(false); return; }

      const { data } = await supabase
        .from('scans')
        .select('id, user_id, product_name, scan_type, risk_score, risk_level, created_at')
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
  }, []);

  const filtered = highRiskScans.filter((s) => {
    const term = searchTerm.toLowerCase();
    return (
      (s.product_name ?? '').toLowerCase().includes(term) ||
      (s.scan_type ?? '').toLowerCase().includes(term)
    );
  });

  const handleHardFlag = async (e) => {
    e.preventDefault();
    const url = flagUrl.trim();
    if (!url) return;

    setFlagBusy(true);
    setFlagAlert(null);

    const { error } = await supabase.from('blacklist').upsert(
      { url, reason: flagReason.trim() || 'Manual admin override', flagged_by: user.id },
      { onConflict: 'url' }
    );

    if (error) {
      setFlagAlert({ type: 'error', message: error.message || 'Could not add to blacklist. Ensure the blacklist table exists.' });
    } else {
      setFlagAlert({ type: 'success', message: `\u201c${url}\u201d has been hard-flagged.` });
      setFlagUrl('');
      setFlagReason('');
    }

    setFlagBusy(false);
    alertRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const handleLogout = async () => {
    setLogoutBusy(true);
    await logoutUser();
    navigate('/login');
  };

  const formatDate = (iso) =>
    iso
      ? new Date(iso).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
      : '\u2014';

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="ss-dashboard-page">
      <AdminHeader user={user} onLogout={handleLogout} logoutBusy={logoutBusy} />

      <main className="ss-dashboard-main">

        {/* Header */}
        <div className="ss-dashboard-section">
          <div className="container">
            <div className="ss-dashboard-section-heading">
              <div>
                <p className="ss-dashboard-eyebrow">Admin &rsaquo; Blacklist</p>
                <h2>Blacklist Manager</h2>
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
              <p className="ss-dashboard-eyebrow" style={{ marginBottom: '0.6rem' }}>Manual Override</p>
              <h3 style={{ color: 'var(--ss-dashboard-text)', marginBottom: '1rem', fontFamily: 'var(--font-display)' }}>
                Hard-Flag a URL or Seller
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
                    URL or Seller ID *
                  </label>
                  <input
                    id="flag-url"
                    type="text"
                    className="udb-form-input"
                    placeholder="https://shopee.ph/seller/... or seller ID"
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
                    placeholder="e.g. Confirmed scam, repeat offender&hellip;"
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
                    <i className="fas fa-ban" style={{ marginRight: '0.45rem' }}></i>
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
                        <th>Product Name</th>
                        <th>Scan Type</th>
                        <th>Risk Score</th>
                        <th>Risk Level</th>
                        <th>User ID</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((s) => (
                        <tr key={s.id}>
                          <td style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {s.product_name || '\u2014'}
                          </td>
                          <td>{s.scan_type ? s.scan_type.charAt(0).toUpperCase() + s.scan_type.slice(1) : '\u2014'}</td>
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

      <DashboardFooter />
    </div>
  );
}

export default AdminBlacklist;
