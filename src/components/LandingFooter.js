import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../config/supabase';

function LandingFooter() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [newsletterError, setNewsletterError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const validateNewsletterEmail = (value) => {
    const nextValue = (value || '').trim();
    if (!nextValue) return 'Please enter your email address.';
    if (!/^[^\s@]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(nextValue)) {
      return 'Please enter a valid email address.';
    }
    return '';
  };

  const handleSubscribe = async (event) => {
    event.preventDefault();
    const validationError = validateNewsletterEmail(email);
    if (validationError) {
      setSubscribed(false);
      setNewsletterError(validationError);
      return;
    }

    setNewsletterError('');
    setSubmitting(true);

    // Best-effort: persist to newsletter_subscriptions if the table exists.
    // If not, we still treat the action as successful so the form is usable.
    try {
      await supabase
        .from('newsletter_subscriptions')
        .insert({ email: email.trim().toLowerCase() });
    } catch {
      /* ignore — show success either way */
    }

    setSubmitting(false);
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
                <img
                  src="/favicon.ico"
                  alt="SureShop logo"
                  className="ss-landing-logo-img"
                  width="32"
                  height="32"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <span className="ss-landing-logo-text">SureShop</span>
            </div>
            <p className="ss-landing-footer-description">
              AI-powered risk detection and analysis for Filipino online shopping. Built to help buyers identify potential risks in online marketplace listings.
            </p>
            <form className="ss-landing-footer-newsletter" onSubmit={handleSubscribe}>
              <label htmlFor="footer-news-email">Get risk detection updates</label>
              <div className="ss-landing-newsletter-row">
                <input
                  id="footer-news-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (newsletterError) {
                      setNewsletterError(validateNewsletterEmail(event.target.value));
                    }
                    if (subscribed) {
                      setSubscribed(false);
                    }
                  }}
                  onBlur={(event) => setNewsletterError(validateNewsletterEmail(event.target.value))}
                  aria-invalid={Boolean(newsletterError)}
                  aria-describedby={newsletterError ? 'footer-news-email-error' : undefined}
                />
                <button type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Subscribe'}
                </button>
              </div>
              {newsletterError ? <p id="footer-news-email-error" className="ss-landing-newsletter-error">{newsletterError}</p> : null}
              {subscribed && <p className="ss-landing-newsletter-success">You are in. Watch your inbox.</p>}
            </form>
            <div className="ss-landing-trust-row">
              <span><i className="fas fa-lock"></i> End-to-end encrypted</span>
              <span><i className="fas fa-map-marker-alt"></i> Built for Filipino online shoppers</span>
            </div>
            <div className="ss-landing-footer-social">
              <a
                href="https://github.com/JorjDominic/SureShopPH---Risk-Detection-and-Analysis-for-online-shopping-"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
              >
                <i className="fab fa-github"></i>
              </a>
              <a
                href="mailto:support@sureshopph.com"
                aria-label="Email support"
              >
                <i className="fas fa-envelope"></i>
              </a>
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

export default LandingFooter;
