
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import DashboardIcon from './DashboardIcon';
import SignOutModal from './SignOutModal';
import '../styles/landing.css';
import '../styles/dashboard.css';

const NOTIF_DOT_COLOR = { info: '#2563eb', warning: '#f97316', critical: '#dc2626' };

function DashboardHeader({ user, onLogout, logoutBusy, notification }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const isAdmin =
    user?.app_metadata?.role === 'admin' ||
    user?.user_metadata?.role === 'admin';

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

  // Close the mobile menu on route change.
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const isActive = (path) => location.pathname === path;
  const closeMobile = () => setMobileOpen(false);

  return (
    <>
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
              <Link to="/userdashboard" state={{ adminView: true }} className={isActive('/userdashboard') ? 'active' : ''}>
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
              {isAdmin && (
                <Link
                  to="/admin"
                  className={location.pathname.startsWith('/admin') ? 'active' : ''}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <i className="fas fa-shield-halved" style={{ fontSize: '0.8rem' }}></i>
                  Admin
                </Link>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                aria-label={notification ? 'Active notification' : 'No notifications'}
                title={notification ? notification.message : 'No active notifications'}
                style={{
                  position: 'relative',
                  background: 'none',
                  border: 'none',
                  cursor: 'default',
                  color: notification
                    ? (NOTIF_DOT_COLOR[notification.type] ?? '#2563eb')
                    : 'rgba(148,163,184,0.55)',
                  fontSize: '1.1rem',
                  padding: '0.25rem',
                  lineHeight: 1,
                  transition: 'color 0.2s ease',
                }}
              >
                <i className="fas fa-bell" />
                {notification && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 1,
                      right: 1,
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: NOTIF_DOT_COLOR[notification.type] ?? '#2563eb',
                      border: '1.5px solid var(--ss-dashboard-bg, #fff)',
                    }}
                  />
                )}
              </button>
              <span className="ss-landing-live-pill ss-dashboard-live-pill">
                <span className="ss-landing-live-dot" />
                {displayName}
              </span>
              <button
                type="button"
                className="ss-dashboard-logout ss-dashboard-logout-cta ss-dashboard-logout-desktop"
                onClick={() => setShowSignOutModal(true)}
                disabled={logoutBusy}
              >
                <DashboardIcon type="logout" />
                <span style={{ marginLeft: '0.4rem' }}>
                  {logoutBusy ? 'Signing out…' : 'Logout'}
                </span>
              </button>
              <button
                type="button"
                className="ss-mobile-menu-btn"
                aria-label="Toggle navigation"
                aria-expanded={mobileOpen}
                onClick={() => setMobileOpen((v) => !v)}
              >
                <i className={`fas ${mobileOpen ? 'fa-times' : 'fa-bars'}`}></i>
              </button>
            </div>
          </div>

          {mobileOpen && (
            <div className="ss-mobile-dropdown">
              <Link to="/userdashboard" state={{ adminView: true }} onClick={closeMobile} className={isActive('/userdashboard') ? 'active' : ''}>
                <i className="fas fa-tachometer-alt"></i> Dashboard
              </Link>
              <Link to="/scan" onClick={closeMobile} className={isActive('/scan') ? 'active' : ''}>
                <i className="fas fa-search"></i> New Scan
              </Link>
              <Link to="/scan-history" onClick={closeMobile} className={isActive('/scan-history') ? 'active' : ''}>
                <i className="fas fa-history"></i> Scan History
              </Link>
              <Link to="/settings" onClick={closeMobile} className={isActive('/settings') ? 'active' : ''}>
                <i className="fas fa-cog"></i> Settings
              </Link>
              {isAdmin && (
                <Link to="/admin" onClick={closeMobile} className={location.pathname.startsWith('/admin') ? 'active' : ''}>
                  <i className="fas fa-shield-halved"></i> Admin
                </Link>
              )}
              <button
                type="button"
                onClick={() => { closeMobile(); setShowSignOutModal(true); }}
                disabled={logoutBusy}
                className="ss-mobile-dropdown-logout"
              >
                <i className="fas fa-sign-out-alt"></i> {logoutBusy ? 'Signing out…' : 'Logout'}
              </button>
            </div>
          )}
        </div>
      </nav>
    </header>
    <SignOutModal
      isOpen={showSignOutModal}
      onConfirm={onLogout}
      onCancel={() => setShowSignOutModal(false)}
      busy={logoutBusy}
    />
    </>
  );
}

export default DashboardHeader;
