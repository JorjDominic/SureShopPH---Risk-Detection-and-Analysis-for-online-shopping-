
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../context/AuthContext';
import { logAdminAction } from '../../services/adminLogService';

import AdminSubNav, { MODERATION_TABS } from '../../components/AdminSubNav';
import '../../styles/dashboard.css';

const STATUS_FILTERS = ['All', 'Pending', 'Verified', 'Dismissed', 'Duplicate'];
const PAGE_SIZE = 25;

function AdminReports() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [busyId, setBusyId] = useState(null);
  const [actionAlert, setActionAlert] = useState(null);
  const [noTable, setNoTable] = useState(false);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const loadReports = useCallback(async (pageIndex = 0) => {
    const from = pageIndex * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error, count } = await supabase
      .from('user_reports')
      .select(
        'id, user_id, listing_url, report_type, description, status, reviewed_by, reviewed_at, listing_id, created_at',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      setNoTable(true);
      setReports([]);
      setTotalCount(0);
    } else {
      setNoTable(false);
      setReports(data ?? []);
      setTotalCount(count ?? 0);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    let active = true;

    if (!user) { setLoading(false); return undefined; }

    loadReports(page).finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [authLoading, user, loadReports, page]);

  const visibleReports = useMemo(() => {
    if (statusFilter === 'All') return reports;
    const target = statusFilter.toLowerCase();
    return reports.filter((r) => (r.status || 'pending') === target);
  }, [reports, statusFilter]);

  // Map of listing_url -> total pending reports for that URL across the
  // whole table. Lets the admin see "9 other users reported this URL too"
  // without losing the per-report description / reporter id.
  const pendingByUrl = useMemo(() => {
    const m = new Map();
    for (const r of reports) {
      if ((r.status || 'pending') === 'pending' && r.listing_url) {
        m.set(r.listing_url, (m.get(r.listing_url) ?? 0) + 1);
      }
    }
    return m;
  }, [reports]);

  const counts = useMemo(() => {
    const c = { pending: 0, verified: 0, dismissed: 0, duplicate: 0 };
    for (const r of reports) {
      const s = r.status || 'pending';
      if (s in c) c[s] += 1;
    }
    return c;
  }, [reports]);

  // Verify a report:
  //   1. Upsert into high_risk_listings with verified=true.
  //   2. Update this report (and any other pending reports for the same URL)
  //      with status='verified', reviewed_by, reviewed_at, listing_id.
  const handleVerify = useCallback(
    async (report) => {
      if (!report?.listing_url) {
        setActionAlert({ type: 'error', message: 'Report has no listing URL.' });
        return;
      }
      setBusyId(report.id);
      setActionAlert(null);

      try {
        const { data: listing, error: upsertErr } = await supabase
          .from('high_risk_listings')
          .upsert(
            {
              url: report.listing_url,
              platform: 'web',
              risk_score: 100,
              risk_level: 'High',
              flags: [report.report_type || 'user_report'],
              verified: true,
              verified_by: user.id,
            },
            { onConflict: 'url' }
          )
          .select('id')
          .single();

        if (upsertErr) throw upsertErr;

        const { error: updateErr } = await supabase
          .from('user_reports')
          .update({
            status: 'verified',
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
            listing_id: listing?.id ?? null,
          })
          .eq('listing_url', report.listing_url)
          .in('status', ['pending', 'duplicate']);

        if (updateErr) throw updateErr;

        await logAdminAction({
          userId: user.id,
          action: 'report.verified',
          details: {
            report_id: report.id,
            listing_url: report.listing_url,
            listing_id: listing?.id ?? null,
          },
        });

        let displayUrl = report.listing_url;
        try {
          const u = new URL(report.listing_url);
          displayUrl = u.hostname + (u.pathname.length > 30 ? u.pathname.slice(0, 30) + '…' : u.pathname);
        } catch { /* leave raw */ }
        setActionAlert({
          type: 'success',
          message: `Promoted "${displayUrl}" to the high-risk registry.`,
        });
        await loadReports(page);
      } catch (err) {
        setActionAlert({
          type: 'error',
          message: err?.message || 'Could not verify report.',
        });
      } finally {
        setBusyId(null);
      }
    },
    [user, loadReports, page]
  );

  const handleDismiss = useCallback(
    async (report) => {
      setBusyId(report.id);
      setActionAlert(null);

      const { error } = await supabase
        .from('user_reports')
        .update({
          status: 'dismissed',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', report.id);

      if (error) {
        setActionAlert({ type: 'error', message: error.message || 'Could not dismiss report.' });
      } else {
        await logAdminAction({
          userId: user.id,
          action: 'report.dismissed',
          details: { report_id: report.id, listing_url: report.listing_url },
        });
        setReports((prev) =>
          prev.map((r) =>
            r.id === report.id
              ? {
                  ...r,
                  status: 'dismissed',
                  reviewed_by: user.id,
                  reviewed_at: new Date().toISOString(),
                }
              : r
          )
        );
      }

      setBusyId(null);
    },
    [user]
  );

  const formatDate = (iso) =>
    iso
      ? new Date(iso).toLocaleString('en-PH', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        })
      : '\u2014';

  const statusBadge = (status) => {
    const s = (status || 'pending').toLowerCase();
    return (
      <span className={`ss-admin-status-badge ${s}`}>
        {s.charAt(0).toUpperCase() + s.slice(1)}
      </span>
    );
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
                {visibleReports.length} record{visibleReports.length !== 1 ? 's' : ''}
                {' · '}
                <strong style={{ color: '#f97316' }}>{counts.pending} pending</strong>
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setStatusFilter(f)}
                  className={`ss-dashboard-btn ${statusFilter === f ? 'ss-dashboard-btn-primary' : 'ss-dashboard-btn-secondary'}`}
                  style={{ minHeight: 36, padding: '0 1rem', fontSize: '0.83rem' }}
                >
                  {f}
                  {f !== 'All' && (
                    <span style={{ marginLeft: '0.4rem', opacity: 0.7, fontSize: '0.78rem' }}>
                      ({counts[f.toLowerCase()] ?? 0})
                    </span>
                  )}
                </button>
              ))}
            </div>

            {actionAlert && (
              <div
                className={`udb-alert ${actionAlert.type === 'error' ? 'udb-alert-error' : 'udb-alert-success'}`}
                style={{ marginBottom: '1rem' }}
              >
                <i
                  className={`fas ${actionAlert.type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'}`}
                  style={{ marginRight: '0.5rem' }}
                ></i>
                {actionAlert.message}
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
                        <th>Status</th>
                        <th style={{ minWidth: 180 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleReports.map((r) => {
                        const status = (r.status || 'pending').toLowerCase();
                        const isPending = status === 'pending';
                        const siblingCount = pendingByUrl.get(r.listing_url) ?? 0;
                        const hasSiblings = isPending && siblingCount > 1;
                        return (
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
                              {hasSiblings && (
                                <span
                                  title={`${siblingCount} pending reports for this URL`}
                                  style={{
                                    display: 'inline-block', marginTop: '0.3rem',
                                    fontSize: '0.7rem', fontWeight: 700,
                                    padding: '0.15rem 0.5rem', borderRadius: 999,
                                    background: 'rgba(249,115,22,0.12)', color: '#c2410c',
                                  }}
                                >
                                  <i className="fas fa-layer-group" style={{ marginRight: '0.3rem' }}></i>
                                  {siblingCount} reports
                                </span>
                              )}
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
                            <td>{statusBadge(r.status)}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.45rem' }}>
                                <button
                                  type="button"
                                  disabled={busyId === r.id || !isPending}
                                  onClick={() => handleVerify(r)}
                                  className="ss-dashboard-btn ss-dashboard-btn-primary"
                                  style={{ minHeight: 34, padding: '0 0.8rem', fontSize: '0.78rem' }}
                                  title={isPending ? 'Promote to high-risk listings' : 'Already reviewed'}
                                >
                                  <i className="fas fa-check" style={{ marginRight: '0.3rem' }}></i>Verify
                                </button>
                                <button
                                  type="button"
                                  disabled={busyId === r.id || !isPending}
                                  onClick={() => handleDismiss(r)}
                                  className="ss-dashboard-btn ss-dashboard-btn-secondary"
                                  style={{ minHeight: 34, padding: '0 0.8rem', fontSize: '0.78rem' }}
                                >
                                  <i className="fas fa-times" style={{ marginRight: '0.3rem' }}></i>Dismiss
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {totalCount > PAGE_SIZE && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="ss-dashboard-btn ss-dashboard-btn-secondary"
                      disabled={page === 0}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                    >
                      <i className="fas fa-chevron-left"></i> Prev
                    </button>
                    <button
                      type="button"
                      className="ss-dashboard-btn ss-dashboard-btn-secondary"
                      disabled={(page + 1) * PAGE_SIZE >= totalCount}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next <i className="fas fa-chevron-right"></i>
                    </button>
                  </div>
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
