import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import { logoutUser } from '../../services/authService';
import DashboardHeader from '../../components/DashboardHeader';
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
    <div className="udb-page">
      <DashboardHeader user={user} onLogout={handleLogout} logoutBusy={logoutBusy} />

      <main className="udb-main">
        <div className="udb-container">
          <div className="udb-page-title">
            <h1><i className="fas fa-search"></i> New Scan</h1>
            <p className="udb-welcome-text">Analyze a product URL, seller profile, or website for risk indicators.</p>
          </div>

          {/* Scan form */}
          <section className="udb-section">
            <h2 className="udb-section-title"><i className="fas fa-link"></i> Scan a URL</h2>

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
                <button type="submit" className="udb-btn udb-btn-primary" disabled={scanning}>
                  {scanning
                    ? <><i className="fas fa-spinner fa-spin"></i> Scanning...</>
                    : <><i className="fas fa-search"></i> Scan Now</>}
                </button>
              </div>
            </form>

            {/* Scan result */}
            {result && !result.fallback && (
              <div className="udb-scan-result">
                <div className="udb-scan-result-header">
                  <h3>{result.product_name || url}</h3>
                  <span className={`udb-risk-badge udb-risk-${(result.risk_level || 'low').toLowerCase()}`}>
                    {result.risk_level || 'Low'}
                  </span>
                </div>
                {result.risk_score != null && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#6b7280', marginBottom: 6 }}>
                      <span>Risk Score</span>
                      <strong style={{ color: '#1f2937' }}>{result.risk_score}%</strong>
                    </div>
                    <div className="udb-risk-meter">
                      <div
                        className={`udb-risk-meter-fill ${(result.risk_level || 'low').toLowerCase()}`}
                        style={{ width: `${result.risk_score}%` }}
                      />
                    </div>
                  </>
                )}
                {result.notes && <p style={{ fontSize: '0.875rem', color: '#4b5563', margin: '0.75rem 0 0' }}>{result.notes}</p>}
                {result.id && (
                  <div style={{ marginTop: '1rem' }}>
                    <Link to={`/scan-details/${result.id}`} className="udb-btn udb-btn-secondary">
                      <i className="fas fa-eye"></i> View Full Report
                    </Link>
                  </div>
                )}
              </div>
            )}

            {result?.fallback && (
              <div className="udb-scan-result">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <i className="fas fa-info-circle" style={{ color: '#2563eb', fontSize: '1.2rem' }}></i>
                  <h3 style={{ margin: 0, fontSize: '0.95rem' }}>Use the Browser Extension for Live Scans</h3>
                </div>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0 0 1rem' }}>
                  Automated URL scanning requires the SureShop browser extension. The extension reads
                  listing data directly from the page and submits it for analysis.
                </p>
                <a
                  href="https://github.com/JorjDominic/Browser-Extension"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="udb-btn udb-btn-primary"
                >
                  <i className="fas fa-puzzle-piece"></i> Download Extension
                </a>
              </div>
            )}
          </section>

          {/* How it works */}
          <section className="udb-section">
            <h2 className="udb-section-title"><i className="fas fa-info-circle"></i> How Scanning Works</h2>
            <div className="udb-scan-info-grid">
              <div className="udb-scan-info-card">
                <i className="fas fa-globe"></i>
                <h4>URL & Domain Analysis</h4>
                <p>Detects typosquatting, spoofed domains, and suspicious redirects.</p>
              </div>
              <div className="udb-scan-info-card">
                <i className="fas fa-user-shield"></i>
                <h4>Seller Assessment</h4>
                <p>Evaluates account age, response rate, and rating patterns for red flags.</p>
              </div>
              <div className="udb-scan-info-card">
                <i className="fas fa-language"></i>
                <h4>Localized NLP</h4>
                <p>Powered by calamanCy to detect deceptive Tagalog and Taglish descriptions.</p>
              </div>
            </div>
          </section>

          {/* Quick nav */}
          <section className="udb-section">
            <h2 className="udb-section-title"><i className="fas fa-arrow-right"></i> Continue</h2>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <Link to="/userdashboard" className="udb-btn udb-btn-secondary">
                <i className="fas fa-tachometer-alt"></i> Back to Dashboard
              </Link>
              <Link to="/scan-history" className="udb-btn udb-btn-secondary">
                <i className="fas fa-history"></i> View Scan History
              </Link>
            </div>
          </section>
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

export default ScanPage;
