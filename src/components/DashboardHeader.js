
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import DashboardIcon from './DashboardIcon';
import SignOutModal from './SignOutModal';
import '../styles/landing.css';
import '../styles/dashboard.css';

const NOTIF_DOT_COLOR = { info: '#2563eb', warning: '#f97316', critical: '#dc2626' };
const NOTIF_ICON    = { info: 'fa-circle-info', warning: 'fa-triangle-exclamation', critical: 'fa-circle-exclamation' };

function DashboardHeader({ user, onLogout, logoutBusy, notification, notifUnread, onNotifRead }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef(null);
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

  // Close bell dropdown when clicking outside.
  useEffect(() => {
    if (!bellOpen) return;
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [bellOpen]);

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
              <div ref={bellRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  aria-label={notification ? 'View notification' : 'No notifications'}
                  onClick={() => {
                    if (!notification) return;
                    setBellOpen((v) => !v);
                    if (notifUnread && onNotifRead) onNotifRead();
                  }}
                  style={{
                    position: 'relative',
                    background: 'none',
                    border: 'none',
                    cursor: notification ? 'pointer' : 'default',
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
                  {notifUnread && (
                    <span style={{
                      position: 'absolute', top: 0, right: 0,
                      minWidth: 16, height: 16, borderRadius: 8,
                      background: '#dc2626',
                      border: '1.5px solid var(--ss-dashboard-bg, #fff)',
                      fontSize: '0.6rem', fontWeight: 800, color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                    }}>1</span>
                  )}
                </button>
                {bellOpen && notification && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                    width: 280, borderRadius: 14,
                    background: 'var(--ss-dashboard-card, #0f172a)',
                    border: `1px solid ${NOTIF_DOT_COLOR[notification.type] ?? '#2563eb'}44`,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    padding: '0.9rem 1rem', zIndex: 9000,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <i className={`fas ${NOTIF_ICON[notification.type] ?? 'fa-circle-info'}`}
                        style={{ color: NOTIF_DOT_COLOR[notification.type] ?? '#2563eb', fontSize: '0.9rem' }} />
                      <span style={{ fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: NOTIF_DOT_COLOR[notification.type] ?? '#2563eb' }}>
                        {notification.type}
                      </span>
                      <button type="button" onClick={() => setBellOpen(false)}
                        style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(148,163,184,0.6)', fontSize: '0.85rem', padding: 0 }}>
                        <i className="fas fa-xmark" />
                      </button>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--ss-dashboard-text, #e2e8f0)', lineHeight: 1.5 }}>
                      {notification.message}
                    </p>
                  </div>
                )}
              </div>
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
