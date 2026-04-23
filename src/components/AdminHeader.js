
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import DashboardIcon from './DashboardIcon';
import '../styles/landing.css';
import '../styles/dashboard.css';

function AdminHeader({ user, onLogout, logoutBusy }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  const displayName = useMemo(() => {
    if (!user) return 'Admin';
    const name =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      'Admin';
    const trimmed = name.charAt(0).toUpperCase() + name.slice(1);
    return trimmed.length > 22 ? trimmed.slice(0, 19) + '\u2026' : trimmed;
  }, [user]);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 18);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isActive = (path) => location.pathname === path;

  return (
    <header className={`ss-landing-header${isScrolled ? ' is-scrolled' : ''}`}>
      <nav className="ss-landing-navbar">
        <div className="container">
          <div className="ss-landing-navbar-container">
            <Link to="/" className="ss-landing-logo-link">
              <div className="ss-landing-logo-icon">
                <img
                  src="/favicon.ico"
                  alt="SureShop logo"
                  className="ss-landing-logo-img"
                  width="32"
                  height="32"
                  decoding="async"
                />
              </div>
              <span className="ss-landing-logo-text">SureShop</span>
              <span className="ss-admin-badge">Admin</span>
            </Link>

            <div className="ss-dashboard-nav">
              <Link to="/admin" className={isActive('/admin') ? 'active' : ''}>
                Overview
              </Link>
              <Link to="/admin/reports" className={isActive('/admin/reports') ? 'active' : ''}>
                Reports
              </Link>
              <Link to="/admin/blacklist" className={isActive('/admin/blacklist') ? 'active' : ''}>
                Blacklist
              </Link>
              <Link to="/admin/logs" className={isActive('/admin/logs') ? 'active' : ''}>
                Logs
              </Link>
              <Link to="/admin/settings" className={isActive('/admin/settings') ? 'active' : ''}>
                Settings
              </Link>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className="ss-landing-live-pill ss-dashboard-live-pill">
                <span className="ss-landing-live-dot" />
                {displayName}
              </span>
              <button
                type="button"
                className="ss-dashboard-logout ss-dashboard-logout-cta"
                onClick={onLogout}
                disabled={logoutBusy}
              >
                <DashboardIcon type="logout" />
                <span style={{ marginLeft: '0.4rem' }}>
                  {logoutBusy ? 'Signing out\u2026' : 'Logout'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}

export default AdminHeader;
