import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

function LandingFooter() {
  const logoOptions = useMemo(
    () => [
      '/assets/images/logo.png',
      '/assets/images/logo.svg',
      '/assets/images/logo.jpg'
    ],
    []
  );
  const [logoIndex, setLogoIndex] = useState(0);
  const [showIconFallback, setShowIconFallback] = useState(false);
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleLogoError = () => {
    if (logoIndex < logoOptions.length - 1) {
      setLogoIndex((prev) => prev + 1);
      return;
    }
    setShowIconFallback(true);
  };

  const handleSubscribe = (event) => {
    event.preventDefault();
    if (!email.trim()) {
      return;
    }
    setSubscribed(true);
    setEmail('');
  };

  return (
    <footer className="ss-landing-footer">
      <div className="container">
        <div className="ss-landing-footer-content">
          <div className="ss-landing-footer-column">
            <div className="ss-landing-footer-logo">
              <div className="ss-landing-logo-image">
                {!showIconFallback ? (
                  <img
                    src={logoOptions[logoIndex]}
                    alt="SureShop Logo"
                    className="ss-landing-logo-img"
                    onError={handleLogoError}
                  />
                ) : (
                  <div className="ss-landing-logo-icon">
                    <i className="fas fa-shield-check"></i>
                  </div>
                )}
              </div>
              <span className="ss-landing-logo-text">SureShop</span>
            </div>
            <p className="ss-landing-footer-description">
              Advanced scam detection and prevention system for safe online shopping. Protecting users since 2023.
            </p>
            <form className="ss-landing-footer-newsletter" onSubmit={handleSubscribe}>
              <label htmlFor="footer-news-email">Get weekly scam alerts</label>
              <div className="ss-landing-newsletter-row">
                <input
                  id="footer-news-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
                <button type="submit">Subscribe</button>
              </div>
              {subscribed && <p className="ss-landing-newsletter-success">You are in. Watch your inbox.</p>}
            </form>
            <div className="ss-landing-trust-row">
              <span><i className="fas fa-lock"></i> End-to-end encrypted</span>
              <span><i className="fas fa-globe"></i> 120+ countries protected</span>
            </div>
            <div className="ss-landing-footer-social">
              <a href="#" aria-label="Twitter"><i className="fab fa-twitter"></i></a>
              <a href="#" aria-label="GitHub"><i className="fab fa-github"></i></a>
              <a href="#" aria-label="Discord"><i className="fab fa-discord"></i></a>
              <a href="#" aria-label="LinkedIn"><i className="fab fa-linkedin"></i></a>
            </div>
          </div>

          <div className="ss-landing-footer-column">
            <h3 className="ss-landing-footer-heading">Product</h3>
            <ul className="ss-landing-footer-links">
              <li><a href="/#features">Features</a></li>
              <li><a href="/#how">How It Works</a></li>
              <li><a href="/#demo">Extension Demo</a></li>
              <li><a href="https://github.com/JorjDominic/Browser-Extension" target="_blank" rel="noopener noreferrer">Download Extension</a></li>
              <li><a href="/#community">Community</a></li>
            </ul>
          </div>

          <div className="ss-landing-footer-column">
            <h3 className="ss-landing-footer-heading">Support</h3>
            <ul className="ss-landing-footer-links">
              <li><Link to="/help-center">Help Center</Link></li>
              <li><a href="/#how">Documentation</a></li>
              <li><a href="https://github.com/JorjDominic/Browser-Extension" target="_blank" rel="noopener noreferrer">API Reference</a></li>
              <li><Link to="/forgot-password">Forgot Password</Link></li>
              <li><Link to="/status">Status</Link></li>
            </ul>
          </div>

          <div className="ss-landing-footer-column">
            <h3 className="ss-landing-footer-heading">Legal</h3>
            <ul className="ss-landing-footer-links">
              <li><Link to="/privacy-policy">Privacy Policy</Link></li>
              <li><Link to="/terms-of-service">Terms of Service</Link></li>
              <li><Link to="/privacy-policy">Cookie Policy</Link></li>
              <li><Link to="/privacy-policy">GDPR Compliance</Link></li>
              <li><Link to="/help-center">Security</Link></li>
            </ul>
          </div>
        </div>

        <div className="ss-landing-footer-bottom">
          <div className="ss-landing-footer-copyright">
            <p>&copy; 2023-2026 SureShop. All rights reserved.</p>
          </div>
          <div className="ss-landing-footer-legal">
            <Link to="/privacy-policy">Privacy</Link>
            <span className="ss-landing-footer-divider">•</span>
            <Link to="/terms-of-service">Terms</Link>
            <span className="ss-landing-footer-divider">•</span>
            <Link to="/privacy-policy">Cookies</Link>
            <span className="ss-landing-footer-divider">•</span>
            <a href="/#home">Sitemap</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default LandingFooter;
