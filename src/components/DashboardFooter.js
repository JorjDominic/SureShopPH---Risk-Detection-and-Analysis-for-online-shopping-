import '../styles/dashboard.css';
import '../styles/landing.css';
import { Link } from 'react-router-dom';

function DashboardFooter() {
  return (
    <footer className="ss-landing-footer ss-dashboard-footer">
      <div className="container">
        <div className="ss-landing-footer-content">
          <div className="ss-landing-footer-column">
            <div className="ss-landing-footer-logo">
              <div className="ss-landing-logo-icon">
                <img src="/favicon.ico" alt="SureShop logo" className="ss-landing-logo-img" width="32" height="32" loading="lazy" decoding="async" />
              </div>
              <span className="ss-landing-logo-text">SureShop</span>
            </div>
            <p className="ss-landing-footer-description">
              AI-powered risk detection and analysis for Filipino online shopping. Built to help buyers identify potential risks in online marketplace listings.
            </p>
            <div className="ss-landing-trust-row">
              <span><i className="fas fa-lock"></i> End-to-end encrypted</span>
              <span><i className="fas fa-map-marker-alt"></i> Built for Filipino online shoppers</span>
            </div>
            <div className="ss-landing-footer-social">
              <Link to="/social/twitter" aria-label="Twitter"><i className="fab fa-twitter"></i></Link>
              <Link to="/social/github" aria-label="GitHub"><i className="fab fa-github"></i></Link>
              <Link to="/social/discord" aria-label="Discord"><i className="fab fa-discord"></i></Link>
              <Link to="/social/linkedin" aria-label="LinkedIn"><i className="fab fa-linkedin"></i></Link>
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
              <li><Link to="/documentation">Documentation</Link></li>
              <li><Link to="/api-reference">API Reference</Link></li>
              <li><Link to="/contact-support">Contact Support</Link></li>
              <li><Link to="/status">Status</Link></li>
            </ul>
          </div>
          <div className="ss-landing-footer-column">
            <h3 className="ss-landing-footer-heading">Legal</h3>
            <ul className="ss-landing-footer-links">
              <li><Link to="/privacy-policy">Privacy Policy</Link></li>
              <li><Link to="/terms-of-service">Terms of Service</Link></li>
              <li><Link to="/security">Security</Link></li>
            </ul>
          </div>
        </div>
        <div className="ss-landing-footer-bottom">
          <div className="ss-landing-footer-copyright">
            <p>&copy; 2026 SureShopPH. All rights reserved.</p>
          </div>
          <div className="ss-landing-footer-legal">
            <Link to="/privacy-policy">Privacy</Link>
            <span className="ss-landing-footer-divider">•</span>
            <Link to="/terms-of-service">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default DashboardFooter;
