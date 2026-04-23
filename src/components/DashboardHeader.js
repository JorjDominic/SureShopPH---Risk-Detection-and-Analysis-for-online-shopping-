
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import DashboardIcon from './DashboardIcon';
import '../styles/landing.css';
import '../styles/dashboard.css';

function DashboardHeader({ user, onLogout, logoutBusy }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  const displayName = useMemo(() => {
    if (!user) return 'User';
    const name =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      'User';
    const trimmed = name.charAt(0).toUpperCase() + name.slice(1);
    return trimmed.length > 22 ? trimmed.slice(0, 19) + '…' : trimmed;
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
            </Link>

            <div className="ss-dashboard-nav">
              <Link to="/userdashboard" className={isActive('/userdashboard') ? 'active' : ''}>
                Dashboard
              </Link>
              <Link to="/scan" className={isActive('/scan') ? 'active' : ''}>
                New Scan
              </Link>
              <Link to="/scan-history" className={isActive('/scan-history') ? 'active' : ''}>
                Scan History
              </Link>
              <Link to="/settings" className={isActive('/settings') ? 'active' : ''}>
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
                  {logoutBusy ? 'Signing out…' : 'Logout'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}

export default DashboardHeader;
