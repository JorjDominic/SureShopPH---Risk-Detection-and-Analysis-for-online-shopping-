import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import { logoutUser } from '../../services/authService';
import DashboardHeader from '../../components/DashboardHeader';
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
    if (!level) return 'udb-risk-low';
    const l = level.toLowerCase();
    if (l === 'high') return 'udb-risk-high';
    if (l === 'medium') return 'udb-risk-medium';
    return 'udb-risk-low';
  };

  if (!authLoading && !user) return <Navigate to="/login" replace />;
  if (authLoading) return null;

  return (
    <div className="udb-page">
      <DashboardHeader user={user} onLogout={handleLogout} logoutBusy={logoutBusy} />

      <main className="udb-main">
        <div className="udb-container">
          <div className="udb-page-title">
            <h1><i className="fas fa-file-alt"></i> Scan Details</h1>
            <p className="udb-welcome-text">Full risk report for this scan.</p>
          </div>

          {scanLoading ? (
            <section className="udb-section">
              <div className="udb-empty-state">
                <i className="fas fa-spinner fa-spin"></i>
                <h3>Loading scan report...</h3>
              </div>
            </section>
          ) : notFound ? (
            <section className="udb-section">
              <div className="udb-empty-state">
                <i className="fas fa-search"></i>
                <h3>Scan not found</h3>
                <p>This scan doesn't exist or you don't have permission to view it.</p>
                <div style={{ marginTop: '1rem' }}>
                  <Link to="/scan-history" className="udb-btn udb-btn-secondary">
                    <i className="fas fa-history"></i> Back to History
                  </Link>
                </div>
              </div>
            </section>
          ) : (
            <>
              {/* Summary */}
              <section className="udb-section">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div>
                    <h2 className="udb-section-title" style={{ marginBottom: '0.25rem' }}>
                      <i className="fas fa-shield-alt"></i> Risk Summary
                    </h2>
                    <p style={{ fontSize: '0.9rem', color: '#6b7280', margin: 0 }}>
                      {scan.product_name || scan.url || 'Scan #' + id}
                    </p>
                  </div>
                  <span className={`udb-risk-badge ${riskClass(scan.risk_level)}`} style={{ fontSize: '0.9rem', padding: '6px 16px' }}>
                    {scan.risk_level || 'Unknown'} Risk
                  </span>
                </div>

                {scan.risk_score != null && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#6b7280', marginBottom: '6px' }}>
                      <span>Risk Score</span>
                      <strong style={{ color: '#1f2937' }}>{scan.risk_score}%</strong>
                    </div>
                    <div className="udb-risk-meter">
                      <div
                        className={`udb-risk-meter-fill ${(scan.risk_level || 'low').toLowerCase()}`}
                        style={{ width: `${scan.risk_score}%` }}
                      />
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
              </section>

              {/* Analysis details */}
              {(scan.notes || scan.flags || scan.confidence_score != null) && (
                <section className="udb-section">
                  <h2 className="udb-section-title"><i className="fas fa-microscope"></i> Analysis Details</h2>

                  {scan.confidence_score != null && (
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#6b7280', marginBottom: '6px' }}>
                        <span>Confidence</span>
                        <strong style={{ color: '#1f2937' }}>{scan.confidence_score}%</strong>
                      </div>
                      <div className="udb-risk-meter">
                        <div
                          className="udb-risk-meter-fill low"
                          style={{ width: `${scan.confidence_score}%`, background: '#2563eb' }}
                        />
                      </div>
                    </div>
                  )}

                  {scan.notes && (
                    <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '1rem', marginBottom: '1rem' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' }}>
                        Analysis Notes
                      </label>
                      <p style={{ margin: 0, fontSize: '0.875rem', color: '#374151', lineHeight: 1.6 }}>{scan.notes}</p>
                    </div>
                  )}

                  {scan.flags && Array.isArray(scan.flags) && scan.flags.length > 0 && (
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.75rem' }}>
                        Risk Flags
                      </label>
                      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {scan.flags.map((flag, i) => (
                          <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.875rem', color: '#374151' }}>
                            <i className="fas fa-exclamation-triangle" style={{ color: '#f97316', marginTop: 2, flexShrink: 0 }}></i>
                            {typeof flag === 'string' ? flag : JSON.stringify(flag)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </section>
              )}

              {/* Raw data for advanced users */}
              {scan.raw_data && (
                <section className="udb-section">
                  <h2 className="udb-section-title"><i className="fas fa-code"></i> Raw Scan Data</h2>
                  <pre style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '1rem', fontSize: '0.78rem', color: '#374151', overflowX: 'auto', margin: 0, lineHeight: 1.6 }}>
                    {JSON.stringify(scan.raw_data, null, 2)}
                  </pre>
                </section>
              )}
            </>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link to="/scan-history" className="udb-btn udb-btn-secondary">
              <i className="fas fa-arrow-left"></i> Back to History
            </Link>
            <Link to="/userdashboard" className="udb-btn udb-btn-secondary">
              <i className="fas fa-tachometer-alt"></i> Dashboard
            </Link>
            <Link to="/scan" className="udb-btn udb-btn-primary">
              <i className="fas fa-search"></i> New Scan
            </Link>
          </div>
        </div>
      </main>

      <footer className="udb-footer">
        <div className="udb-footer-inner">
          <span className="udb-footer-copyright">&copy; 2024 SureShop. Protecting users from online scams.</span>
          <div className="udb-footer-links">
            <Link to="/">Home</Link>
            <Link to="/privacy-policy">Privacy</Link>
            <Link to="/terms-of-service">Terms</Link>
            <Link to="/contact-support">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default ScanDetailsPage;
