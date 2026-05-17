
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../context/AuthContext';
import { logAdminAction } from '../../services/adminLogService';
import '../../styles/dashboard.css';

const PAGE_SIZE = 7;

function AdminUsers() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Merged user rows built from scan_history + user_reports + profiles (best-effort)
  const [allUsers, setAllUsers] = useState([]);
  const [noProfilesTable, setNoProfilesTable] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'disabled'
  const [page, setPage] = useState(0);

  const [busyId, setBusyId] = useState(null);
  const [roleBusyId, setRoleBusyId] = useState(null);
  const [actionAlert, setActionAlert] = useState(null);
  const alertRef = useRef(null);

  const loadUsers = useCallback(async () => {
    // Pull all three sources in parallel; only scan_history is required.
    const [scanRes, reportRes, profileRes, bannedRes] = await Promise.all([
      supabase
        .from('scan_history')
        .select('user_id, risk_level, created_at'),
      supabase
        .from('user_reports')
        .select('user_id'),
      supabase
        .from('profiles')
        .select('id, email, full_name, role, created_at'),
      supabase
        .from('banned_users')
        .select('user_id'),
    ]);

    // profiles table is optional — flag its absence for the UI warning
    if (profileRes.error) {
      setNoProfilesTable(true);
    }
    // banned_users table is optional — missing it just means no disabled state

    // ── Aggregate scan stats by user_id ──────────────────────────────
    const scansByUser = {};
    for (const scan of scanRes.data ?? []) {
      if (!scansByUser[scan.user_id]) {
        scansByUser[scan.user_id] = { total: 0, highRisk: 0, lastActive: null };
      }
      scansByUser[scan.user_id].total += 1;
      if (scan.risk_level === 'High') scansByUser[scan.user_id].highRisk += 1;
      if (
        !scansByUser[scan.user_id].lastActive ||
        scan.created_at > scansByUser[scan.user_id].lastActive
      ) {
        scansByUser[scan.user_id].lastActive = scan.created_at;
      }
    }

    // ── Aggregate report counts by user_id ───────────────────────────
    const reportsByUser = {};
    for (const r of reportRes.data ?? []) {
      reportsByUser[r.user_id] = (reportsByUser[r.user_id] ?? 0) + 1;
    }

    // ── Index profiles and banned set ───────────────────────────────
    const profileMap = {};
    for (const p of profileRes.data ?? []) {
      profileMap[p.id] = p;
    }
    const bannedSet = new Set((bannedRes.error ? [] : (bannedRes.data ?? [])).map((b) => b.user_id));

    // ── Union of all known user IDs ──────────────────────────────────
    const allIds = new Set([
      ...Object.keys(scansByUser),
      ...Object.keys(reportsByUser),
      ...(profileRes.data ?? []).map((p) => p.id),
    ]);

    const list = [];
    for (const uid of allIds) {
      const profile = profileMap[uid];
      const scans = scansByUser[uid] ?? { total: 0, highRisk: 0, lastActive: null };
      list.push({
        id: uid,
        email: profile?.email ?? null,
        fullName: profile?.full_name ?? null,
        role: profile?.role ?? 'user',
        createdAt: profile?.created_at ?? null,
        disabled: bannedSet.has(uid),
        scanTotal: scans.total,
        scanHighRisk: scans.highRisk,
        reportCount: reportsByUser[uid] ?? 0,
        lastActive: scans.lastActive,
      });
    }

    // Sort: most-recently active first, then by scan count
    list.sort((a, b) => {
      if (a.lastActive && b.lastActive) return b.lastActive.localeCompare(a.lastActive);
      if (a.lastActive) return -1;
      if (b.lastActive) return 1;
      return b.scanTotal - a.scanTotal;
    });

    setAllUsers(list);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    let active = true;
    if (!user) { setLoading(false); return; }

    loadUsers().finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [authLoading, user, loadUsers]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  // ── Disable / Enable a user ──────────────────────────────────────────────
  const handleToggleDisable = useCallback(
    async (targetUser) => {
      setBusyId(targetUser.id);
      setActionAlert(null);
      const willDisable = !targetUser.disabled;

      try {
        if (willDisable) {
          const { error } = await supabase.from('banned_users').upsert(
            {
              user_id: targetUser.id,
              banned_at: new Date().toISOString(),
              banned_by: user.id,
              reason: 'Manual admin action',
            },
            { onConflict: 'user_id' }
          );
          if (error) throw error;
          await logAdminAction({
            userId: user.id,
            action: 'user.disabled',
            details: { target_user_id: targetUser.id },
          });
        } else {
          const { error } = await supabase
            .from('banned_users')
            .delete()
            .eq('user_id', targetUser.id);
          if (error) throw error;
          await logAdminAction({
            userId: user.id,
            action: 'user.enabled',
            details: { target_user_id: targetUser.id },
          });
        }

        setAllUsers((prev) =>
          prev.map((u) =>
            u.id === targetUser.id ? { ...u, disabled: willDisable } : u
          )
        );
        setActionAlert({
          type: 'success',
          message: `User account ${willDisable ? 'disabled' : 're-enabled'} successfully.`,
        });
      } catch (err) {
        setActionAlert({
          type: 'error',
          message:
            err?.message ||
            `Could not ${willDisable ? 'disable' : 'enable'} user. ` +
            (willDisable ? 'Ensure the banned_users table exists in Supabase.' : err?.message || ''),

        });
      } finally {
        setBusyId(null);
        alertRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    },
    [user]
  );

  // ── Change role ────────────────────────────────────────────────────────────
  const handleChangeRole = useCallback(
    async (targetUser, newRole) => {
      if (targetUser.role === newRole) return;
      setRoleBusyId(targetUser.id);
      setActionAlert(null);
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ role: newRole })
          .eq('id', targetUser.id);
        if (error) throw error;
        await logAdminAction({
          userId: user.id,
          action: 'user.role_changed',
          details: { target_user_id: targetUser.id, from: targetUser.role, to: newRole },
        });
        setAllUsers((prev) =>
          prev.map((u) => (u.id === targetUser.id ? { ...u, role: newRole } : u))
        );
        setActionAlert({
          type: 'success',
          message: `Role updated to "${newRole}" for ${targetUser.email || targetUser.id.slice(0, 8)}.`,
        });
      } catch (err) {
        setActionAlert({
          type: 'error',
          message: err?.message || 'Could not update role. Check RLS policies on the profiles table.',
        });
      } finally {
        setRoleBusyId(null);
        alertRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    },
    [user]
  );

  // ── Derived list (search + status filter + pagination) ──────────────────
  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    return allUsers.filter((u) => {
      if (statusFilter === 'active' && u.disabled) return false;
      if (statusFilter === 'disabled' && !u.disabled) return false;
      if (!term) return true;
      return (
        u.id.toLowerCase().includes(term) ||
        (u.email ?? '').toLowerCase().includes(term) ||
        (u.fullName ?? '').toLowerCase().includes(term)
      );
    });
  }, [allUsers, search, statusFilter]);

  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);
  const pageUsers = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const counts = useMemo(() => {
    const active = allUsers.filter((u) => !u.disabled).length;
    return { total: allUsers.length, active, disabled: allUsers.length - active };
  }, [allUsers]);

  // Reset to page 0 when filter/search changes
  useEffect(() => { setPage(0); }, [search, statusFilter]);

  const formatDate = (iso) =>
    iso
      ? new Date(iso).toLocaleString('en-PH', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : '\u2014';

  if (loading) return <div className="ss-dashboard-page" aria-busy="true" />;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="ss-dashboard-page">
      <main className="ss-dashboard-main">

        {/* ── Page Header ── */}
        <div className="ss-dashboard-section">
          <div style={{ maxWidth: 1440, margin: '0 auto', padding: '0 1.5rem' }}>
            <div className="ss-dashboard-section-heading">
              <div>
                <p className="ss-dashboard-eyebrow">Admin › Users</p>
                <h2>User Management</h2>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', alignSelf: 'center', flexWrap: 'wrap' }}>
                <span style={{ alignSelf: 'center', color: 'var(--ss-dashboard-muted)', fontSize: '0.9rem' }}>
                  {counts.total} total &middot;{' '}
                  <span style={{ color: '#22c55e' }}>{counts.active} active</span>
                  {counts.disabled > 0 && (
                    <> &middot; <span style={{ color: '#ef4444' }}>{counts.disabled} disabled</span></>
                  )}
                </span>
                <button
                  type="button"
                  className="ss-dashboard-btn ss-dashboard-btn-secondary"
                  onClick={handleRefresh}
                  disabled={refreshing}
                >
                  <i className={`fas fa-rotate-right${refreshing ? ' fa-spin' : ''}`}></i>
                  {' '}Refresh
                </button>
              </div>
            </div>

            {/* Profiles-table-missing warning */}
            {noProfilesTable && (
              <div
                style={{
                  marginBottom: '1rem',
                  padding: '0.75rem 1rem',
                  borderRadius: 10,
                  background: 'rgba(234,179,8,0.1)',
                  border: '1px solid rgba(234,179,8,0.3)',
                  color: '#92400e',
                  fontSize: '0.875rem',
                  display: 'flex',
                  gap: '0.6rem',
                  alignItems: 'flex-start',
                }}
              >
                <i className="fas fa-circle-info" style={{ marginTop: 2 }}></i>
                <span>
                  No <code>profiles</code> table found — user emails and display names are unavailable.
                  Users are listed by activity from <code>scan_history</code> only.
                </span>
              </div>
            )}

            {/* Action alert */}
            <div ref={alertRef}>
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
            </div>

            {/* Search + status filter */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div className="ss-admin-search" style={{ flex: '1 1 260px', maxWidth: 400 }}>
                <i className="fas fa-search"></i>
                <input
                  type="text"
                  placeholder="Search by ID, email, or name…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {['all', 'active', 'disabled'].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setStatusFilter(f)}
                  className={`ss-dashboard-btn ${statusFilter === f ? 'ss-dashboard-btn-primary' : 'ss-dashboard-btn-secondary'}`}
                  style={{ minHeight: 36, padding: '0 1rem', fontSize: '0.83rem' }}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                  <span style={{ marginLeft: '0.35rem', opacity: 0.7, fontSize: '0.78rem' }}>
                    ({f === 'all' ? counts.total : f === 'active' ? counts.active : counts.disabled})
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="ss-dashboard-section">
          <div style={{ maxWidth: 1440, margin: '0 auto', padding: '0 1.5rem' }}>
            <div className="ss-dashboard-panel" style={{ borderRadius: 16 }}>
              {pageUsers.length === 0 ? (
                <div className="udb-empty-state" style={{ padding: '3rem' }}>
                  <i className="fas fa-users" style={{ fontSize: '2rem', marginBottom: '0.75rem' }}></i>
                  <h3>No users found</h3>
                  <p>
                    {search || statusFilter !== 'all'
                      ? 'Try a different search term or filter.'
                      : 'Users appear here once they have scan or report activity.'}
                  </p>
                </div>
              ) : (
                <div className="ss-dashboard-table-wrap">
                  <table className="ss-dashboard-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th style={{ textAlign: 'center' }}>Scans</th>
                        <th style={{ textAlign: 'center' }}>High Risk</th>
                        <th style={{ textAlign: 'center' }}>Reports</th>
                        <th>Last Active</th>
                        <th style={{ textAlign: 'center' }}>Status</th>
                        <th style={{ textAlign: 'center' }}>Role</th>
                        <th style={{ textAlign: 'right', minWidth: 160 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageUsers.map((u) => (
                        <tr key={u.id} style={{ opacity: u.disabled ? 0.6 : 1 }}>
                          {/* User identity */}
                          <td>
                            {u.email ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                <span style={{ fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                  {u.fullName || u.email.split('@')[0]}
                                  {u.role === 'admin' && (
                                    <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: 999, background: 'rgba(14,165,164,0.15)', color: '#0e9494' }}>admin</span>
                                  )}
                                </span>
                                <span style={{ fontSize: '0.775rem', color: 'var(--ss-dashboard-muted)' }}>
                                  {u.email}
                                </span>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--ss-dashboard-muted)' }}>
                                  {u.id.slice(0, 8)}&hellip;{u.id.slice(-4)}
                                </span>
                                <span style={{ fontSize: '0.72rem', color: 'var(--ss-dashboard-muted)', opacity: 0.6 }}>
                                  No profile
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Scan count */}
                          <td style={{ textAlign: 'center', fontWeight: 600 }}>
                            {u.scanTotal}
                          </td>

                          {/* High-risk scans */}
                          <td style={{ textAlign: 'center' }}>
                            {u.scanHighRisk > 0 ? (
                              <span style={{ color: '#ef4444', fontWeight: 700 }}>{u.scanHighRisk}</span>
                            ) : (
                              <span style={{ color: 'var(--ss-dashboard-muted)' }}>0</span>
                            )}
                          </td>

                          {/* User reports submitted */}
                          <td style={{ textAlign: 'center' }}>
                            {u.reportCount > 0 ? (
                              <span style={{ color: '#f97316', fontWeight: 600 }}>{u.reportCount}</span>
                            ) : (
                              <span style={{ color: 'var(--ss-dashboard-muted)' }}>0</span>
                            )}
                          </td>

                          {/* Last scan date */}
                          <td style={{ color: 'var(--ss-dashboard-muted)', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                            {formatDate(u.lastActive)}
                          </td>

                          {/* Status badge */}
                          <td style={{ textAlign: 'center' }}>
                            <span className={`ss-admin-status-badge ${u.disabled ? 'dismissed' : 'verified'}`}>
                              {u.disabled ? 'Disabled' : 'Active'}
                            </span>
                          </td>

                          {/* Role selector */}
                          <td style={{ textAlign: 'center' }}>
                            {roleBusyId === u.id ? (
                              <i className="fas fa-spinner fa-spin" style={{ color: 'var(--ss-dashboard-muted)' }}></i>
                            ) : (
                              <select
                                value={u.role}
                                onChange={(e) => handleChangeRole(u, e.target.value)}
                                disabled={u.id === user.id}
                                title={u.id === user.id ? "You can't change your own role" : 'Change role'}
                                className="ss-admin-role-select"
                                style={{
                                  border: '1px solid var(--ss-dashboard-border)',
                                  borderRadius: 8,
                                  padding: '0.3rem 0.6rem',
                                  fontSize: '0.8rem',
                                  fontWeight: 600,
                                  background: u.role === 'admin'
                                    ? 'rgba(14,165,164,0.1)'
                                    : 'var(--ss-input-bg)',
                                  color: u.role === 'admin' ? '#0e9494' : 'inherit',
                                  cursor: u.id === user.id ? 'not-allowed' : 'pointer',
                                }}
                              >
                                <option value="user">user</option>
                                <option value="admin">admin</option>
                              </select>
                            )}
                          </td>

                          {/* Disable / Enable action */}
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className="ss-dashboard-btn ss-dashboard-btn-secondary"
                              style={
                                u.disabled
                                  ? undefined
                                  : { color: '#dc2626', borderColor: 'rgba(220,38,38,0.35)' }
                              }
                              onClick={() => handleToggleDisable(u)}
                              disabled={busyId === u.id || u.id === user.id}
                              title={
                                u.id === user.id
                                  ? "You can't disable your own account"
                                  : u.disabled
                                  ? 'Re-enable this account'
                                  : 'Disable this account'
                              }
                            >
                              {busyId === u.id ? (
                                <i className="fas fa-spinner fa-spin"></i>
                              ) : u.disabled ? (
                                <><i className="fas fa-user-check"></i> Enable</>
                              ) : (
                                <><i className="fas fa-user-slash"></i> Disable</>
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pagination */}
            {pageCount > 1 && (
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
                  Page {page + 1} of {pageCount}
                </span>
                <button
                  type="button"
                  className="ss-dashboard-btn ss-dashboard-btn-secondary"
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                  disabled={page >= pageCount - 1}
                >
                  Next <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default AdminUsers;
