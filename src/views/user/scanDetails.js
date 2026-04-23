import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import { logoutUser } from '../../services/authService';
import DashboardHeader from '../../components/DashboardHeader';
import DashboardFooter from '../../components/DashboardFooter';
import '../../styles/dashboard.css';

function ScanDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [scan, setScan] = useState(null);
  const [scanLoading, setScanLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data?.user ?? null);
      setAuthLoading(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!user || !id) return;
    let active = true;
    setScanLoading(true);

    supabase
      .from('scans')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        if (!data) { setNotFound(true); }
        else { setScan(data); }
        setScanLoading(false);
      });

    return () => { active = false; };
  }, [user, id]);

  const handleLogout = async () => {
    setLogoutBusy(true);
    await logoutUser();
    navigate('/login');
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-PH', {
      weekday: 'long', month: 'long', day: 'numeric',
      year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const riskClass = (level) => {
    if (!level) return 'ss-dashboard-risk-low';
    const l = level.toLowerCase();
    if (l === 'high') return 'ss-dashboard-risk-high';
    if (l === 'medium') return 'ss-dashboard-risk-medium';
    return 'ss-dashboard-risk-low';
  };

  if (!authLoading && !user) return <Navigate to="/login" replace />;
  if (authLoading) return null;

  return (
    <div className="ss-dashboard-page">
      <DashboardHeader user={user} onLogout={handleLogout} logoutBusy={logoutBusy} />

      <main className="ss-dashboard-main">

        {/* Page title */}
        <div className="ss-dashboard-section">
          <div className="container">
            <div className="ss-dashboard-section-heading">
              <div>
                <p className="ss-dashboard-eyebrow">Report</p>
                <h2>Scan Details</h2>
              </div>
            </div>
          </div>
        </div>

        {scanLoading ? (
          <div className="ss-dashboard-section">
            <div className="container">
              <div className="ss-dashboard-panel">
                <div className="udb-empty-state">
                  <i className="fas fa-spinner fa-spin"></i>
                  <h3>Loading scan report...</h3>
                </div>
              </div>
            </div>
          </div>
        ) : notFound ? (
          <div className="ss-dashboard-section">
            <div className="container">
              <div className="ss-dashboard-panel">
                <div className="udb-empty-state">
                  <i className="fas fa-search"></i>
                  <h3>Scan not found</h3>
                  <p>This scan doesn't exist or you don't have permission to view it.</p>
                  <div style={{ marginTop: '1rem' }}>
                    <Link to="/scan-history" className="ss-dashboard-btn ss-dashboard-btn-secondary">
                      <i className="fas fa-history"></i> Back to History
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Risk summary */}
            <div className="ss-dashboard-section">
              <div className="container">
                <div className="ss-dashboard-section-heading">
                  <div>
                    <p className="ss-dashboard-eyebrow">Risk</p>
                    <h2>Risk Summary</h2>
                  </div>
                  <span className={`ss-dashboard-risk ${riskClass(scan.risk_level)}`} style={{ fontSize: '0.9rem', padding: '6px 18px', alignSelf: 'center' }}>
                    {scan.risk_level || 'Unknown'} Risk
                  </span>
                </div>
                <div className="ss-dashboard-panel">
                  <p style={{ margin: '0 0 1.1rem', fontWeight: 600, color: 'var(--ss-dashboard-text)' }}>
                    {scan.product_name || scan.url || 'Scan #' + id}
                  </p>

                  {scan.risk_score != null && (
                    <div style={{ marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--ss-dashboard-muted)', marginBottom: 6 }}>
                        <span>Risk Score</span>
                        <strong style={{ color: 'var(--ss-dashboard-text)' }}>{scan.risk_score}%</strong>
                      </div>
                      <div className="ss-dashboard-meter">
                        <span style={{ width: `${scan.risk_score}%` }} />
                      </div>
                    </div>
                  )}

                  <div className="udb-detail-grid">
                    <div className="udb-detail-item">
                      <label>Scan Type</label>
                      <span>{scan.scan_type ? scan.scan_type.charAt(0).toUpperCase() + scan.scan_type.slice(1) : '—'}</span>
                    </div>
                    <div className="udb-detail-item">
                      <label>Scanned On</label>
                      <span style={{ fontSize: '0.85rem' }}>{formatDate(scan.created_at)}</span>
                    </div>
                    {scan.url && (
                      <div className="udb-detail-item" style={{ gridColumn: '1 / -1' }}>
                        <label>URL</label>
                        <span style={{ wordBreak: 'break-all', fontSize: '0.85rem' }}>{scan.url}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Analysis details */}
            {(scan.notes || scan.flags || scan.confidence_score != null) && (
              <div className="ss-dashboard-section">
                <div className="container">
                  <div className="ss-dashboard-section-heading">
                    <div>
                      <p className="ss-dashboard-eyebrow">Analysis</p>
                      <h2>Analysis Details</h2>
                    </div>
                  </div>
                  <div className="ss-dashboard-panel">
                    {scan.confidence_score != null && (
                      <div style={{ marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--ss-dashboard-muted)', marginBottom: 6 }}>
                          <span>Confidence</span>
                          <strong style={{ color: 'var(--ss-dashboard-text)' }}>{scan.confidence_score}%</strong>
                        </div>
                        <div className="ss-dashboard-meter">
                          <span style={{ width: `${scan.confidence_score}%`, background: 'var(--ss-dashboard-blue)' }} />
                        </div>
                      </div>
                    )}

                    {scan.notes && (
                      <div style={{ background: 'rgba(14,165,164,0.06)', border: '1px solid rgba(14,165,164,0.18)', borderRadius: 14, padding: '1rem', marginBottom: '1rem' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--ss-dashboard-teal-dark)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' }}>
                          Analysis Notes
                        </label>
                        <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.6 }}>{scan.notes}</p>
                      </div>
                    )}

                    {scan.flags && Array.isArray(scan.flags) && scan.flags.length > 0 && (
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--ss-dashboard-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.75rem' }}>
                          Risk Flags
                        </label>
                        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {scan.flags.map((flag, i) => (
                            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.875rem' }}>
                              <i className="fas fa-exclamation-triangle" style={{ color: 'var(--ss-dashboard-orange)', marginTop: 2, flexShrink: 0 }}></i>
                              {typeof flag === 'string' ? flag : JSON.stringify(flag)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Raw data */}
            {scan.raw_data && (
              <div className="ss-dashboard-section">
                <div className="container">
                  <div className="ss-dashboard-section-heading">
                    <div>
                      <p className="ss-dashboard-eyebrow">Advanced</p>
                      <h2>Raw Scan Data</h2>
                    </div>
                  </div>
                  <div className="ss-dashboard-panel">
                    <pre style={{ background: 'rgba(15,23,42,0.04)', border: '1px solid var(--ss-dashboard-border)', borderRadius: 12, padding: '1rem', fontSize: '0.78rem', color: 'var(--ss-dashboard-text)', overflowX: 'auto', margin: 0, lineHeight: 1.6 }}>
                      {JSON.stringify(scan.raw_data, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Nav */}
        <div className="ss-dashboard-section">
          <div className="container">
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <Link to="/scan-history" className="ss-dashboard-btn ss-dashboard-btn-secondary">
                <i className="fas fa-arrow-left"></i> Back to History
              </Link>
              <Link to="/userdashboard" className="ss-dashboard-btn ss-dashboard-btn-secondary">
                <i className="fas fa-tachometer-alt"></i> Dashboard
              </Link>
              <Link to="/scan" className="ss-dashboard-btn ss-dashboard-btn-primary">
                <i className="fas fa-search"></i> New Scan
              </Link>
            </div>
          </div>
        </div>

      </main>

      <DashboardFooter />
    </div>
  );
}

export default ScanDetailsPage;
