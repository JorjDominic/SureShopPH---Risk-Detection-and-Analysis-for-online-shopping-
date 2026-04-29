import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import LandingHeader from '../components/LandingHeader';
import LandingFooter from '../components/LandingFooter';
import '../styles/privacyPolicy.css';

function PrivacyPolicy({ session }) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.title = 'Privacy Policy – SureShop';
    return () => {
      document.title = 'SureShop';
    };
  }, []);

  return (
    <>
      <LandingHeader session={session} />
      <main className="ss-policy-main">
        <div className="ss-policy-hero">
          <div className="container">
            <div className="ss-policy-hero-inner">
              <div className="ss-policy-kicker">
                <i className="fas fa-shield-alt"></i> Legal &amp; Privacy
              </div>
              <h1 className="ss-policy-title">Privacy Policy</h1>
              <p className="ss-policy-lead">
                SureShop is committed to protecting your personal information and your right to
                privacy. This policy explains what we collect, why we collect it, and how we
                protect it.
              </p>
              <p className="ss-policy-updated">
                <i className="fas fa-calendar-alt"></i> Last updated: <strong>April 27, 2026</strong>
              </p>
            </div>
          </div>
        </div>

        <div className="container">
          <div className="ss-policy-layout">
            {/* Sticky Table of Contents */}
            <aside className="ss-policy-toc" aria-label="Table of Contents">
              <h2 className="ss-policy-toc-heading">Contents</h2>
              <ol className="ss-policy-toc-list">
                <li><a href="#who-we-are">Who We Are</a></li>
                <li><a href="#information-we-collect">Information We Collect</a></li>
                <li><a href="#how-we-use">How We Use Your Information</a></li>
                <li><a href="#data-sharing">Data Sharing &amp; Disclosure</a></li>
                <li><a href="#data-retention">Data Retention</a></li>
                <li><a href="#your-rights">Your Rights</a></li>
                <li><a href="#cookies">Cookies &amp; Tracking</a></li>
                <li><a href="#security">Security</a></li>
                <li><a href="#children">Children's Privacy</a></li>
                <li><a href="#changes">Changes to This Policy</a></li>
                <li><a href="#contact">Contact Us</a></li>
              </ol>
            </aside>

            {/* Policy Body */}
            <article className="ss-policy-body">

              <section id="who-we-are" className="ss-policy-section">
                <h2>
                  <span className="ss-policy-section-num">01</span>
                  Who We Are
                </h2>
                <p>
                  SureShopPH ("<strong>SureShop</strong>", "we", "our", or "us") is an AI-powered
                  risk detection and analysis platform designed to protect Filipino consumers from
                  fraudulent online marketplace listings. We operate the SureShopPH web application
                  and browser extension.
                </p>
                <p>
                  This Privacy Policy applies to all users who access our website, create an
                  account, or use our browser extension ("Services").
                </p>
              </section>

              <section id="information-we-collect" className="ss-policy-section">
                <h2>
                  <span className="ss-policy-section-num">02</span>
                  Information We Collect
                </h2>

                <h3>Information You Provide Directly</h3>
                <ul className="ss-policy-list">
                  <li>
                    <strong>Account Information:</strong> When you register, we collect your email
                    address and a hashed password. We do not store plaintext passwords.
                  </li>
                  <li>
                    <strong>Profile Details:</strong> Optional display name or profile settings you
                    configure in your account.
                  </li>
                  <li>
                    <strong>Support Communications:</strong> Any messages you send to our support
                    team.
                  </li>
                </ul>

                <h3>Information Collected Automatically</h3>
                <ul className="ss-policy-list">
                  <li>
                    <strong>Scan Data:</strong> URLs and marketplace listing details you submit for
                    risk analysis. This includes product titles, seller identifiers, price
                    information, and listing content as extracted by the browser extension.
                  </li>
                  <li>
                    <strong>Scan Results:</strong> Risk scores, detected red flags, and analysis
                    metadata associated with your scans.
                  </li>
                  <li>
                    <strong>Usage Logs:</strong> Pages visited within the application, timestamps,
                    and feature interactions (e.g., scan history views, settings changes).
                  </li>
                  <li>
                    <strong>Device &amp; Browser Information:</strong> IP address, browser type and
                    version, operating system, and referring URL, collected for security and
                    analytics purposes.
                  </li>
                </ul>

                <h3>Information from Third Parties</h3>
                <ul className="ss-policy-list">
                  <li>
                    <strong>Google OAuth:</strong> If you sign in with Google, we receive your name,
                    email address, and Google account ID. We do not receive your Google password.
                  </li>
                </ul>
              </section>

              <section id="how-we-use" className="ss-policy-section">
                <h2>
                  <span className="ss-policy-section-num">03</span>
                  How We Use Your Information
                </h2>
                <p>We use the information we collect to:</p>
                <ul className="ss-policy-list">
                  <li>Create and manage your account and authenticate your sessions securely.</li>
                  <li>
                    Perform real-time risk analysis on submitted URLs and marketplace listings using
                    our localized AI models.
                  </li>
                  <li>
                    Maintain your scan history so you can review past analyses and track trends over
                    time.
                  </li>
                  <li>
                    Improve and train our risk detection models using aggregated, anonymized scan
                    data. Individual scans are anonymized before being used for model improvements.
                  </li>
                  <li>Detect and prevent fraudulent, abusive, or unauthorized use of our Services.</li>
                  <li>
                    Send transactional emails such as account verification, password reset
                    instructions, and security alerts.
                  </li>
                  <li>Respond to your inquiries and provide customer support.</li>
                  <li>
                    Comply with applicable Philippine laws, including the <em>Data Privacy Act of
                    2012 (Republic Act No. 10173)</em>, and other legal obligations.
                  </li>
                </ul>
              </section>

              <section id="data-sharing" className="ss-policy-section">
                <h2>
                  <span className="ss-policy-section-num">04</span>
                  Data Sharing &amp; Disclosure
                </h2>
                <p>
                  We <strong>do not sell</strong> your personal information. We may share data only
                  in the following limited circumstances:
                </p>
                <ul className="ss-policy-list">
                  <li>
                    <strong>Service Providers:</strong> We use Supabase (database and authentication
                    infrastructure) and similar sub-processors to operate the platform. These
                    providers are contractually bound to process data only as instructed by us.
                  </li>
                  <li>
                    <strong>High-Risk URL Registry:</strong> URLs flagged by our system and
                    confirmed as elevated risk may appear in our internal high-risk registry in
                    anonymized, aggregated form — no personally identifiable information is included.
                    This registry informs our risk-scoring model and is not used to block access.
                  </li>
                  <li>
                    <strong>Legal Compliance:</strong> We may disclose information if required by
                    law, court order, or to cooperate with law enforcement investigations in the
                    Philippines.
                  </li>
                  <li>
                    <strong>Business Transfers:</strong> In the event of a merger, acquisition, or
                    asset sale, user data may be transferred. We will notify you before your data
                    becomes subject to a different privacy policy.
                  </li>
                </ul>
              </section>

              <section id="data-retention" className="ss-policy-section">
                <h2>
                  <span className="ss-policy-section-num">05</span>
                  Data Retention
                </h2>
                <p>
                  We retain your account information for as long as your account is active. Scan
                  history records are retained for a rolling period of <strong>24 months</strong> to
                  allow you to review past analyses.
                </p>
                <p>
                  When you delete your account, your personal information and scan history are
                  permanently deleted within <strong>30 days</strong>. Anonymized, aggregated scan
                  data may be retained indefinitely for model training purposes.
                </p>
              </section>

              <section id="your-rights" className="ss-policy-section">
                <h2>
                  <span className="ss-policy-section-num">06</span>
                  Your Rights
                </h2>
                <p>
                  Under the <em>Data Privacy Act of 2012</em> and applicable regulations, you have
                  the following rights:
                </p>
                <div className="ss-policy-rights-grid">
                  <div className="ss-policy-right-card">
                    <i className="fas fa-eye"></i>
                    <h4>Right to Access</h4>
                    <p>Request a copy of the personal data we hold about you.</p>
                  </div>
                  <div className="ss-policy-right-card">
                    <i className="fas fa-edit"></i>
                    <h4>Right to Rectification</h4>
                    <p>Request correction of inaccurate or incomplete data.</p>
                  </div>
                  <div className="ss-policy-right-card">
                    <i className="fas fa-trash-alt"></i>
                    <h4>Right to Erasure</h4>
                    <p>Request deletion of your personal data and account.</p>
                  </div>
                  <div className="ss-policy-right-card">
                    <i className="fas fa-download"></i>
                    <h4>Right to Portability</h4>
                    <p>Request your data in a structured, machine-readable format.</p>
                  </div>
                  <div className="ss-policy-right-card">
                    <i className="fas fa-ban"></i>
                    <h4>Right to Object</h4>
                    <p>Object to processing of your data for specific purposes.</p>
                  </div>
                  <div className="ss-policy-right-card">
                    <i className="fas fa-file-alt"></i>
                    <h4>Right to Complain</h4>
                    <p>Lodge a complaint with the National Privacy Commission (NPC).</p>
                  </div>
                </div>
                <p>
                  To exercise any of these rights, contact us at the address in the{' '}
                  <a href="#contact">Contact Us</a> section. We will respond within{' '}
                  <strong>15 business days</strong>.
                </p>
              </section>

              <section id="cookies" className="ss-policy-section">
                <h2>
                  <span className="ss-policy-section-num">07</span>
                  Cookies &amp; Tracking
                </h2>
                <p>
                  We use essential cookies and local storage to maintain your login session and
                  remember your preferences (e.g., light/dark theme). We do not use third-party
                  advertising trackers or cross-site tracking cookies.
                </p>
                <div className="ss-policy-table-wrapper">
                  <table className="ss-policy-table">
                    <thead>
                      <tr>
                        <th>Cookie / Key</th>
                        <th>Purpose</th>
                        <th>Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><code>supabase.auth.token</code></td>
                        <td>Authentication session token</td>
                        <td>Session / 1 week</td>
                      </tr>
                      <tr>
                        <td><code>ss-theme</code></td>
                        <td>Stores your light or dark mode preference</td>
                        <td>Persistent (localStorage)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p>
                  You can clear cookies and localStorage at any time through your browser settings.
                  Clearing authentication cookies will log you out.
                </p>
              </section>

              <section id="security" className="ss-policy-section">
                <h2>
                  <span className="ss-policy-section-num">08</span>
                  Security
                </h2>
                <p>
                  We implement industry-standard security measures to protect your data:
                </p>
                <ul className="ss-policy-list">
                  <li>All data in transit is encrypted using <strong>TLS 1.2 or higher</strong>.</li>
                  <li>Passwords are hashed using secure cryptographic algorithms — we never store plaintext passwords.</li>
                  <li>Database access is restricted by row-level security policies.</li>
                  <li>Authentication is managed by Supabase Auth with JWT-based session tokens.</li>
                  <li>
                    HTTP connections to this application are automatically upgraded to HTTPS in
                    production environments.
                  </li>
                </ul>
                <p>
                  While we take every reasonable precaution, no method of electronic transmission or
                  storage is 100% secure. We encourage you to use a strong, unique password and
                  enable account recovery options.
                </p>
              </section>

              <section id="children" className="ss-policy-section">
                <h2>
                  <span className="ss-policy-section-num">09</span>
                  Children's Privacy
                </h2>
                <p>
                  SureShop is not directed to children under <strong>13 years of age</strong>. We do
                  not knowingly collect personal information from children. If you believe a child
                  has provided us with personal data, please contact us immediately and we will
                  delete the information.
                </p>
              </section>

              <section id="changes" className="ss-policy-section">
                <h2>
                  <span className="ss-policy-section-num">10</span>
                  Changes to This Policy
                </h2>
                <p>
                  We may update this Privacy Policy from time to time. When we make material changes,
                  we will update the "Last updated" date at the top of this page and, where
                  appropriate, notify you by email or through a prominent notice in the application.
                  Continued use of the Services after the effective date of the updated policy
                  constitutes your acceptance of the changes.
                </p>
              </section>

              <section id="contact" className="ss-policy-section">
                <h2>
                  <span className="ss-policy-section-num">11</span>
                  Contact Us
                </h2>
                <p>
                  If you have questions, concerns, or requests regarding this Privacy Policy or your
                  personal data, please contact us:
                </p>
                <div className="ss-policy-contact-card">
                  <div className="ss-policy-contact-row">
                    <i className="fas fa-envelope"></i>
                    <div>
                      <strong>Email</strong>
                      <span>sureshopph.support@gmail.com</span>
                    </div>
                  </div>
                  <div className="ss-policy-contact-row">
                    <i className="fas fa-globe"></i>
                    <div>
                      <strong>Website</strong>
                      <span>sureshopph.vercel.app</span>
                    </div>
                  </div>
                  <div className="ss-policy-contact-row">
                    <i className="fas fa-map-marker-alt"></i>
                    <div>
                      <strong>Jurisdiction</strong>
                      <span>Republic of the Philippines</span>
                    </div>
                  </div>
                </div>
                <p className="ss-policy-npc-note">
                  You also have the right to lodge a complaint with the{' '}
                  <strong>National Privacy Commission of the Philippines (NPC)</strong> if you
                  believe your data privacy rights have been violated.
                </p>
              </section>

              <div className="ss-policy-footer-nav">
                <Link to="/" className="ss-policy-back-link">
                  <i className="fas fa-arrow-left"></i> Back to Home
                </Link>
                <div className="ss-policy-related">
                  <Link to="/terms-of-service">Terms of Service</Link>
                  <span>·</span>
                  <Link to="/cookie-policy">Cookie Policy</Link>
                </div>
              </div>

            </article>
          </div>
        </div>
      </main>
      <LandingFooter />
    </>
  );
}

export default PrivacyPolicy;
