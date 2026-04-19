import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { logoutUser } from '../services/authService';

function LandingHeader({ session }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const next = window.scrollY > 18;
      setIsScrolled((prev) => (prev === next ? prev : next));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const closeMobileMenu = () => setMobileOpen(false);

  const handleLogout = async () => {
    if (logoutBusy) return;
    setLogoutBusy(true);
    await logoutUser();
    setLogoutBusy(false);
    closeMobileMenu();
  };

  return (
    <header className={`ss-landing-header${isScrolled ? ' is-scrolled' : ''}`}>
      <nav className="ss-landing-navbar">
        <div className="container">
          <div className="ss-landing-navbar-container">
            <div className="ss-landing-nav-logo">
              <Link to="/" className="ss-landing-logo-link">
                <div className="ss-landing-logo-icon">
                  <img src="/favicon.ico" alt="SureShop logo" className="ss-landing-logo-img" width="32" height="32" decoding="async" />
                </div>
                <span className="ss-landing-logo-text">SureShopPH</span>
              </Link>
            </div>

            <div className="ss-landing-nav-center">
              <ul className="ss-landing-nav-links">
                <li><a href="/#features">Features</a></li>
                <li><a href="/#how">How It Works</a></li>
                <li><a href="/#community">Community</a></li>
                <li><a href="/#demo">Extension Demo</a></li>
              </ul>
            </div>

            <div className="ss-landing-nav-right">
              <div className="ss-landing-auth-links">
                <span className="ss-landing-live-pill" aria-label="Live protection status">
                  <span className="ss-landing-live-dot" />
                  Live Shield Active
                </span>
                {session ? (
                  <>
                    <Link to="/userdashboard" className="ss-landing-nav-link">Dashboard</Link>
                    <button
                      type="button"
                      className="btn btn-primary ss-landing-btn-small"
                      onClick={handleLogout}
                      disabled={logoutBusy}
                    >
                      {logoutBusy ? 'Signing out...' : 'Logout'}
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="ss-landing-nav-link">Sign in</Link>
                    <Link to="/register" className="btn btn-primary ss-landing-btn-small">Get Started</Link>
                  </>
                )}
              </div>
            </div>

            <button
              className="ss-landing-mobile-menu-btn"
              aria-label="Toggle navigation"
              onClick={() => setMobileOpen((prev) => !prev)}
            >
              <i className="fas fa-bars"></i>
            </button>
          </div>

          <div className={`ss-landing-mobile-menu${mobileOpen ? ' active' : ''}`}>
            <ul className="ss-landing-mobile-nav-links">
              <li><a href="/#features" onClick={closeMobileMenu}><i className="fas fa-star"></i> Features</a></li>
              <li><a href="/#how" onClick={closeMobileMenu}><i className="fas fa-play-circle"></i> How It Works</a></li>
              <li><a href="/#community" onClick={closeMobileMenu}><i className="fas fa-users"></i> Community</a></li>
              <li><a href="/#demo" onClick={closeMobileMenu}><i className="fas fa-video"></i> Extension Demo</a></li>
              {session ? (
                <>
                  <li><Link to="/userdashboard" onClick={closeMobileMenu}><i className="fas fa-columns"></i> Dashboard</Link></li>
                  <li>
                    <button type="button" onClick={handleLogout} disabled={logoutBusy}>
                      <i className="fas fa-sign-out-alt"></i> {logoutBusy ? 'Signing out...' : 'Logout'}
                    </button>
                  </li>
                </>
              ) : (
                <>
                  <li><Link to="/login" onClick={closeMobileMenu}><i className="fas fa-sign-in-alt"></i> Sign in</Link></li>
                  <li><Link to="/register" onClick={closeMobileMenu}><i className="fas fa-user-plus"></i> Get Started</Link></li>
                  <li><Link to="/forgot-password" onClick={closeMobileMenu}><i className="fas fa-key"></i> Forgot Password</Link></li>
                </>
              )}
            </ul>
          </div>
        </div>
      </nav>
    </header>
  );
}

export default LandingHeader;
