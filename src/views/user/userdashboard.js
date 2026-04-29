
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import { logoutUser } from '../../services/authService';
import {
  generateActivationKey,
  revokeAllActivationKeys,
} from '../../services/accessTokenService';
import DashboardHeader from '../../components/DashboardHeader';
import DashboardFooter from '../../components/DashboardFooter';
import DashboardIcon from '../../components/DashboardIcon';
import '../../styles/dashboard.css';

function UserDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminView = location.state?.adminView ?? false;
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ total: 0, highRisk: 0, protected: 0 });
  const [recentScans, setRecentScans] = useState([]);
  const [extensionActive, setExtensionActive] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [keyBusy, setKeyBusy] = useState(false);
  const [keyError, setKeyError] = useState(null);
  const [generatedKey, setGeneratedKey] = useState(null);
  const [keyCopied, setKeyCopied] = useState(false);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const currentUser = authData?.user ?? null;

      if (!active) return;
      if (!currentUser) { setLoading(false); return; }

      const role = currentUser.app_metadata?.role || currentUser.user_metadata?.role;
      if (role === 'admin' && !isAdminView) {
        navigate('/admin', { replace: true });
        return;
      }

      setUser(currentUser);

      try {
        const [scansRes, tokenRes] = await Promise.all([
          supabase
            .from('scan_history')
            .select('risk_level, scan_mode, url, created_at, id')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(50),
          supabase
            .from('access_tokens')
            .select('id')
            .eq('user_id', currentUser.id)
            .eq('revoked', false)
            .limit(1),
        ]);

        if (!active) return;

        const allScans = scansRes.data ?? [];
        const high = allScans.filter((s) => s.risk_level === 'High').length;
        setStats({
          total: allScans.length,
          highRisk: high,
          protected: allScans.length - high,
        });
        setRecentScans(allScans.slice(0, 10));
        setExtensionActive((tokenRes.data?.length ?? 0) > 0);
      } catch {
        // non-critical: leave defaults
      } finally {
        if (active) setLoading(false);
      }
    };

    loadData();
    return () => { active = false; };
  }, [navigate, isAdminView]);

  const displayName = useMemo(() => {
    if (!user) return 'Shopper';
    const name =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      'Shopper';
    return name.charAt(0).toUpperCase() + name.slice(1);
  }, [user]);

  const handleLogout = async () => {
    setLogoutBusy(true);
    await logoutUser();
    navigate('/login');
  };

  const handleGenerateKey = async () => {
    setKeyError(null);
    setKeyCopied(false);
    setKeyBusy(true);
    try {
      const { plainKey } = await generateActivationKey();
      setGeneratedKey(plainKey);
      setExtensionActive(true);
    } catch (err) {
      setKeyError(err?.message || 'Failed to generate activation key.');
    } finally {
      setKeyBusy(false);
    }
  };

  const handleCopyKey = async () => {
    if (!generatedKey) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(generatedKey);
      } else {
        const ta = document.createElement('textarea');
        ta.value = generatedKey;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setKeyCopied(true);
      setTimeout(() => setKeyCopied(false), 2000);
    } catch {
      setKeyError('Unable to copy to clipboard.');
    }
  };

  const handleRevokeKey = async () => {
    setKeyError(null);
    setKeyBusy(true);
    try {
      await revokeAllActivationKeys();
      setGeneratedKey(null);
      setExtensionActive(false);
    } catch (err) {
      setKeyError(err?.message || 'Failed to revoke activation key.');
    } finally {
      setKeyBusy(false);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-PH', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const riskClass = (level) => {
    if (!level) return 'ss-dashboard-risk-low';
    const l = level.toLowerCase();
    if (l === 'high') return 'ss-dashboard-risk-high';
    if (l === 'medium') return 'ss-dashboard-risk-medium';
    return 'ss-dashboard-risk-low';
  };

  if (loading) {
    return (
      <div className="ss-dashboard-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: '1rem', color: '#475569' }}>
        <i className="fas fa-shield-check" style={{ fontSize: '2.5rem', color: '#0ea5a4' }}></i>
        <p style={{ margin: 0 }}>Loading your dashboard…</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="ss-dashboard-page">
      <DashboardHeader user={user} onLogout={handleLogout} logoutBusy={logoutBusy} />

      <main className="ss-dashboard-main">

        {/* Welcome */}
        <div className="ss-dashboard-section">
          <div className="container">
            <div className="ss-dashboard-section-heading">
              <div>
                <p className="ss-dashboard-eyebrow">Overview</p>
                <h2>Welcome back, {displayName}!</h2>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="ss-dashboard-section">
          <div className="container">
            <div className="ss-dashboard-section-heading">
              <div>
                <p className="ss-dashboard-eyebrow">Tools</p>
                <h2>Quick Actions</h2>
              </div>
            </div>
            <div className="ss-dashboard-actions-grid">
              <Link to="/scan" className="ss-dashboard-action-card">
                <div className="ss-dashboard-action-top">
                  <span className="ss-dashboard-action-icon"><DashboardIcon type="scan" /></span>
                  <span className="ss-dashboard-action-badge">New</span>
                </div>
                <h3>New Scan</h3>
                <p>Scan a website or product listing</p>
              </Link>
              <Link to="/scan-history" className="ss-dashboard-action-card">
                <div className="ss-dashboard-action-top">
                  <span className="ss-dashboard-action-icon"><DashboardIcon type="trend" /></span>
                  <span className="ss-dashboard-action-badge">History</span>
                </div>
                <h3>Scan History</h3>
                <p>Review your previous scans</p>
              </Link>
              <Link to="/settings" className="ss-dashboard-action-card">
                <div className="ss-dashboard-action-top">
                  <span className="ss-dashboard-action-icon"><DashboardIcon type="user" /></span>
                  <span className="ss-dashboard-action-badge">Account</span>
                </div>
                <h3>Settings</h3>
                <p>Manage your profile &amp; security</p>
              </Link>
              <a
                href="https://github.com/JorjDominic/Browser-Extension"
                target="_blank"
                rel="noopener noreferrer"
                className="ss-dashboard-action-card"
              >
                <div className="ss-dashboard-action-top">
                  <span className="ss-dashboard-action-icon"><DashboardIcon type="shield" /></span>
                  <span className="ss-dashboard-action-badge">Install</span>
                </div>
                <h3>Extension</h3>
                <p>Download the browser extension</p>
              </a>
            </div>
          </div>
        </div>

        {/* Browser Extension */}
        <div className="ss-dashboard-section">
          <div className="container">
            <div className="ss-dashboard-section-heading">
              <div>
                <p className="ss-dashboard-eyebrow">Integration</p>
                <h2>Browser Extension</h2>
              </div>
            </div>
            <div className="ss-dashboard-panel">
              {extensionActive ? (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                  <span className="ss-dashboard-action-icon" style={{ flexShrink: 0 }}><DashboardIcon type="shield" /></span>
                  <div style={{ flex: 1, minWidth: 240 }}>
                    <h3 style={{ margin: '0 0 0.4rem', color: 'var(--ss-dashboard-text)', fontSize: '1.05rem' }}>Extension Activated</h3>
                    <p style={{ margin: 0 }}>Your browser extension is successfully linked to your account. You can now scan products in real time.</p>

                    {generatedKey && (
                      <div style={{ marginTop: '1rem', padding: '0.85rem 1rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 8 }}>
                        <p style={{ margin: '0 0 0.4rem', fontSize: '0.78rem', color: '#475569', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                          Your activation key (shown only once)
                        </p>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          <code style={{ fontFamily: 'monospace', fontSize: '0.95rem', fontWeight: 700, letterSpacing: '0.06em', color: '#0f172a' }}>
                            {generatedKey}
                          </code>
                          <button
                            type="button"
                            className="ss-dashboard-btn ss-dashboard-btn-secondary"
                            style={{ minHeight: 34, padding: '0 0.75rem', fontSize: '0.78rem' }}
                            onClick={handleCopyKey}
                          >
                            <i className={`fas ${keyCopied ? 'fa-check' : 'fa-copy'}`}></i>&nbsp;{keyCopied ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                        <p style={{ margin: '0.6rem 0 0', fontSize: '0.75rem', color: '#b91c1c' }}>
                          Save this key now — it will not be shown again. Paste it into the SureShop extension to activate it.
                        </p>
                      </div>
                    )}

                    <div style={{ marginTop: '1rem', display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="ss-dashboard-btn ss-dashboard-btn-secondary"
                        onClick={handleGenerateKey}
                        disabled={keyBusy}
                      >
                        {keyBusy
                          ? <><i className="fas fa-spinner fa-spin"></i> Working…</>
                          : <><i className="fas fa-rotate"></i> Regenerate Key</>}
                      </button>
                      <button
                        type="button"
                        className="ss-dashboard-btn ss-dashboard-btn-secondary"
                        onClick={handleRevokeKey}
                        disabled={keyBusy}
                      >
                        <i className="fas fa-ban"></i>&nbsp;Revoke
                      </button>
                    </div>
                    {keyError && (
                      <p style={{ margin: '0.75rem 0 0', color: '#b91c1c', fontSize: '0.85rem' }}>{keyError}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                  <span className="ss-dashboard-action-icon" style={{ flexShrink: 0 }}><DashboardIcon type="spark" /></span>
                  <div style={{ flex: 1, minWidth: 240 }}>
                    <h3 style={{ margin: '0 0 0.4rem', color: 'var(--ss-dashboard-text)', fontSize: '1.05rem' }}>Activate the Extension</h3>
                    <p style={{ margin: '0 0 1.1rem' }}>Install the SureShop browser extension, then generate an activation key to link it to your account.</p>
                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="ss-dashboard-btn ss-dashboard-btn-primary"
                        style={{ gap: '0.5rem' }}
                        onClick={handleGenerateKey}
                        disabled={keyBusy}
                      >
                        {keyBusy
                          ? <><i className="fas fa-spinner fa-spin"></i> Generating…</>
                          : <><i className="fas fa-key"></i> Generate Activation Key</>}
                      </button>
                      <a
                        href="https://github.com/JorjDominic/Browser-Extension"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ss-dashboard-btn ss-dashboard-btn-secondary"
                        style={{ gap: '0.5rem' }}
                      >
                        <i className="fas fa-download"></i> Download Extension
                      </a>
                    </div>
                    {keyError && (
                      <p style={{ margin: '0.75rem 0 0', color: '#b91c1c', fontSize: '0.85rem' }}>{keyError}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="ss-dashboard-section">
          <div className="container">
            <div className="ss-dashboard-section-heading">
              <div>
                <p className="ss-dashboard-eyebrow">Summary</p>
                <h2>Your Stats</h2>
              </div>
            </div>
            <div className="ss-dashboard-stats-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
              <article className="ss-dashboard-stat-card tone-teal">
                <div className="ss-dashboard-stat-top">
                  <div>
                    <p>Total Scans</p>
                    <h3>{stats.total}</h3>
                  </div>
                  <span className="ss-dashboard-stat-icon"><DashboardIcon type="scan" /></span>
                </div>
                <small>Products analyzed to date</small>
              </article>
              <article className="ss-dashboard-stat-card tone-danger">
                <div className="ss-dashboard-stat-top">
                  <div>
                    <p>High Risk</p>
                    <h3>{stats.highRisk}</h3>
                  </div>
                  <span className="ss-dashboard-stat-icon"><DashboardIcon type="warning" /></span>
                </div>
                <small>Potential scams detected</small>
              </article>
              <article className="ss-dashboard-stat-card tone-success">
                <div className="ss-dashboard-stat-top">
                  <div>
                    <p>Protected</p>
                    <h3>{stats.protected}</h3>
                  </div>
                  <span className="ss-dashboard-stat-icon"><DashboardIcon type="shield" /></span>
                </div>
                <small>Safe items verified</small>
              </article>
            </div>
          </div>
        </div>

        {/* Recent Scans */}
        <div className="ss-dashboard-section">
          <div className="container">
            <div className="ss-dashboard-section-heading">
              <div>
                <p className="ss-dashboard-eyebrow">Activity</p>
                <h2>Recent Scans</h2>
              </div>
              <Link to="/scan-history" className="ss-dashboard-btn ss-dashboard-btn-secondary" style={{ alignSelf: 'center' }}>
                View All
              </Link>
            </div>

            {recentScans.length === 0 ? (
              <div className="ss-dashboard-panel">
                <div className="udb-empty-state">
                  <i className="fas fa-search"></i>
                  <h3>No scans yet</h3>
                  <p>Start scanning products with the browser extension to build your history.</p>
                </div>
              </div>
            ) : (
              <div className="ss-dashboard-panel">
                <div className="ss-dashboard-table-wrap">
                  <table className="ss-dashboard-table">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Product</th>
                        <th>Risk Level</th>
                        <th>Time</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentScans.map((scan) => (
                        <tr key={scan.id}>
                          <td>{scan.scan_mode ? scan.scan_mode.charAt(0).toUpperCase() + scan.scan_mode.slice(1) : '—'}</td>
                          <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {scan.url || '—'}
                          </td>
                          <td>
                            <span className={`ss-dashboard-risk ${riskClass(scan.risk_level)}`}>
                              {scan.risk_level || 'Unknown'}
                            </span>
                          </td>
                          <td style={{ whiteSpace: 'nowrap', fontSize: '0.82rem' }}>{formatDate(scan.created_at)}</td>
                          <td>
                            <Link
                              to={`/scan-details/${scan.id}`}
                              className="ss-dashboard-btn ss-dashboard-btn-secondary"
                              style={{ minHeight: 36, padding: '0 0.85rem', fontSize: '0.8rem' }}
                            >
                              <i className="fas fa-eye"></i>&nbsp;View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

      </main>

      <DashboardFooter />
    </div>
  );
}

export default UserDashboard;