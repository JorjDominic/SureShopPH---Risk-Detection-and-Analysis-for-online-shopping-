import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../context/AuthContext';
import '../../styles/dashboard.css';

const PAGE_SIZE = 20;

function ScanHistoryPage() {
  const { user, loading } = useAuth();
  const [scans, setScans] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [filter, setFilter] = useState('all');
  const [pageLoading, setPageLoading] = useState(true);

  const loadScans = useCallback(async (currentUser, pageNum, riskFilter) => {
    let query = supabase
      .from('scan_history')
      .select('id, scan_mode, url, platform, risk_score, risk_level, created_at')
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
    setPageLoading(true);

    loadScans(user, page, filter).then((data) => {
      if (!active) return;
      setScans(data);
      setHasMore(data.length === PAGE_SIZE);
      setPageLoading(false);
    });

    return () => { active = false; };
  }, [user, filter, page, loadScans]);

  // Reset to page 0 when filter changes
  useEffect(() => { setPage(0); }, [filter]);

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
      <main className="ss-dashboard-main">

        {/* Page title */}
        <div className="ss-dashboard-section">
          <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 1.5rem" }}>
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
          <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 1.5rem" }}>
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

            {(loading || pageLoading) ? (
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
                          <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{page * PAGE_SIZE + i + 1}</td>
                          <td>{scan.scan_mode ? scan.scan_mode.charAt(0).toUpperCase() + scan.scan_mode.slice(1) : '—'}</td>
                          <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {scan.url || '—'}
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

                {(page > 0 || hasMore) && (
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '1.25rem', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="ss-dashboard-btn ss-dashboard-btn-secondary"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      <i className="fas fa-chevron-left"></i> Prev
                    </button>
                    <span style={{ fontSize: '0.85rem', color: 'var(--ss-dashboard-muted)' }}>
                      Page {page + 1}
                    </span>
                    <button
                      type="button"
                      className="ss-dashboard-btn ss-dashboard-btn-secondary"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={!hasMore}
                    >
                      Next <i className="fas fa-chevron-right"></i>
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
    </div>
  );
}

export default ScanHistoryPage;
