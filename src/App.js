import { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import './styles/styles.css';
import './styles/landing.css';
import LandingHeader from './components/LandingHeader';
import LandingFooter from './components/LandingFooter';
import Login from './views/login';
import Register from './views/register';
import UserDashboard from './views/user/userdashboard';
import ForgotPassword from './views/forgotPassword';
import ResetPassword from './views/resetPassword';
import { getCurrentSession, onAuthStateChange } from './services/authService';

function DeferredSectionContent({ children, minHeight = 420 }) {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return undefined;

    if (!('IntersectionObserver' in window)) {
      setIsVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '320px 0px', threshold: 0.01 }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} style={isVisible ? undefined : { minHeight }}>
      {isVisible ? children : null}
    </div>
  );
}

function ProtectedRoute({ session, children }) {
  const location = useLocation();

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search + location.hash }} />;
  }

  return children;
}

function PublicOnlyRoute({ session, children }) {
  if (session) {
    return <Navigate to="/userdashboard" replace />;
  }

  return children;
}

function LandingPage({ session }) {
  return (
    <div className="App">
      <LandingHeader session={session} />

      <main className="ss-landing-main">
        <section className="ss-landing-hero" id="home">
          {/* Background and circles handled by CSS pseudo-elements */}
          <div className="container">
            <div className="ss-landing-hero-content">
              <div className="ss-landing-hero-text">
                  <div className="ss-landing-kicker">AI-Powered Risk Detection for Filipino Shoppers</div>
                  <h1 className="ss-landing-hero-title">Shop Smarter. Stay Protected.</h1>
                  <p className="ss-landing-hero-subtitle">
                    SureshopPH analyzes listings, sellers, and URLs in real-time to help you identify
                    fraudulent activity before you buy — powered by localized AI built for the Philippine
                    e-commerce environment.
                  </p>
                  <div className="ss-landing-hero-stats">
                    <div className="ss-landing-stat-item">
                      <i className="fas fa-shield-check"></i>
                      <span>Localized Taglish NLP analysis</span>
                    </div>
                    <div className="ss-landing-stat-item">
                      <i className="fas fa-bolt"></i>
                      <span>Real-time risk scoring</span>
                    </div>
                  </div>
                  <div className="ss-landing-hero-buttons">
                    <a
                      href="https://chromewebstore.google.com/category/extensions"
                      className="btn btn-primary ss-landing-btn-primary"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <i className="fas fa-download"></i> Install Browser Extension
                    </a>
                    <a href="#demo" className="btn btn-secondary ss-landing-btn-secondary">
                      <i className="fas fa-play-circle"></i> Watch Demo
                    </a>
                    <a href="#features" className="ss-landing-btn-tertiary">
                      <i className="fas fa-chart-line"></i> Explore All Features
                    </a>
                  </div>
                </div>
                <div className="ss-landing-hero-visual" aria-hidden="true">
                  <div className="ss-landing-glass-card ss-landing-glass-main">
                    <h3>Risk Scan</h3>
                    <p>amazon-super-discount.example</p>
                    <div className="ss-landing-risk-meter">
                      <span>Risk Score</span>
                      <strong>87%</strong>
                    </div>
                    <div className="ss-landing-meter-bar">
                      <div className="ss-landing-meter-fill"></div>
                    </div>
                  </div>
                  <div className="ss-landing-glass-card ss-landing-glass-alert">
                    <i className="fas fa-triangle-exclamation"></i>
                    Suspicious seller account detected — registered 3 days ago
                  </div>
                  <div className="ss-landing-glass-card ss-landing-glass-safe">
                    <i className="fas fa-circle-check"></i>
                    Seller verified — high ratings and response rate
                  </div>
                </div>
              </div>
            </div>
          </section>


        <section className="ss-landing-trust-strip" aria-label="Trust signals">
          <div className="container">
            <div className="ss-landing-trust-track">
              <span><i className="fas fa-bolt"></i> Real-time risk analysis on every listing</span>
              <span><i className="fas fa-shield-heart"></i> Dual Risk Score and Confidence Rating</span>
              <span><i className="fas fa-users"></i> Built for Filipino online shoppers</span>
              <span><i className="fas fa-bug-slash"></i> Supports Shopee, Lazada & Facebook Marketplace</span>
            </div>
          </div>
        </section>

        <section className="ss-landing-section ss-landing-features ss-landing-section-signature" id="features" data-section="01">
          <DeferredSectionContent minHeight={900}>
            <div className="container">
            <div className="ss-landing-section-header">
              <p className="ss-landing-eyebrow">Multi-Factor Risk Detection</p>
              <h2 className="ss-landing-section-title">Comprehensive Listing Protection</h2>
              <p className="ss-landing-section-subtitle">Analyze every layer of a listing before you commit to a purchase</p>
            </div>
            <div className="ss-landing-features-grid ss-landing-features-grid-mosaic">
              <div className="ss-landing-feature-card" data-chip="Domain Shield">
                <div className="ss-landing-feature-icon">
                  <i className="fas fa-globe"></i>
                </div>
                <h3>URL & Domain Analysis</h3>
                <p>Detect typosquatting and domain spoofing in real-time — catching fake websites designed to look like Shopee, Lazada, or other trusted platforms.</p>
              </div>
              <div className="ss-landing-feature-card" data-chip="Price Anomaly Radar">
                <div className="ss-landing-feature-icon">
                  <i className="fas fa-shopping-bag"></i>
                </div>
                <h3>Listing Metadata Scan</h3>
                <p>Flags suspicious pricing, low ratings, and abnormal sales figures — identifying "too good to be true" offers before they cost you.</p>
              </div>
              <div className="ss-landing-feature-card" data-chip="Seller DNA">
                <div className="ss-landing-feature-icon">
                  <i className="fas fa-user-shield"></i>
                </div>
                <h3>Seller Assessment</h3>
                <p>Evaluates seller account age, response rate, and aggregate ratings to surface fraudulent or newly created seller profiles.</p>
              </div>
              <div className="ss-landing-feature-card" data-chip="Taglish NLP">
                <div className="ss-landing-feature-icon">
                  <i className="fas fa-language"></i>
                </div>
                <h3>Localized NLP Analysis</h3>
                <p>Powered by calamanCy, our engine detects social engineering cues and deceptive phrasing in Tagalog and Taglish product descriptions and reviews.</p>
              </div>
              <div className="ss-landing-feature-card" data-chip="Risk Lens">
                <div className="ss-landing-feature-icon">
                  <i className="fas fa-chart-bar"></i>
                </div>
                <h3>Risk & Confidence Scores</h3>
                <p>Every scan produces a probabilistic Risk Score (0–100%) and a Confidence Rating based on data completeness — never a forced safe or scam label.</p>
              </div>
              <div className="ss-landing-feature-card" data-chip="Community Shield">
                <div className="ss-landing-feature-icon">
                  <i className="fas fa-flag"></i>
                </div>
                <h3>Community Reporting</h3>
                <p>Report suspicious listings and false positives directly through the extension, contributing to a growing database of verified high-risk scans for all Filipino shoppers.</p>
              </div>
            </div>
            </div>
          </DeferredSectionContent>
        </section>

        <section className="ss-landing-section ss-landing-how ss-landing-section-signature" id="how" data-section="02">
          <DeferredSectionContent minHeight={700}>
            <div className="container">
            <div className="ss-landing-section-header">
              <p className="ss-landing-eyebrow">Simple by Design</p>
              <h2 className="ss-landing-section-title">How SureshopPH Works</h2>
              <p className="ss-landing-section-subtitle">Three steps to safer online shopping</p>
            </div>
            <div className="ss-landing-steps">
              <div className="ss-landing-step-card">
                <div className="ss-landing-step-number">01</div>
                <div className="ss-landing-step-icon">
                  <i className="fas fa-puzzle-piece"></i>
                </div>
                <h3>Install the Extension</h3>
                <p>Add SureshopPH to any Chromium-based browser — Chrome, Edge, Brave, or Opera — in seconds.</p>
              </div>
              <div className="ss-landing-step-card">
                <div className="ss-landing-step-number">02</div>
                <div className="ss-landing-step-icon">
                  <i className="fas fa-search"></i>
                </div>
                <h3>Browse Normally</h3>
                <p>Shop on Shopee, Lazada, or Facebook Marketplace as you normally would. The extension automatically extracts listing data in the background.</p>
              </div>
              <div className="ss-landing-step-card">
                <div className="ss-landing-step-number">03</div>
                <div className="ss-landing-step-icon">
                  <i className="fas fa-shield-alt"></i>
                </div>
                <h3>Get Your Risk Score</h3>
                <p>Receive a real-time Risk Score and breakdown of detected red flags directly on the listing page — empowering you to decide with confidence.</p>
              </div>
            </div>
            </div>
          </DeferredSectionContent>
        </section>

        <section className="ss-landing-section ss-landing-community ss-landing-section-signature" id="community" data-section="03">
          <DeferredSectionContent minHeight={700}>
            <div className="container">
            <div className="ss-landing-section-header">
              <p className="ss-landing-eyebrow">Community-Driven Protection</p>
              <h2 className="ss-landing-section-title">Join the SureshopPH Community</h2>
              <p className="ss-landing-section-subtitle">Filipino shoppers protecting each other from online fraud</p>
            </div>
            <div className="ss-landing-community-stats">
              <div className="ss-landing-community-stat">
                <div className="ss-landing-community-number">50K+</div>
                <p>Active Users</p>
              </div>
              <div className="ss-landing-community-stat">
                <div className="ss-landing-community-number">1M+</div>
                <p>Listings Scanned</p>
              </div>
              <div className="ss-landing-community-stat">
                <div className="ss-landing-community-number">25K+</div>
                <p>Risks Flagged</p>
              </div>
            </div>
            <div className="ss-landing-community-content">
              <div className="ss-landing-community-text">
                <h3>Collective Protection for Filipino Shoppers</h3>
                <p>Every user report strengthens the system. SureshopPH maintains a public database of high-risk scans and community-verified reports, making the Philippine digital marketplace safer for everyone.</p>
                <ul className="ss-landing-community-list">
                  <li><i className="fas fa-check-circle"></i> Report false positives and suspicious listings</li>
                  <li><i className="fas fa-check-circle"></i> Access the public high-risk scans database</li>
                  <li><i className="fas fa-check-circle"></i> View automated reports on local fraud trends</li>
                </ul>
              </div>
            </div>
            </div>
          </DeferredSectionContent>
        </section>

        <section className="ss-landing-section ss-landing-demo ss-landing-section-signature" id="demo" data-section="04">
          <DeferredSectionContent minHeight={760}>
            <div className="container">
            <div className="ss-landing-demo-content">
              <div className="ss-landing-demo-text">
                <p className="ss-landing-eyebrow">Product Walkthrough</p>
                <h2 className="ss-landing-section-title">See SureshopPH In Action</h2>
                <p className="ss-landing-demo-subtitle">Watch how SureshopPH detects risk indicators in real-time across Shopee, Lazada, and Facebook Marketplace</p>
                <div className="ss-landing-demo-features">
                  <div className="ss-landing-demo-feature">
                    <i className="fas fa-check-circle"></i>
                    <span>Live risk score demonstration</span>
                  </div>
                  <div className="ss-landing-demo-feature">
                    <i className="fas fa-check-circle"></i>
                    <span>Browser extension walkthrough</span>
                  </div>
                  <div className="ss-landing-demo-feature">
                    <i className="fas fa-check-circle"></i>
                    <span>Web dashboard tour</span>
                  </div>
                </div>
                <div className="ss-landing-demo-video">
                  <div className="ss-landing-video-placeholder">
                    <i className="fas fa-play-circle"></i>
                    <p>Demo Video Coming Soon</p>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </DeferredSectionContent>
        </section>

        <section className="ss-landing-section ss-landing-cta ss-landing-section-signature" data-section="05">
          <DeferredSectionContent minHeight={500}>
            <div className="container">
            <div className="ss-landing-cta-content">
              <p className="ss-landing-eyebrow">Your Protection Starts Here</p>
              <h2>Ready to Shop with Confidence?</h2>
              <p>Join Filipino shoppers already using SureshopPH to detect risk before it costs them.</p>
              <div className="ss-landing-cta-buttons">
                <a
                  href="https://chromewebstore.google.com/category/extensions"
                  className="btn btn-primary ss-landing-btn-primary"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <i className="fas fa-download"></i> Install Extension
                </a>
                <Link to="/register" className="btn btn-secondary ss-landing-btn-secondary">
                  <i className="fas fa-user-plus"></i> Create Free Account
                </Link>
              </div>
            </div>
            </div>
          </DeferredSectionContent>
        </section>
      </main>

      <LandingFooter session={session} />

    </div>
  );
}

function InfoPage({ title, subtitle, session }) {
  return (
    <>
      <LandingHeader session={session} />
      <main className="login-page">
        <section className="auth-card">
          <div className="auth-kicker">SureShop Info</div>
          <h1>{title}</h1>
          <p className="login-subtitle">{subtitle}</p>
          <div className="auth-links">
            <p>
              Need account help? <Link to="/forgot-password">Reset your password</Link>
            </p>
            <p>
              <Link to="/">Back to home</Link>
            </p>
          </div>
        </section>
      </main>
      <LandingFooter session={session} />
    </>
  );
}

function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadSession = async () => {
      const { data } = await getCurrentSession();
      if (!active) return;
      setSession(data?.session ?? null);
      setAuthLoading(false);
    };

    loadSession();

    const { data } = onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      setAuthLoading(false);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const isLocalhost = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
    if (!isLocalhost && window.location.protocol !== 'https:') {
      window.location.replace(`https://${window.location.host}${window.location.pathname}${window.location.search}${window.location.hash}`);
    }
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem('ss-theme');
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
      return;
    }

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(prefersDark);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('ss-theme-dark', isDarkMode);
    localStorage.setItem('ss-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const handleThemeToggle = () => {
    setIsDarkMode((prev) => !prev);
  };

  if (authLoading) {
    return null;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage session={session} />} />
        <Route path="/login" element={<PublicOnlyRoute session={session}><Login /></PublicOnlyRoute>} />
        <Route path="/register" element={<PublicOnlyRoute session={session}><Register /></PublicOnlyRoute>} />
        <Route path="/forgot-password" element={<PublicOnlyRoute session={session}><ForgotPassword /></PublicOnlyRoute>} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/help-center" element={<InfoPage title="Help Center" subtitle="Support articles and guidance are coming soon. For now, use account recovery and dashboard support actions." session={session} />} />
        <Route path="/documentation" element={<InfoPage title="Documentation" subtitle="Technical documentation is being prepared. A public knowledge base will be available soon." session={session} />} />
        <Route path="/api-reference" element={<InfoPage title="API Reference" subtitle="API reference content is coming soon. Public endpoints and usage examples will be published here." session={session} />} />
        <Route path="/contact-support" element={<InfoPage title="Contact Support" subtitle="Direct support channels are being finalized. Please use your dashboard and account recovery options for now." session={session} />} />
        <Route path="/status" element={<InfoPage title="System Status" subtitle="All core authentication services are operational." session={session} />} />
        <Route path="/privacy-policy" element={<InfoPage title="Privacy Policy" subtitle="SureShop respects your privacy and secures account and scan data with modern safeguards." session={session} />} />
        <Route path="/terms-of-service" element={<InfoPage title="Terms of Service" subtitle="Use SureShop responsibly and comply with platform and local regulations." session={session} />} />
        <Route path="/cookie-policy" element={<InfoPage title="Cookie Policy" subtitle="Cookie and tracking disclosures will be published here before public release." session={session} />} />
        <Route path="/gdpr-compliance" element={<InfoPage title="GDPR Compliance" subtitle="Compliance details are being reviewed and will be documented in this section." session={session} />} />
        <Route path="/security" element={<InfoPage title="Security" subtitle="Security architecture and disclosure practices will be posted here soon." session={session} />} />
        <Route path="/sitemap" element={<InfoPage title="Sitemap" subtitle="A complete sitemap is coming soon. Use the landing page navigation for now." session={session} />} />
        <Route path="/social/twitter" element={<InfoPage title="Twitter" subtitle="Official social profiles are not yet public. This placeholder prevents dead links during deployment." session={session} />} />
        <Route path="/social/github" element={<InfoPage title="GitHub" subtitle="Official social profiles are not yet public. This placeholder prevents dead links during deployment." session={session} />} />
        <Route path="/social/discord" element={<InfoPage title="Discord" subtitle="Official social profiles are not yet public. This placeholder prevents dead links during deployment." session={session} />} />
        <Route path="/social/linkedin" element={<InfoPage title="LinkedIn" subtitle="Official social profiles are not yet public. This placeholder prevents dead links during deployment." session={session} />} />
        <Route path="/tools/url-scan" element={<InfoPage title="URL Scan" subtitle="The URL scan tool UI is coming soon. This placeholder keeps navigation working in production." session={session} />} />
        <Route path="/tools/seller-check" element={<InfoPage title="Seller Check" subtitle="The seller assessment tool UI is coming soon. This placeholder keeps navigation working in production." session={session} />} />
        <Route path="/tools/saved-warnings" element={<InfoPage title="Saved Warnings" subtitle="Saved warning history is coming soon. This placeholder keeps navigation working in production." session={session} />} />
        <Route path="/tools/account-settings" element={<InfoPage title="Account Settings" subtitle="Account settings management is coming soon. This placeholder keeps navigation working in production." session={session} />} />
        <Route path="/userdashboard" element={<ProtectedRoute session={session}><UserDashboard /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <button
        type="button"
        className={`ss-theme-toggle${isDarkMode ? ' is-dark' : ''}`}
        aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        onClick={handleThemeToggle}
      >
        <span className="ss-theme-toggle-glow" aria-hidden="true"></span>
        <span className="ss-theme-toggle-core" aria-hidden="true">
          <i className={`fas ${isDarkMode ? 'fa-moon' : 'fa-sun'}`}></i>
        </span>
      </button>
    </BrowserRouter>
  );
}

export default App;