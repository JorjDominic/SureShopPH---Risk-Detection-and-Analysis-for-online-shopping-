
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../context/AuthContext';

import AdminSubNav, { MODERATION_TABS } from '../../components/AdminSubNav';
import '../../styles/dashboard.css';

const ALL_FILTER = 'All';

function AdminReports() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState(ALL_FILTER);
  const [noTable, setNoTable] = useState(false);

  const loadReports = useCallback(async () => {
    const { data, error } = await supabase
      .from('user_reports')
      .select('id, user_id, listing_url, report_type, description, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      setNoTable(true);
      setReports([]);
    } else {
      setNoTable(false);
      setReports(data ?? []);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    let active = true;

    if (!user) { setLoading(false); return undefined; }

    loadReports().finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [authLoading, user, loadReports]);

  // Derive filter buttons from the actual report_type values present.
  const filters = useMemo(() => {
    const types = new Set();
    for (const r of reports) {
      if (r.report_type) types.add(r.report_type);
    }
    return [ALL_FILTER, ...Array.from(types).sort()];
  }, [reports]);

  const visibleReports = useMemo(() => {
    if (filter === ALL_FILTER) return reports;
    return reports.filter((r) => r.report_type === filter);
  }, [reports, filter]);

  const formatDate = (iso) =>
    iso
      ? new Date(iso).toLocaleString('en-PH', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        })
      : '\u2014';

  if (loading) return <div className="ss-dashboard-page" aria-busy="true" />;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="ss-dashboard-page">
      <main className="ss-dashboard-main">

        <AdminSubNav eyebrow="Admin › Moderation" tabs={MODERATION_TABS} />

        <div className="ss-dashboard-section">
          <div className="container">
            <div className="ss-dashboard-section-heading">
              <div>
                <h2>User Reports</h2>
              </div>
              <p style={{ alignSelf: 'center', color: 'var(--ss-dashboard-muted)', fontSize: '0.9rem' }}>
                {visibleReports.length} record{visibleReports.length !== 1 ? 's' : ''}
              </p>
            </div>

            {filters.length > 1 && (
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                {filters.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className={`ss-dashboard-btn ${filter === f ? 'ss-dashboard-btn-primary' : 'ss-dashboard-btn-secondary'}`}
                    style={{ minHeight: 36, padding: '0 1rem', fontSize: '0.83rem' }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            )}

            <div className="ss-dashboard-panel">
              {noTable ? (
                <div className="udb-empty-state">
                  <i className="fas fa-table" style={{ fontSize: '2rem', marginBottom: '0.75rem' }}></i>
                  <h3>user_reports table not found</h3>
                  <p>Create a <code>user_reports</code> table in Supabase to enable this feature.</p>
                </div>
              ) : visibleReports.length === 0 ? (
                <div className="udb-empty-state">
                  <i className="fas fa-flag-checkered" style={{ fontSize: '2rem', marginBottom: '0.75rem' }}></i>
                  <h3>No reports here</h3>
                  <p>User dispute reports matching the selected filter will appear here.</p>
                </div>
              ) : (
                <div className="ss-dashboard-table-wrap">
                  <table className="ss-dashboard-table">
                    <thead>
                      <tr>
                        <th>Listing URL</th>
                        <th>Report Type</th>
                        <th>Description</th>
                        <th>User ID</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleReports.map((r) => (
                        <tr key={r.id}>
                          <td style={{ maxWidth: 260 }}>
                            <a
                              href={r.listing_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: 'var(--ss-dashboard-blue)', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            >
                              {r.listing_url || '\u2014'}
                            </a>
                          </td>
                          <td>
                            <span className="ss-dashboard-risk ss-dashboard-risk-medium" style={{ fontSize: '0.78rem' }}>
                              {r.report_type || '\u2014'}
                            </span>
                          </td>
                          <td style={{ maxWidth: 320, color: 'var(--ss-dashboard-muted)', fontSize: '0.85rem' }}>
                            {r.description || '\u2014'}
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.76rem', color: '#94a3b8' }}>
                            {r.user_id?.slice(0, 8)}\u2026
                          </td>
                          <td style={{ whiteSpace: 'nowrap', fontSize: '0.82rem' }}>{formatDate(r.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}

export default AdminReports;
