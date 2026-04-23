import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import { logoutUser } from '../../services/authService';
import DashboardHeader from '../../components/DashboardHeader';
import DashboardFooter from '../../components/DashboardFooter';
import '../../styles/dashboard.css';

const PAGE_SIZE = 20;

function ScanHistoryPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scans, setScans] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [filter, setFilter] = useState('all');
  const [logoutBusy, setLogoutBusy] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data?.user ?? null);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const loadScans = useCallback(async (currentUser, pageNum, riskFilter) => {
    let query = supabase
      .from('scans')
      .select('id, scan_type, product_name, risk_level, created_at')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })
      .range(pageNum * PAGE_SIZE, pageNum * PAGE_SIZE + PAGE_SIZE);

    if (riskFilter !== 'all') {
      query = query.eq('risk_level', riskFilter.charAt(0).toUpperCase() + riskFilter.slice(1));
    }

    const { data } = await query;
    return data ?? [];
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);

    loadScans(user, 0, filter).then((data) => {
      if (!active) return;
      setScans(data);
      setPage(0);
      setHasMore(data.length === PAGE_SIZE);
      setLoading(false);
    });

    return () => { active = false; };
  }, [user, filter, loadScans]);

  const handleLoadMore = async () => {
    const nextPage = page + 1;
    const more = await loadScans(user, nextPage, filter);
    setScans((prev) => [...prev, ...more]);
    setPage(nextPage);
    setHasMore(more.length === PAGE_SIZE);
  };

  const handleLogout = async () => {
    setLogoutBusy(true);
    await logoutUser();
    navigate('/login');
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-PH', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const riskClass = (level) => {
    if (!level) return 'ss-dashboard-risk-low';
    const l = level.toLowerCase();
    if (l === 'high') return 'ss-dashboard-risk-high';
    if (l === 'medium') return 'ss-dashboard-risk-medium';
    return 'ss-dashboard-risk-low';
  };

  if (!loading && !user) return <Navigate to="/login" replace />;

  return (
    <div className="ss-dashboard-page">
      <DashboardHeader user={user} onLogout={handleLogout} logoutBusy={logoutBusy} />

      <main className="ss-dashboard-main">

        {/* Page title */}
        <div className="ss-dashboard-section">
          <div className="container">
            <div className="ss-dashboard-section-heading">
              <div>
                <p className="ss-dashboard-eyebrow">Activity</p>
                <h2>Scan History</h2>
              </div>
            </div>
          </div>
        </div>

        {/* Table section */}
        <div className="ss-dashboard-section">
          <div className="container">
            <div className="ss-dashboard-section-heading">
              <div>
                <p className="ss-dashboard-eyebrow">Results</p>
                <h2>All Scans</h2>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignSelf: 'center' }}>
                {['all', 'high', 'medium', 'low'].map((f) => (
                  <button
                    key={f}
                    type="button"
                    className={`ss-dashboard-btn ${filter === f ? 'ss-dashboard-btn-primary' : 'ss-dashboard-btn-secondary'}`}
                    style={{ minHeight: 38, padding: '0 1rem', fontSize: '0.82rem' }}
                    onClick={() => setFilter(f)}
                  >
                    {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1) + ' Risk'}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="ss-dashboard-panel">
                <div className="udb-empty-state">
                  <i className="fas fa-spinner fa-spin"></i>
                  <h3>Loading scans...</h3>
                </div>
              </div>
            ) : scans.length === 0 ? (
              <div className="ss-dashboard-panel">
                <div className="udb-empty-state">
                  <i className="fas fa-history"></i>
                  <h3>No scans found</h3>
                  <p>
                    {filter !== 'all'
                      ? `No ${filter}-risk scans in your history.`
                      : 'Start scanning products with the browser extension to build your history.'}
                  </p>
                  <div style={{ marginTop: '1rem' }}>
                    <Link to="/scan" className="ss-dashboard-btn ss-dashboard-btn-primary">
                      <i className="fas fa-search"></i> New Scan
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="ss-dashboard-panel">
                <div className="ss-dashboard-table-wrap">
                  <table className="ss-dashboard-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Type</th>
                        <th>Product / URL</th>
                        <th>Risk Level</th>
                        <th>Date</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scans.map((scan, i) => (
                        <tr key={scan.id}>
                          <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{i + 1}</td>
                          <td>{scan.scan_type ? scan.scan_type.charAt(0).toUpperCase() + scan.scan_type.slice(1) : '—'}</td>
                          <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {scan.product_name || '—'}
                          </td>
                          <td>
                            <span className={`ss-dashboard-risk ${riskClass(scan.risk_level)}`}>
                              {scan.risk_level || 'Unknown'}
                            </span>
                          </td>
                          <td style={{ whiteSpace: 'nowrap', fontSize: '0.82rem' }}>{formatDate(scan.created_at)}</td>
                          <td>
                            <Link
                              to={`/scan-details/${scan.id}`}
                              className="ss-dashboard-btn ss-dashboard-btn-secondary"
                              style={{ minHeight: 36, padding: '0 0.85rem', fontSize: '0.78rem' }}
                            >
                              <i className="fas fa-eye"></i> View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {hasMore && (
                  <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
                    <button type="button" className="ss-dashboard-btn ss-dashboard-btn-secondary" onClick={handleLoadMore}>
                      <i className="fas fa-chevron-down"></i> Load More
                    </button>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <Link to="/userdashboard" className="ss-dashboard-btn ss-dashboard-btn-secondary">
                <i className="fas fa-tachometer-alt"></i> Back to Dashboard
              </Link>
              <Link to="/scan" className="ss-dashboard-btn ss-dashboard-btn-primary">
                <i className="fas fa-search"></i> New Scan
              </Link>
            </div>
          </div>
        </div>

      </main>

      <DashboardFooter />
    </div>
  );
}

export default ScanHistoryPage;
