import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import { logoutUser } from '../../services/authService';
import DashboardHeader from '../../components/DashboardHeader';
import DashboardFooter from '../../components/DashboardFooter';
import '../../styles/dashboard.css';

function ScanPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [url, setUrl] = useState('');
  const [scanType, setScanType] = useState('product');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data?.user ?? null);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const handleLogout = async () => {
    setLogoutBusy(true);
    await logoutUser();
    navigate('/login');
  };

  const handleScan = async (e) => {
    e.preventDefault();
    if (!url.trim()) { setError('Please enter a URL to scan.'); return; }
    setError('');
    setResult(null);
    setScanning(true);

    try {
      // Call Supabase edge function or API if available
      const { data, error: fnError } = await supabase.functions.invoke('scan', {
        body: { url: url.trim(), scan_type: scanType, user_id: user?.id },
      });

      if (fnError) throw fnError;
      setResult(data);
    } catch {
      // Fallback: show extension-required message
      setResult({ fallback: true });
    } finally {
      setScanning(false);
    }
  };

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="ss-dashboard-page">
      <DashboardHeader user={user} onLogout={handleLogout} logoutBusy={logoutBusy} />

      <main className="ss-dashboard-main">

        {/* Page title */}
        <div className="ss-dashboard-section">
          <div className="container">
            <div className="ss-dashboard-section-heading">
              <div>
                <p className="ss-dashboard-eyebrow">Analysis</p>
                <h2>New Scan</h2>
              </div>
            </div>
          </div>
        </div>

        {/* Scan form */}
        <div className="ss-dashboard-section">
          <div className="container">
            <div className="ss-dashboard-section-heading">
              <div>
                <p className="ss-dashboard-eyebrow">Submit</p>
                <h2>Scan a URL</h2>
              </div>
            </div>
            <div className="ss-dashboard-panel">


            {error && <div className="udb-alert udb-alert-error">{error}</div>}

            <form onSubmit={handleScan} className="udb-scan-form">
              <div className="udb-form-group" style={{ maxWidth: 580 }}>
                <label htmlFor="scan-type">Scan Type</label>
                <select
                  id="scan-type"
                  className="udb-form-input"
                  value={scanType}
                  onChange={(e) => setScanType(e.target.value)}
                >
                  <option value="product">Product Listing</option>
                  <option value="seller">Seller Profile</option>
                  <option value="url">Website / URL</option>
                </select>
              </div>

              <div className="udb-form-group" style={{ maxWidth: 580 }}>
                <label htmlFor="scan-url">URL to Scan</label>
                <input
                  id="scan-url"
                  type="url"
                  className="udb-form-input"
                  placeholder="https://shopee.ph/product/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                />
              </div>

              <div>
                <button type="submit" className="ss-dashboard-btn ss-dashboard-btn-primary" disabled={scanning}>
                  {scanning
                    ? <><i className="fas fa-spinner fa-spin"></i> Scanning...</>
                    : <><i className="fas fa-search"></i> Scan Now</>}
                </button>
              </div>
            </form>

            {/* Scan result */}
            {result && !result.fallback && (
              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--ss-dashboard-border)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, color: 'var(--ss-dashboard-text)' }}>{result.product_name || url}</h3>
                  <span className={`ss-dashboard-risk ss-dashboard-risk-${(result.risk_level || 'low').toLowerCase()}`}>
                    {result.risk_level || 'Low'} Risk
                  </span>
                </div>
                {result.risk_score != null && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#6b7280', marginBottom: 6 }}>
                      <span>Risk Score</span>
                      <strong style={{ color: 'var(--ss-dashboard-text)' }}>{result.risk_score}%</strong>
                    </div>
                    <div className="ss-dashboard-meter">
                      <span style={{ width: `${result.risk_score}%` }} />
                    </div>
                  </>
                )}
                {result.notes && <p style={{ fontSize: '0.875rem', margin: '0.75rem 0 0' }}>{result.notes}</p>}
                {result.id && (
                  <div style={{ marginTop: '1rem' }}>
                    <Link to={`/scan-details/${result.id}`} className="ss-dashboard-btn ss-dashboard-btn-secondary">
                      <i className="fas fa-eye"></i> View Full Report
                    </Link>
                  </div>
                )}
              </div>
            )}

            {result?.fallback && (
              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--ss-dashboard-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <i className="fas fa-info-circle" style={{ color: 'var(--ss-dashboard-blue)', fontSize: '1.2rem' }}></i>
                  <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--ss-dashboard-text)' }}>Use the Browser Extension for Live Scans</h3>
                </div>
                <p style={{ fontSize: '0.875rem', margin: '0 0 1rem' }}>
                  Automated URL scanning requires the SureShop browser extension. The extension reads
                  listing data directly from the page and submits it for analysis.
                </p>
                <a
                  href="https://github.com/JorjDominic/Browser-Extension"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ss-dashboard-btn ss-dashboard-btn-primary"
                >
                  <i className="fas fa-puzzle-piece"></i> Download Extension
                </a>
              </div>
            )}
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="ss-dashboard-section">
          <div className="container">
            <div className="ss-dashboard-section-heading">
              <div>
                <p className="ss-dashboard-eyebrow">About</p>
                <h2>How Scanning Works</h2>
              </div>
            </div>
            <div className="ss-dashboard-tip-list" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
              <article>
                <span><i className="fas fa-globe"></i></span>
                <div>
                  <h3>URL &amp; Domain Analysis</h3>
                  <p>Detects typosquatting, spoofed domains, and suspicious redirects.</p>
                </div>
              </article>
              <article>
                <span><i className="fas fa-user-shield"></i></span>
                <div>
                  <h3>Seller Assessment</h3>
                  <p>Evaluates account age, response rate, and rating patterns for red flags.</p>
                </div>
              </article>
              <article>
                <span><i className="fas fa-language"></i></span>
                <div>
                  <h3>Localized NLP</h3>
                  <p>Powered by calamanCy to detect deceptive Tagalog and Taglish descriptions.</p>
                </div>
              </article>
            </div>
          </div>
        </div>

        {/* Nav */}
        <div className="ss-dashboard-section">
          <div className="container">
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <Link to="/userdashboard" className="ss-dashboard-btn ss-dashboard-btn-secondary">
                <i className="fas fa-tachometer-alt"></i> Back to Dashboard
              </Link>
              <Link to="/scan-history" className="ss-dashboard-btn ss-dashboard-btn-secondary">
                <i className="fas fa-history"></i> View Scan History
              </Link>
            </div>
          </div>
        </div>

      </main>

      <DashboardFooter />
    </div>
  );
}

export default ScanPage;
