
import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import { logoutUser } from '../../services/authService';
import AdminHeader from '../../components/AdminHeader';
import DashboardFooter from '../../components/DashboardFooter';
import DashboardIcon from '../../components/DashboardIcon';
import '../../styles/dashboard.css';

/* ── Inline SVG Line Chart ────────────────────────────────── */
function LineChart({ data }) {
  if (!data || data.length < 2) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.875rem' }}>
        No scan data yet.
      </div>
    );
  }

  const W = 560;
  const H = 140;
  const padX = 4;
  const padY = 14;
  const chartW = W - padX * 2;
  const chartH = H - padY * 2;
  const maxVal = Math.max(...data.map((d) => d.value), 1);

  const toX = (i) => padX + (i / (data.length - 1)) * chartW;
  const toY = (v) => padY + chartH - (v / maxVal) * chartH;

  const pts = data.map((d, i) => `${toX(i)},${toY(d.value)}`).join(' ');
  const areaPath = `${pts} ${toX(data.length - 1)},${H} ${toX(0)},${H}`;

  const labelIndices = data
    .map((d, i) => ({ d, i }))
    .filter(({ i }) => i % 7 === 0 || i === data.length - 1);

  return (
    <svg
      viewBox={`0 0 ${W} ${H + 24}`}
      style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="adminLineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0ea5a4" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#0ea5a4" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {[0.25, 0.5, 0.75, 1].map((pct) => {
        const y = padY + chartH - pct * chartH;
        return (
          <line
            key={pct}
            x1={padX}
            y1={y}
            x2={W - padX}
            y2={y}
            stroke="rgba(148,163,184,0.18)"
            strokeWidth="1"
          />
        );
      })}

      <polygon points={areaPath} fill="url(#adminLineGrad)" />
      <polyline
        points={pts}
        fill="none"
        stroke="#0ea5a4"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {data.map((d, i) => (
        <circle key={i} cx={toX(i)} cy={toY(d.value)} r="3" fill="#0ea5a4" />
      ))}

      {labelIndices.map(({ d, i }) => (
        <text
          key={i}
          x={toX(i)}
          y={H + 18}
          textAnchor="middle"
          fontSize="10"
          fill="#94a3b8"
        >
          {d.label}
        </text>
      ))}
    </svg>
  );
}

/* ── Inline SVG Donut Chart ───────────────────────────────── */
function DonutChart({ segments }) {
  const R = 54;
  const CX = 80;
  const CY = 80;
  const circumference = 2 * Math.PI * R;
  const total = segments.reduce((s, seg) => s + seg.value, 0);

  if (total === 0) {
    return (
      <svg viewBox="0 0 160 160" style={{ width: 160, height: 160 }}>
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(148,163,184,0.2)" strokeWidth="26" />
        <text x={CX} y={CY + 6} textAnchor="middle" fontSize="11" fill="#94a3b8">
          No data
        </text>
      </svg>
    );
  }

  let accumulated = 0;
  const computed = segments.map((seg) => {
    const dash = (seg.value / total) * circumference;
    const result = { ...seg, dash, dashOffset: -accumulated };
    accumulated += dash;
    return result;
  });

  return (
    <svg viewBox="0 0 160 160" style={{ width: 160, height: 160 }}>
      <g transform={`rotate(-90 ${CX} ${CY})`}>
        {computed.map((seg, i) => (
          <circle
            key={i}
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke={seg.color}
            strokeWidth="24"
            strokeDasharray={`${seg.dash} ${circumference - seg.dash}`}
            strokeDashoffset={seg.dashOffset}
          />
        ))}
      </g>
      <text x={CX} y={CY - 4} textAnchor="middle" fontSize="18" fontWeight="800" fill="#0f172a">
        {total}
      </text>
      <text x={CX} y={CY + 14} textAnchor="middle" fontSize="9" fill="#64748b" fontWeight="600">
        SCANS
      </text>
    </svg>
  );
}

/* ── Main admin dashboard ─────────────────────────────────── */
function AdminDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logoutBusy, setLogoutBusy] = useState(false);

  const [kpis, setKpis] = useState({ total: 0, highRisk: 0, pendingReports: 0 });
  const [trendData, setTrendData] = useState([]);
  const [typeSegments, setTypeSegments] = useState([]);
  const [recentScans, setRecentScans] = useState([]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!active) return;
      const u = authData?.user ?? null;
      setUser(u);

      if (!u) { setLoading(false); return; }

      try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        const [totalRes, highRes, recentRes, pendingRes] = await Promise.all([
          supabase.from('scans').select('*', { count: 'exact', head: true }),
          supabase.from('scans').select('*', { count: 'exact', head: true }).eq('risk_level', 'High'),
          supabase
            .from('scans')
            .select('id, scan_type, product_name, risk_level, risk_score, created_at, user_id')
            .order('created_at', { ascending: false })
            .limit(8),
          supabase
            .from('reports')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending'),
        ]);

        if (!active) return;

        setKpis({
          total: totalRes.count ?? 0,
          highRisk: highRes.count ?? 0,
          pendingReports: pendingRes.count ?? 0,
        });

        setRecentScans(recentRes.data ?? []);

        /* ── 30-day trend ── */
        const { data: rawTrend } = await supabase
          .from('scans')
          .select('created_at')
          .gte('created_at', thirtyDaysAgo);

        if (!active) return;

        const trend = [];
        for (let i = 29; i >= 0; i--) {
          const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
          const dateStr = d.toISOString().slice(0, 10);
          const label = d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
          const count = (rawTrend ?? []).filter((s) => s.created_at?.slice(0, 10) === dateStr).length;
          trend.push({ label, value: count });
        }
        setTrendData(trend);

        /* ── Type / platform distribution ── */
        const { data: typeRows } = await supabase.from('scans').select('scan_type');
        if (!active) return;

        const counts = { product: 0, seller: 0, url: 0 };
        for (const row of (typeRows ?? [])) {
          const t = row.scan_type?.toLowerCase();
          if (t in counts) counts[t]++;
        }
        setTypeSegments([
          { label: 'Product', value: counts.product, color: '#0ea5a4' },
          { label: 'Seller', value: counts.seller, color: '#f97316' },
          { label: 'URL / Site', value: counts.url, color: '#2563eb' },
        ]);
      } catch {
        /* non-critical — leave defaults */
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => { active = false; };
  }, []);

  const handleLogout = async () => {
    setLogoutBusy(true);
    await logoutUser();
    navigate('/login');
  };

  const formatDate = (iso) => {
    if (!iso) return '\u2014';
    return new Date(iso).toLocaleString('en-PH', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const riskClass = (level) => {
    if (!level) return 'ss-dashboard-risk-low';
    const l = level.toLowerCase();
    if (l === 'high') return 'ss-dashboard-risk-high';
    if (l === 'medium') return 'ss-dashboard-risk-medium';
    return 'ss-dashboard-risk-low';
  };

  if (loading) {
    return (
      <div className="ss-dashboard-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: '1rem', color: '#475569' }}>
        <i className="fas fa-shield-halved" style={{ fontSize: '2.5rem', color: '#0ea5a4' }}></i>
        <p style={{ margin: 0 }}>Loading admin dashboard…</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="ss-dashboard-page">
      <AdminHeader user={user} onLogout={handleLogout} logoutBusy={logoutBusy} />

      <main className="ss-dashboard-main">

        {/* Page title */}
        <div className="ss-dashboard-section">
          <div className="container">
            <div className="ss-dashboard-section-heading">
              <div>
                <p className="ss-dashboard-eyebrow">Admin Panel</p>
                <h2>Risk Analytics Overview</h2>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignSelf: 'center' }}>
                <Link to="/admin/reports" className="ss-dashboard-btn ss-dashboard-btn-secondary" style={{ minHeight: 40 }}>
                  <i className="fas fa-flag" style={{ marginRight: '0.4rem' }}></i>Reports
                </Link>
                <Link to="/admin/blacklist" className="ss-dashboard-btn ss-dashboard-btn-primary" style={{ minHeight: 40 }}>
                  <i className="fas fa-ban" style={{ marginRight: '0.4rem' }}></i>Blacklist
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="ss-dashboard-section">
          <div className="container">
            <div className="ss-dashboard-stats-grid">
              <article className="ss-dashboard-stat-card tone-teal">
                <div className="ss-dashboard-stat-top">
                  <div>
                    <p>Total Scans</p>
                    <h3>{kpis.total.toLocaleString()}</h3>
                  </div>
                  <span className="ss-dashboard-stat-icon"><DashboardIcon type="scan" /></span>
                </div>
                <small>All-time across all users</small>
              </article>

              <article className="ss-dashboard-stat-card tone-danger">
                <div className="ss-dashboard-stat-top">
                  <div>
                    <p>High-Risk Threats</p>
                    <h3>{kpis.highRisk.toLocaleString()}</h3>
                  </div>
                  <span className="ss-dashboard-stat-icon"><DashboardIcon type="warning" /></span>
                </div>
                <small>Listings flagged as high risk</small>
              </article>

              <article className="ss-dashboard-stat-card tone-blue">
                <div className="ss-dashboard-stat-top">
                  <div>
                    <p>Pending Reports</p>
                    <h3>{kpis.pendingReports.toLocaleString()}</h3>
                  </div>
                  <span className="ss-dashboard-stat-icon"><DashboardIcon type="shield" /></span>
                </div>
                <small>User dispute reports awaiting review</small>
              </article>

              <article className="ss-dashboard-stat-card tone-success">
                <div className="ss-dashboard-stat-top">
                  <div>
                    <p>Safe Items</p>
                    <h3>{Math.max(0, kpis.total - kpis.highRisk).toLocaleString()}</h3>
                  </div>
                  <span className="ss-dashboard-stat-icon"><DashboardIcon type="shield" /></span>
                </div>
                <small>Low / medium risk verified scans</small>
              </article>
            </div>
          </div>
        </div>

        {/* Charts row */}
        <div className="ss-dashboard-section">
          <div className="container">
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.7fr) minmax(0, 1fr)', gap: '1.25rem' }}>

              {/* Line chart */}
              <div className="ss-dashboard-panel">
                <div className="ss-dashboard-section-heading" style={{ marginBottom: '1rem' }}>
                  <div>
                    <p className="ss-dashboard-eyebrow">Trend</p>
                    <h2 style={{ fontSize: '1.1rem' }}>Scan Activity — Last 30 Days</h2>
                  </div>
                </div>
                <div className="ss-admin-chart-wrap">
                  <LineChart data={trendData} />
                </div>
              </div>

              {/* Donut chart */}
              <div className="ss-dashboard-panel">
                <div style={{ marginBottom: '1rem' }}>
                  <p className="ss-dashboard-eyebrow">Breakdown</p>
                  <h2 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-display)', color: 'var(--ss-dashboard-text)', letterSpacing: '-0.03em' }}>
                    Top Scan Types
                  </h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                  <DonutChart segments={typeSegments} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {typeSegments.map((seg) => (
                      <div key={seg.label} style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                        <span
                          style={{
                            width: 12, height: 12, borderRadius: '50%',
                            background: seg.color, flexShrink: 0,
                          }}
                        />
                        <span style={{ fontSize: '0.85rem', color: 'var(--ss-dashboard-muted)' }}>
                          {seg.label}
                        </span>
                        <strong style={{ marginLeft: 'auto', paddingLeft: '0.5rem', fontSize: '0.85rem', color: 'var(--ss-dashboard-text)' }}>
                          {seg.value}
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Recent scans */}
        <div className="ss-dashboard-section">
          <div className="container">
            <div className="ss-dashboard-section-heading">
              <div>
                <p className="ss-dashboard-eyebrow">Live Feed</p>
                <h2>Recent Scan Activity</h2>
              </div>
              <Link to="/admin/blacklist" className="ss-dashboard-btn ss-dashboard-btn-secondary" style={{ alignSelf: 'center', minHeight: 38 }}>
                View Blacklist
              </Link>
            </div>
            <div className="ss-dashboard-panel">
              {recentScans.length === 0 ? (
                <div className="udb-empty-state">
                  <i className="fas fa-database"></i>
                  <h3>No scan data yet</h3>
                  <p>User scans will appear here as the extension reports them.</p>
                </div>
              ) : (
                <div className="ss-dashboard-table-wrap">
                  <table className="ss-dashboard-table">
                    <thead>
                      <tr>
                        <th>User ID</th>
                        <th>Type</th>
                        <th>Product / URL</th>
                        <th>Risk</th>
                        <th>Score</th>
                        <th>Date</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentScans.map((scan) => (
                        <tr key={scan.id}>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#94a3b8' }}>
                            {scan.user_id?.slice(0, 8)}\u2026
                          </td>
                          <td>{scan.scan_type ? scan.scan_type.charAt(0).toUpperCase() + scan.scan_type.slice(1) : '\u2014'}</td>
                          <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {scan.product_name || '\u2014'}
                          </td>
                          <td>
                            <span className={`ss-dashboard-risk ${riskClass(scan.risk_level)}`}>
                              {scan.risk_level || 'Unknown'}
                            </span>
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                            {scan.risk_score != null ? `${scan.risk_score}%` : '\u2014'}
                          </td>
                          <td style={{ whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                            {formatDate(scan.created_at)}
                          </td>
                          <td>
                            <Link
                              to={`/scan-details/${scan.id}`}
                              className="ss-dashboard-btn ss-dashboard-btn-secondary"
                              style={{ minHeight: 34, padding: '0 0.75rem', fontSize: '0.78rem' }}
                            >
                              <i className="fas fa-eye"></i>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick nav */}
        <div className="ss-dashboard-section">
          <div className="container">
            <div className="ss-dashboard-actions-grid">
              <Link to="/admin/reports" className="ss-dashboard-action-card">
                <div className="ss-dashboard-action-top">
                  <span className="ss-dashboard-action-icon"><DashboardIcon type="shield" /></span>
                  <span className="ss-dashboard-action-badge">{kpis.pendingReports > 0 ? kpis.pendingReports : 'Open'}</span>
                </div>
                <h3>Report Queue</h3>
                <p>Review user false-positive disputes</p>
              </Link>
              <Link to="/admin/blacklist" className="ss-dashboard-action-card">
                <div className="ss-dashboard-action-top">
                  <span className="ss-dashboard-action-icon"><DashboardIcon type="warning" /></span>
                  <span className="ss-dashboard-action-badge">DB</span>
                </div>
                <h3>Blacklist Manager</h3>
                <p>Hard-flag high-risk URLs &amp; sellers</p>
              </Link>
              <Link to="/admin/logs" className="ss-dashboard-action-card">
                <div className="ss-dashboard-action-top">
                  <span className="ss-dashboard-action-icon"><DashboardIcon type="scan" /></span>
                  <span className="ss-dashboard-action-badge">Live</span>
                </div>
                <h3>System Logs</h3>
                <p>NLP outputs, scraper errors &amp; AI feed</p>
              </Link>
              <Link to="/admin/settings" className="ss-dashboard-action-card">
                <div className="ss-dashboard-action-top">
                  <span className="ss-dashboard-action-icon"><DashboardIcon type="user" /></span>
                  <span className="ss-dashboard-action-badge">Cfg</span>
                </div>
                <h3>Admin Settings</h3>
                <p>Profile, security &amp; system config</p>
              </Link>
            </div>
          </div>
        </div>

      </main>

      <DashboardFooter />
    </div>
  );
}

export default AdminDashboard;
