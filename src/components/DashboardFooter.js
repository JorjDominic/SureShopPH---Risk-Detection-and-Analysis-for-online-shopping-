import '../styles/dashboard.css';
import '../styles/landing.css';
import LandingFooter from './LandingFooter';

function DashboardFooter() {
  return (
    <footer className="ss-landing-footer ss-dashboard-footer">
      <div className="container">
        <div className="ss-landing-footer-content">
          <div className="ss-landing-footer-column">
            <div className="ss-landing-footer-logo">
              <div className="ss-landing-logo-icon">
                <i className="fas fa-shield-check"></i>
              </div>
              <span className="ss-landing-logo-text">SureShop</span>
            </div>
            <p className="ss-landing-footer-description">
              Advanced scam detection and prevention system for safe online shopping. Protecting users since 2023.
            </p>
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
              <li><a href="#features">Features</a></li>
              <li><a href="#how">How It Works</a></li>
              <li><a href="#demo">Extension Demo</a></li>
              <li><a href="https://github.com/JorjDominic/Browser-Extension" target="_blank" rel="noopener noreferrer">Download Extension</a></li>
              <li><a href="#community">Community</a></li>
            </ul>
          </div>
          <div className="ss-landing-footer-column">
            <h3 className="ss-landing-footer-heading">Support</h3>
            <ul className="ss-landing-footer-links">
              <li><a href="#">Help Center</a></li>
              <li><a href="#">Documentation</a></li>
              <li><a href="#">API Reference</a></li>
              <li><a href="#">Contact Support</a></li>
              <li><a href="#">Status</a></li>
            </ul>
          </div>
          <div className="ss-landing-footer-column">
            <h3 className="ss-landing-footer-heading">Legal</h3>
            <ul className="ss-landing-footer-links">
              <li><a href="privacy-policy.php">Privacy Policy</a></li>
              <li><a href="privacy-policy.php">Terms of Service</a></li>
              <li><a href="#">Cookie Policy</a></li>
              <li><a href="#">GDPR Compliance</a></li>
              <li><a href="#">Security</a></li>
            </ul>
          </div>
        </div>
        <div className="ss-landing-footer-bottom">
          <div className="ss-landing-footer-copyright">
            <p>&copy; 2023-2026 SureShop. All rights reserved.</p>
          </div>
          <div className="ss-landing-footer-legal">
            <a href="privacy-policy.php">Privacy</a>
            <span className="ss-landing-footer-divider">•</span>
            <a href="privacy-policy.php">Terms</a>
            <span className="ss-landing-footer-divider">•</span>
            <a href="#">Cookies</a>
            <span className="ss-landing-footer-divider">•</span>
            <a href="#">Sitemap</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default DashboardFooter;
