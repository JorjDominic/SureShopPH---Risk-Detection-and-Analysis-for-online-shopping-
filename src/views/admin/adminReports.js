
import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../context/AuthContext';

import AdminSubNav, { MODERATION_TABS } from '../../components/AdminSubNav';
import '../../styles/dashboard.css';

const FILTERS = ['All', 'Pending', 'Verified', 'Dismissed'];

function AdminReports() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState('All');
  const [busyId, setBusyId] = useState(null);
  const [noTable, setNoTable] = useState(false);

  const loadReports = useCallback(async () => {
    let query = supabase
      .from('reports')
      .select('id, url, risk_score, reason, status, created_at, user_id')
      .order('created_at', { ascending: false });

    if (filter !== 'All') {
      query = query.eq('status', filter.toLowerCase());
    }

    const { data, error } = await query;
    if (error) {
      setNoTable(true);
      setReports([]);
    } else {
      setNoTable(false);
      setReports(data ?? []);
    }
  }, [filter]);

  useEffect(() => {
    if (authLoading) return;
    let active = true;

    if (!user) { setLoading(false); return undefined; }

    loadReports().finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [authLoading, user, loadReports]);

  const updateStatus = async (id, newStatus) => {
    setBusyId(id);
    await supabase.from('reports').update({ status: newStatus }).eq('id', id);
    setReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
    );
    setBusyId(null);
  };

  const formatDate = (iso) =>
    iso
      ? new Date(iso).toLocaleString('en-PH', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        })
      : '\u2014';

  const statusBadge = (status) => {
    if (status === 'pending') return <span className="ss-admin-status-badge pending">Pending</span>;
    if (status === 'verified') return <span className="ss-admin-status-badge verified">Verified</span>;
    return <span className="ss-admin-status-badge dismissed">Dismissed</span>;
  };

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
                {reports.length} record{reports.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Filter tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              {FILTERS.map((f) => (
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

            <div className="ss-dashboard-panel">
              {noTable ? (
                <div className="udb-empty-state">
                  <i className="fas fa-table" style={{ fontSize: '2rem', marginBottom: '0.75rem' }}></i>
                  <h3>Reports table not found</h3>
                  <p>Create a <code>reports</code> table in Supabase to enable this feature.</p>
                </div>
              ) : reports.length === 0 ? (
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
                        <th>Risk Score</th>
                        <th>User Reason</th>
                        <th>User ID</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th style={{ minWidth: 160 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.map((r) => (
                        <tr key={r.id}>
                          <td style={{ maxWidth: 220 }}>
                            <a
                              href={r.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: 'var(--ss-dashboard-blue)', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            >
                              {r.url || '\u2014'}
                            </a>
                          </td>
                          <td style={{ fontFamily: 'monospace' }}>
                            {r.risk_score != null ? `${r.risk_score}%` : '\u2014'}
                          </td>
                          <td style={{ maxWidth: 220, color: 'var(--ss-dashboard-muted)', fontSize: '0.85rem' }}>
                            {r.reason || '\u2014'}
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.76rem', color: '#94a3b8' }}>
                            {r.user_id?.slice(0, 8)}\u2026
                          </td>
                          <td style={{ whiteSpace: 'nowrap', fontSize: '0.82rem' }}>{formatDate(r.created_at)}</td>
                          <td>{statusBadge(r.status)}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.45rem' }}>
                              <button
                                type="button"
                                disabled={busyId === r.id || r.status === 'verified'}
                                onClick={() => updateStatus(r.id, 'verified')}
                                className="ss-dashboard-btn ss-dashboard-btn-primary"
                                style={{ minHeight: 34, padding: '0 0.8rem', fontSize: '0.78rem' }}
                              >
                                <i className="fas fa-check" style={{ marginRight: '0.3rem' }}></i>Verify
                              </button>
                              <button
                                type="button"
                                disabled={busyId === r.id || r.status === 'dismissed'}
                                onClick={() => updateStatus(r.id, 'dismissed')}
                                className="ss-dashboard-btn ss-dashboard-btn-secondary"
                                style={{ minHeight: 34, padding: '0 0.8rem', fontSize: '0.78rem' }}
                              >
                                <i className="fas fa-times" style={{ marginRight: '0.3rem' }}></i>Dismiss
                              </button>
                            </div>
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

      </main>
    </div>
  );
}

export default AdminReports;
