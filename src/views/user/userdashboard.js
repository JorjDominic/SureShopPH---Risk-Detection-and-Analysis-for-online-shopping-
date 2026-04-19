
import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import { logoutUser } from '../../services/authService';
import DashboardHeader from '../../components/DashboardHeader';
import DashboardFooter from '../../components/DashboardFooter';
import '../../styles/dashboard.css';

function DashboardIcon({ type }) {
  const icons = {
    shield: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2.5 4.5 5.6v5.95c0 4.87 3.18 9.28 7.5 10.95 4.32-1.67 7.5-6.08 7.5-10.95V5.6L12 2.5Zm0 2.04 5.5 2.27v4.74c0 3.91-2.36 7.39-5.5 8.81-3.14-1.42-5.5-4.9-5.5-8.81V6.81L12 4.54Zm-1.18 10.78-2.65-2.65-1.42 1.41 4.07 4.08 6.51-6.51-1.41-1.42-5.1 5.09Z" />
      </svg>
    ),
    scan: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 7a3 3 0 0 1 3-3h3v2H7a1 1 0 0 0-1 1v3H4V7Zm10-3h3a3 3 0 0 1 3 3v3h-2V7a1 1 0 0 0-1-1h-3V4ZM4 14h2v3a1 1 0 0 0 1 1h3v2H7a3 3 0 0 1-3-3v-3Zm14 0h2v3a3 3 0 0 1-3 3h-3v-2h3a1 1 0 0 0 1-1v-3Zm-9-3h6v2H9v-2Z" />
      </svg>
    ),
    warning: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3.75c.46 0 .88.24 1.1.65l8 14a1.25 1.25 0 0 1-1.1 1.85H4a1.25 1.25 0 0 1-1.1-1.85l8-14c.22-.41.64-.65 1.1-.65Zm0 5.25a1 1 0 0 0-1 1v4.25a1 1 0 1 0 2 0V10a1 1 0 0 0-1-1Zm0 8a1.12 1.12 0 1 0 0-2.24A1.12 1.12 0 0 0 12 17Z" />
      </svg>
    ),
    spark: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m12 2 1.92 5.08L19 9l-5.08 1.92L12 16l-1.92-5.08L5 9l5.08-1.92L12 2Zm7 12 1 2.65L22.65 18 20 19l-1 2.65L18 19l-2.65-1L18 16.65 19 14Zm-14 1 1.2 3.2L9.4 19.4 6.2 20.6 5 23.8 3.8 20.6.6 19.4l3.2-1.2L5 15Z" />
      </svg>
    ),
    user: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 12a4.25 4.25 0 1 0 0-8.5 4.25 4.25 0 0 0 0 8.5Zm0 2c-4.42 0-8 2.35-8 5.25 0 .69.56 1.25 1.25 1.25h13.5c.69 0 1.25-.56 1.25-1.25C20 16.35 16.42 14 12 14Z" />
      </svg>
    ),
    logout: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M11 4a1 1 0 1 0 0 2h5a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-5a1 1 0 1 0 0 2h5a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3h-5Zm-1.29 3.29a1 1 0 0 1 1.41 1.42L9.83 10H15a1 1 0 1 1 0 2H9.83l1.29 1.29a1 1 0 0 1-1.41 1.42l-3-3a1 1 0 0 1 0-1.42l3-3Z" />
      </svg>
    ),
    trend: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 17.5a1 1 0 0 1-1-1v-9a1 1 0 1 1 2 0v6.59l3.8-3.79a1 1 0 0 1 1.4 0l2.3 2.29 4.79-4.79H16.5a1 1 0 1 1 0-2H21a1 1 0 0 1 1 1v4.5a1 1 0 1 1-2 0V8.71l-5.5 5.5a1 1 0 0 1-1.4 0l-2.3-2.3L7 15.71V16.5a1 1 0 0 1-1 1Z" />
      </svg>
    ),
    lock: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 10V8a4 4 0 1 1 8 0v2h.75A2.25 2.25 0 0 1 19 12.25v6.5A2.25 2.25 0 0 1 16.75 21h-9.5A2.25 2.25 0 0 1 5 18.75v-6.5A2.25 2.25 0 0 1 7.25 10H8Zm2 0h4V8a2 2 0 1 0-4 0v2Zm2 3a1.5 1.5 0 0 0-.75 2.8V17a.75.75 0 0 0 1.5 0v-1.2A1.5 1.5 0 0 0 12 13Z" />
      </svg>
    )
  };

  return <span className="ss-dashboard-icon-svg">{icons[type] || icons.shield}</span>;
}

function UserDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [logoutBusy, setLogoutBusy] = useState(false);

  useEffect(() => {
    let active = true;

    const loadUser = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const currentUser = authData?.user ?? null;

      if (!active) return;

      if (!currentUser) {
        setLoading(false);
        return;
      }

      setUser(currentUser);

      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .maybeSingle();

        if (!active) return;
        setProfile(profileData ?? null);
      } catch (error) {
        if (!active) return;
        setProfile(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadUser();

    return () => {
      active = false;
    };
  }, []);

  const displayName = useMemo(() => {
    if (!user) return 'Shopper';

    const maybeName =
      profile?.full_name ||
      profile?.username ||
      profile?.name ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name;

    if (maybeName) return maybeName;

    const emailName = user.email?.split('@')[0] || 'Shopper';
    return emailName.charAt(0).toUpperCase() + emailName.slice(1);
  }, [profile, user]);

  const recentActivity = useMemo(
    () => [
      {
        item: 'Gaming Headset Marketplace Listing',
        category: 'Product Scan',
        risk: 'Low',
        note: 'Seller history and price behavior look normal.',
        time: '10 mins ago'
      },
      {
        item: 'Flash deal gadget page',
        category: 'URL Scan',
        risk: 'High',
        note: 'Possible spoofed domain and suspicious urgency terms.',
        time: '42 mins ago'
      },
      {
        item: 'Fashion seller profile',
        category: 'Seller Check',
        risk: 'Medium',
        note: 'New account with limited review history.',
        time: '1 hr ago'
      },
      {
        item: 'Beauty product listing',
        category: 'Product Scan',
        risk: 'Low',
        note: 'Healthy review pattern and trusted store signals.',
        time: 'Today'
      }
    ],
    []
  );

  const stats = useMemo(() => {
    const highRisk = recentActivity.filter((entry) => entry.risk === 'High').length;
    const mediumRisk = recentActivity.filter((entry) => entry.risk === 'Medium').length;
    const protectedItems = recentActivity.filter((entry) => entry.risk === 'Low').length;

    return [
      {
        label: 'Total scans',
        value: recentActivity.length + 12,
        meta: 'Across URLs, sellers, and product listings',
        icon: 'scan',
        tone: 'teal'
      },
      {
        label: 'High-risk found',
        value: highRisk,
        meta: 'Listings you avoided because of warning signs',
        icon: 'warning',
        tone: 'danger'
      },
      {
        label: 'Protected items',
        value: protectedItems + 8,
        meta: 'Safer checks completed with better confidence',
        icon: 'shield',
        tone: 'success'
      },
      {
        label: 'Confidence score',
        value: `${96 - mediumRisk}%`,
        meta: 'Current safety confidence based on recent scans',
        icon: 'trend',
        tone: 'blue'
      }
    ];
  }, [recentActivity]);

  const quickActions = useMemo(
    () => [
      {
        title: 'Start a URL scan',
        text: 'Analyze suspicious shopping links before you click or buy.',
        icon: 'scan',
        badge: 'Fast check',
        href: '#'
      },
      {
        title: 'Check a seller',
        text: 'Review seller signals such as age, trust, and behavior patterns.',
        icon: 'user',
        badge: 'Seller insights',
        href: '#'
      },
      {
        title: 'Saved warnings',
        text: 'Go back to flagged listings and review previous risk findings.',
        icon: 'warning',
        badge: 'Recent alerts',
        href: '#'
      },
      {
        title: 'Account settings',
        text: 'Update your profile, notification settings, and protection tools.',
        icon: 'lock',
        badge: 'Manage account',
        href: '#'
      }
    ],
    []
  );

  const handleLogout = async () => {
    setLogoutBusy(true);
    await logoutUser();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="ss-dashboard-page">
        <main className="ss-dashboard-main">
          <section className="ss-dashboard-hero">
            <div className="container">
              <div className="ss-dashboard-hero-card ss-dashboard-hero-main">
                <div className="ss-dashboard-chip">Loading dashboard</div>
                <h1>Preparing your SureShop workspace...</h1>
                <p>Please wait while we load your account details and recent protection summary.</p>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (!loading && !user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="ss-dashboard-page">
      <DashboardHeader user={user} onLogout={handleLogout} logoutBusy={logoutBusy} />
      <main className="ss-dashboard-main">
        <section className="ss-dashboard-hero" id="overview">
          <div className="container ss-dashboard-hero-grid">
            <div className="ss-dashboard-hero-card ss-dashboard-hero-main">
              <div className="ss-dashboard-chip">Live user protection</div>
              <h1>Welcome back, {displayName}.</h1>
              <p>
                Here is your personal safety hub for tracking scans, reviewing suspicious activity,
                and checking sellers before every purchase.
              </p>

              <div className="ss-dashboard-hero-actions">
                <a href="#activity" className="ss-dashboard-btn ss-dashboard-btn-primary">
                  Review recent scans
                </a>
                <a href="#tips" className="ss-dashboard-btn ss-dashboard-btn-secondary">
                  See protection tips
                </a>
              </div>

              <div className="ss-dashboard-user-pill-row">
                <span className="ss-dashboard-user-pill">
                  <DashboardIcon type="user" />
                  {user?.email || 'Signed in user'}
                </span>
                <span className="ss-dashboard-user-pill alt">
                  <DashboardIcon type="spark" />
                  Shield active
                </span>
              </div>
            </div>

            <aside className="ss-dashboard-hero-card ss-dashboard-hero-side">
              <div className="ss-dashboard-side-header">
                <span className="ss-dashboard-side-badge">Status</span>
                <span className="ss-dashboard-side-score">96%</span>
              </div>
              <h2>Protection level is strong</h2>
              <p>
                Your recent activity shows healthy scan behavior with early detection on suspicious pages.
              </p>
              <div className="ss-dashboard-meter">
                <span style={{ width: '96%' }}></span>
              </div>
              <ul className="ss-dashboard-checklist">
                <li><DashboardIcon type="shield" /> Risk scoring enabled</li>
                <li><DashboardIcon type="warning" /> Alerts highlighted instantly</li>
                <li><DashboardIcon type="lock" /> Account session secured</li>
              </ul>
            </aside>
          </div>
        </section>

        <section className="ss-dashboard-section">
          <div className="container">
            <div className="ss-dashboard-section-heading">
              <div>
                <p className="ss-dashboard-eyebrow">Quick actions</p>
                <h2>Start from the tools you use most</h2>
              </div>
            </div>

            <div className="ss-dashboard-actions-grid">
              {quickActions.map((action) => (
                <a className="ss-dashboard-action-card" href={action.href} key={action.title}>
                  <div className="ss-dashboard-action-top">
                    <span className="ss-dashboard-action-icon"><DashboardIcon type={action.icon} /></span>
                    <span className="ss-dashboard-action-badge">{action.badge}</span>
                  </div>
                  <h3>{action.title}</h3>
                  <p>{action.text}</p>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="ss-dashboard-section">
          <div className="container">
            <div className="ss-dashboard-section-heading">
              <div>
                <p className="ss-dashboard-eyebrow">Scan summary</p>
                <h2>Your dashboard at a glance</h2>
              </div>
            </div>

            <div className="ss-dashboard-stats-grid">
              {stats.map((stat) => (
                <article className={`ss-dashboard-stat-card tone-${stat.tone}`} key={stat.label}>
                  <div className="ss-dashboard-stat-top">
                    <div>
                      <p>{stat.label}</p>
                      <h3>{stat.value}</h3>
                    </div>
                    <span className="ss-dashboard-stat-icon"><DashboardIcon type={stat.icon} /></span>
                  </div>
                  <small>{stat.meta}</small>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="ss-dashboard-section" id="activity">
          <div className="container ss-dashboard-content-grid">
            <div className="ss-dashboard-panel ss-dashboard-table-panel">
              <div className="ss-dashboard-panel-header">
                <div>
                  <p className="ss-dashboard-eyebrow">Recent activity</p>
                  <h2>Latest scan results</h2>
                </div>
                <span className="ss-dashboard-panel-pill">Last 24 hours</span>
              </div>

              <div className="ss-dashboard-table-wrap">
                <table className="ss-dashboard-table">
                  <thead>
                    <tr>
                      <th>Item checked</th>
                      <th>Category</th>
                      <th>Risk</th>
                      <th>Notes</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentActivity.map((entry) => (
                      <tr key={`${entry.item}-${entry.time}`}>
                        <td>{entry.item}</td>
                        <td>{entry.category}</td>
                        <td>
                          <span className={`ss-dashboard-risk ss-dashboard-risk-${entry.risk.toLowerCase()}`}>
                            {entry.risk}
                          </span>
                        </td>
                        <td>{entry.note}</td>
                        <td>{entry.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <aside className="ss-dashboard-panel ss-dashboard-side-panel" id="tips">
              <div className="ss-dashboard-panel-header compact">
                <div>
                  <p className="ss-dashboard-eyebrow">Protection tips</p>
                  <h2>Stay one step ahead</h2>
                </div>
              </div>

              <div className="ss-dashboard-tip-list">
                <article>
                  <span><DashboardIcon type="warning" /></span>
                  <div>
                    <h3>Check urgency language</h3>
                    <p>Avoid listings that pressure you to pay fast or leave the platform immediately.</p>
                  </div>
                </article>
                <article>
                  <span><DashboardIcon type="user" /></span>
                  <div>
                    <h3>Review seller history</h3>
                    <p>New accounts with very low activity can be riskier, especially during flash sales.</p>
                  </div>
                </article>
                <article>
                  <span><DashboardIcon type="lock" /></span>
                  <div>
                    <h3>Use secure payment paths</h3>
                    <p>Prefer official in-app checkout and avoid transactions that move to random chat links.</p>
                  </div>
                </article>
              </div>

              <div className="ss-dashboard-alert-card">
                <div className="ss-dashboard-alert-icon"><DashboardIcon type="spark" /></div>
                <div>
                  <h3>Safety reminder</h3>
                  <p>When a deal feels unusually cheap, scan both the page and the seller before buying.</p>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </main>
      <DashboardFooter />
    </div>
  );
}

export default UserDashboard;
