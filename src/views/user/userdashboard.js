
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import { logoutUser } from '../../services/authService';
import DashboardHeader from '../../components/DashboardHeader';
import '../../styles/dashboard.css';

function UserDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ total: 0, highRisk: 0, protected: 0 });
  const [recentScans, setRecentScans] = useState([]);
  const [extensionActive, setExtensionActive] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const currentUser = authData?.user ?? null;

      if (!active) return;
      if (!currentUser) { setLoading(false); return; }
      setUser(currentUser);

      try {
        const [scansRes, tokenRes] = await Promise.all([
          supabase
            .from('scans')
            .select('risk_level, scan_type, product_name, created_at, id')
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
  }, []);

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

  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-PH', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const riskClass = (level) => {
    if (!level) return 'udb-risk-low';
    const l = level.toLowerCase();
    if (l === 'high') return 'udb-risk-high';
    if (l === 'medium') return 'udb-risk-medium';
    return 'udb-risk-low';
  };

  if (loading) {
    return (
      <div className="udb-page">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: '100vh', color: '#6b7280', flexDirection: 'column', gap: '1rem' }}>
          <i className="fas fa-shield-check" style={{ fontSize: '2.5rem', color: '#22c55e' }}></i>
          <p style={{ margin: 0 }}>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="udb-page">
      <DashboardHeader user={user} onLogout={handleLogout} logoutBusy={logoutBusy} />

      <main className="udb-main">
        <div className="udb-container">

          {/* Page Title */}
          <div className="udb-page-title">
            <h1><i className="fas fa-tachometer-alt"></i> Your Dashboard</h1>
            <p className="udb-welcome-text">Welcome back, {displayName}! Here's your security overview.</p>
          </div>

          {/* Quick Actions */}
          <section className="udb-section">
            <h2 className="udb-section-title"><i className="fas fa-bolt"></i> Quick Actions</h2>
            <div className="udb-actions-grid">
              <Link to="/scan" className="udb-action-card">
                <i className="fas fa-search"></i>
                <h3>New Scan</h3>
                <p>Scan a website, product, or seller</p>
              </Link>
              <Link to="/scan-history" className="udb-action-card">
                <i className="fas fa-history"></i>
                <h3>Scan History</h3>
                <p>View your previous scans</p>
              </Link>
              <Link to="/settings" className="udb-action-card">
                <i className="fas fa-cog"></i>
                <h3>Settings</h3>
                <p>Manage your account</p>
              </Link>
              <a
                href="https://github.com/JorjDominic/Browser-Extension"
                target="_blank"
                rel="noopener noreferrer"
                className="udb-action-card"
              >
                <i className="fas fa-puzzle-piece"></i>
                <h3>Extension</h3>
                <p>Install browser extension</p>
              </a>
            </div>
          </section>

          {/* Browser Extension */}
          <section className="udb-section">
            <h2 className="udb-section-title"><i className="fas fa-puzzle-piece"></i> Browser Extension</h2>

            {extensionActive ? (
              <div className="udb-extension-activated">
                <p><strong>✅ Extension Activated</strong></p>
                <p>Your browser extension is successfully linked to your account.</p>
              </div>
            ) : (
              <div>
                <p style={{ color: '#6b7280', marginBottom: '1rem', fontSize: '0.9rem' }}>
                  Activate your browser extension to scan Shopee products in real time.
                </p>
                <a
                  href="https://github.com/JorjDominic/Browser-Extension"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="udb-btn udb-btn-primary"
                >
                  <i className="fas fa-download"></i> Download Extension
                </a>
              </div>
            )}
          </section>

          {/* Stats */}
          <section className="udb-section">
            <h2 className="udb-section-title"><i className="fas fa-chart-bar"></i> Your Stats</h2>
            <div className="udb-stats-grid">
              <div className="udb-stat-card">
                <div className="udb-stat-card-header">
                  <h3>Total Scans</h3>
                  <span className="udb-stat-icon teal"><i className="fas fa-search"></i></span>
                </div>
                <div className="udb-stat-number">{stats.total}</div>
                <div className="udb-stat-meta">{stats.total} products scanned</div>
              </div>

              <div className={`udb-stat-card${stats.highRisk > 0 ? ' risk-high' : ' risk-low'}`}>
                <div className="udb-stat-card-header">
                  <h3>High Risk</h3>
                  <span className="udb-stat-icon danger"><i className="fas fa-shield-alt"></i></span>
                </div>
                <div className="udb-stat-number">{stats.highRisk}</div>
                <div className="udb-stat-meta">Potential scams detected</div>
              </div>

              <div className="udb-stat-card">
                <div className="udb-stat-card-header">
                  <h3>Protected Items</h3>
                  <span className="udb-stat-icon success"><i className="fas fa-check-circle"></i></span>
                </div>
                <div className="udb-stat-number">{stats.protected}</div>
                <div className="udb-stat-meta">Safe items verified</div>
              </div>
            </div>
          </section>

          {/* Recent Scans */}
          <section className="udb-section">
            <h2 className="udb-section-title"><i className="fas fa-clock"></i> Recent Scans</h2>

            {recentScans.length === 0 ? (
              <div className="udb-empty-state">
                <i className="fas fa-search"></i>
                <h3>No scans yet</h3>
                <p>
                  Activate your browser extension and start scanning products to see your history here.
                </p>
              </div>
            ) : (
              <div className="udb-table-wrap">
                <table className="udb-table">
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
                        <td>{scan.scan_type ? scan.scan_type.charAt(0).toUpperCase() + scan.scan_type.slice(1) : '—'}</td>
                        <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {scan.product_name || '—'}
                        </td>
                        <td>
                          <span className={`udb-risk-badge ${riskClass(scan.risk_level)}`}>
                            {scan.risk_level || 'Unknown'}
                          </span>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>{formatDate(scan.created_at)}</td>
                        <td>
                          <Link to={`/scan-details/${scan.id}`} className="udb-btn udb-btn-secondary" style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
                            <i className="fas fa-eye"></i> View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

        </div>
      </main>

      {/* Footer */}
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

export default UserDashboard;