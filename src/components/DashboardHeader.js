
import { useEffect, useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import DashboardIcon from './DashboardIcon';
import '../styles/dashboard.css';
import '../styles/landing.css';

function DashboardHeader({ user, onLogout, logoutBusy }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  const displayUser = useMemo(() => {
    if (!user) return 'Live Shield Active';
    const email = user.email || '';
    const name = user.user_metadata?.full_name || email.split('@')[0] || email;
    if (name.length > 20) return name.slice(0, 17) + '...';
    return name;
  }, [user]);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 18);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const closeMobileMenu = () => setMobileOpen(false);

  return (
    <header className={`ss-landing-header ss-dashboard-header${isScrolled ? ' is-scrolled' : ''}`}>
      <nav className="ss-landing-navbar">
        <div className="container">
          <div className="ss-landing-navbar-container" style={{gap: 0, alignItems: 'center', justifyContent: 'space-between'}}>
            {/* Logo and label */}
            <div className="ss-landing-nav-logo" style={{display: 'flex', alignItems: 'center', gap: 8}}>
              <Link to="/" className="ss-landing-logo-link" style={{display: 'flex', alignItems: 'center', gap: 8}}>
                <div className="ss-landing-logo-icon"><DashboardIcon type="shield" /></div>
                <span className="ss-landing-logo-text">SureShop</span>
                <span className="ss-dashboard-header-label" style={{fontWeight: 500, fontSize: 18, marginLeft: 6, color: '#6b7280'}}>User Dashboard</span>
              </Link>
            </div>

            {/* Navigation */}
            <div className="ss-landing-nav-center" style={{flex: 1, display: 'flex', justifyContent: 'center'}}>
              <ul className="ss-landing-nav-links" style={{gap: 24}}>
                <li><a href="#overview" className={location.hash === '#overview' ? 'active' : ''}>Overview</a></li>
                <li><a href="#activity" className={location.hash === '#activity' ? 'active' : ''}>Activity</a></li>
                <li><a href="#tips" className={location.hash === '#tips' ? 'active' : ''}>Protection Tips</a></li>
                <li><Link to="/">Home</Link></li>
              </ul>
            </div>

            {/* User pill and logout */}
            <div className="ss-landing-nav-right" style={{display: 'flex', alignItems: 'center', gap: 12}}>
              <span className="ss-landing-live-pill ss-dashboard-live-pill" aria-label="Live protection status">
                <span className="ss-landing-live-dot" />
                {displayUser}
              </span>
              <button
                type="button"
                className="ss-dashboard-logout ss-dashboard-logout-cta ss-landing-btn-small"
                onClick={onLogout}
                disabled={logoutBusy}
              >
                <DashboardIcon type="logout" />
                <span style={{marginLeft: 6}}>{logoutBusy ? 'Signing out...' : 'Logout'}</span>
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              className="ss-landing-mobile-menu-btn"
              aria-label="Toggle navigation"
              onClick={() => setMobileOpen((prev) => !prev)}
              style={{marginLeft: 16}}
            >
              <i className="fas fa-bars"></i>
            </button>
          </div>

          {/* Mobile menu */}
          <div className={`ss-landing-mobile-menu${mobileOpen ? ' active' : ''}`}>
            <ul className="ss-landing-mobile-nav-links">
              <li><a href="#overview" onClick={closeMobileMenu}><i className="fas fa-home"></i> Overview</a></li>
              <li><a href="#activity" onClick={closeMobileMenu}><i className="fas fa-list"></i> Activity</a></li>
              <li><a href="#tips" onClick={closeMobileMenu}><i className="fas fa-shield-alt"></i> Protection Tips</a></li>
              <li><Link to="/" onClick={closeMobileMenu}><i className="fas fa-arrow-left"></i> Home</Link></li>
              <li>
                <button
                  type="button"
                  className="ss-dashboard-logout"
                  onClick={() => { closeMobileMenu(); onLogout(); }}
                  disabled={logoutBusy}
                  style={{width: '100%', textAlign: 'left', marginTop: 8, background: '#fff1f2', color: '#dc2626', border: 'none', fontWeight: 700, borderRadius: 20, padding: '0.4em 1.2em'}}
                >
                  <DashboardIcon type="logout" />
                  <span style={{marginLeft: 6}}>{logoutBusy ? 'Signing out...' : 'Logout'}</span>
                </button>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    </header>
  );
}



export default DashboardHeader;
