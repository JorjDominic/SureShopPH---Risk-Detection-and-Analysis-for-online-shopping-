
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import DashboardIcon from './DashboardIcon';
import SignOutModal from './SignOutModal';
import '../styles/landing.css';
import '../styles/dashboard.css';

const NOTIF_DOT_COLOR = { info: '#2563eb', warning: '#f97316', critical: '#dc2626' };

function AdminHeader({ user, onLogout, logoutBusy, notification }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
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

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const isActive = (path) => location.pathname === path;
  const inGroup = (paths) => paths.some((p) => location.pathname === p || location.pathname.startsWith(p + '/'));
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
              <span className="ss-admin-badge">Admin</span>
            </Link>

            <div className="ss-dashboard-nav">
              <Link to="/admin" className={isActive('/admin') ? 'active' : ''}>
                Overview
              </Link>
              <Link
                to="/admin/reports"
                className={inGroup(['/admin/reports', '/admin/flagged']) ? 'active' : ''}
              >
                Moderation
              </Link>
              <Link
                to="/admin/training"
                className={inGroup(['/admin/training', '/admin/logs']) ? 'active' : ''}
              >
                Training
              </Link>
              <Link to="/admin/users" className={isActive('/admin/users') ? 'active' : ''}>
                Users
              </Link>
              <Link to="/admin/controls" className={isActive('/admin/controls') ? 'active' : ''}>
                Controls
              </Link>
              <Link to="/admin/settings" className={isActive('/admin/settings') ? 'active' : ''}>
                Settings
              </Link>
              <Link
                to="/userdashboard"
                state={{ adminView: true }}
                className={location.pathname.startsWith('/userdashboard') || location.pathname.startsWith('/scan') || location.pathname.startsWith('/settings') ? 'active' : ''}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', opacity: 0.75 }}
                title="Switch to User View"
              >
                <i className="fas fa-user" style={{ fontSize: '0.78rem' }}></i>
                User View
              </Link>
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
                  {logoutBusy ? 'Signing out\u2026' : 'Logout'}
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
              <Link to="/admin" onClick={closeMobile} className={isActive('/admin') ? 'active' : ''}>
                <i className="fas fa-gauge-high"></i> Overview
              </Link>
              <Link
                to="/admin/reports"
                onClick={closeMobile}
                className={inGroup(['/admin/reports', '/admin/flagged']) ? 'active' : ''}
              >
                <i className="fas fa-flag"></i> Moderation
              </Link>
              <Link
                to="/admin/training"
                onClick={closeMobile}
                className={inGroup(['/admin/training', '/admin/logs']) ? 'active' : ''}
              >
                <i className="fas fa-brain"></i> Training
              </Link>
              <Link to="/admin/settings" onClick={closeMobile} className={isActive('/admin/settings') ? 'active' : ''}>
                <i className="fas fa-cog"></i> Settings
              </Link>
              <Link to="/admin/controls" onClick={closeMobile} className={isActive('/admin/controls') ? 'active' : ''}>
                <i className="fas fa-sliders"></i> Controls
              </Link>
              <Link to="/userdashboard" onClick={closeMobile}>
                <i className="fas fa-user"></i> User View
              </Link>
              <button
                type="button"
                onClick={() => { closeMobile(); setShowSignOutModal(true); }}
                disabled={logoutBusy}
                className="ss-mobile-dropdown-logout"
              >
                <i className="fas fa-sign-out-alt"></i> {logoutBusy ? 'Signing out\u2026' : 'Logout'}
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

export default AdminHeader;
