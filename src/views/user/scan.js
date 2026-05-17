import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { runScan } from '../../services/scanService';
import ReportListingModal from '../../components/ReportListingModal';
import '../../styles/dashboard.css';

function ScanPage() {
  const { user, loading, token } = useAuth();
  const [url, setUrl] = useState('');
  const [scanType, setScanType] = useState('product');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [reportOpen, setReportOpen] = useState(false);

  const handleScan = async (e) => {
    e.preventDefault();
    if (!url.trim()) { setError('Please enter a URL to scan.'); return; }
    setError('');
    setResult(null);
    setScanning(true);

    try {
      const scanResult = await runScan({
        url: url.trim(),
        scanType,
        token,
      });
      setResult(scanResult);
      if (!scanResult.persisted && scanResult.persistError) {
        // Non-fatal: analysis ran, but it could not be saved to history.
        setError(`Scan completed, but it could not be saved to your history: ${scanResult.persistError}`);
      }
    } catch (err) {
      setError(err?.message || 'Scan failed. Please try again.');
    } finally {
      setScanning(false);
    }
  };

  if (loading) return <div className="ss-dashboard-page" aria-busy="true" />;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="ss-dashboard-page">
      <main className="ss-dashboard-main">

        {/* Page title */}
        <div className="ss-dashboard-section">
          <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 1.5rem" }}>
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
          <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 1.5rem" }}>
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
            {result && (
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
                {Array.isArray(result.flags) && result.flags.length > 0 && (
                  <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {result.flags.map((f) => (
                      <span
                        key={f}
                        style={{
                          fontSize: '0.72rem',
                          padding: '0.18rem 0.55rem',
                          borderRadius: 999,
                          background: 'rgba(148,163,184,0.18)',
                          color: 'var(--ss-dashboard-muted)',
                          fontFamily: 'monospace',
                        }}
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                )}
                {result.source && (
                  <p style={{ fontSize: '0.72rem', margin: '0.75rem 0 0', color: 'var(--ss-dashboard-muted)' }}>
                    Analysis source: {result.source === 'edge' ? 'server model' : 'local heuristic'}
                  </p>
                )}
                <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setReportOpen(true)}
                      className="ss-dashboard-btn ss-dashboard-btn-secondary"
                      style={{ borderColor: '#fecaca', color: '#dc2626' }}
                    >
                      <i className="fas fa-flag"></i> Report this listing
                    </button>
                  </div>
              </div>
            )}
            </div>
          </div>
        </div>

        <ReportListingModal
          open={reportOpen}
          onClose={() => setReportOpen(false)}
          userId={user?.id}
          listingUrl={result?.url || url}
          defaultType={result?.risk_level === 'High' ? 'scam' : 'misleading'}
        />

        {/* How it works */}
        <div className="ss-dashboard-section">
          <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 1.5rem" }}>
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
                  <h3>Seller Signals</h3>
                  <p>Seller account age, response rate, and rating patterns are analyzed as risk factors within each listing scan.</p>
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
          <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 1.5rem" }}>
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
    </div>
  );
}

export default ScanPage;
