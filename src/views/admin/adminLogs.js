
import { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import { logoutUser } from '../../services/authService';
import AdminHeader from '../../components/AdminHeader';
import DashboardFooter from '../../components/DashboardFooter';
import '../../styles/dashboard.css';

function AdminLogs() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [nlpFeed, setNlpFeed] = useState([]);
  const [errorLogs, setErrorLogs] = useState([]);
  const [noErrorTable, setNoErrorTable] = useState(false);

  const loadData = useCallback(async () => {
    const [nlpRes, errRes] = await Promise.all([
      supabase
        .from('scans')
        .select('id, product_name, scan_type, notes, flags, risk_level, risk_score, created_at')
        .not('notes', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('system_logs')
        .select('id, type, message, created_at')
        .eq('type', 'error')
        .order('created_at', { ascending: false })
        .limit(30),
    ]);

    setNlpFeed(nlpRes.data ?? []);

    if (errRes.error) {
      setNoErrorTable(true);
      setErrorLogs([]);
    } else {
      setNoErrorTable(false);
      setErrorLogs(errRes.data ?? []);
    }
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(({ data: authData }) => {
      if (!active) return;
      const u = authData?.user ?? null;
      setUser(u);

      if (!u) { setLoading(false); return; }

      loadData().finally(() => { if (active) setLoading(false); });
    });

    return () => { active = false; };
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    setLogoutBusy(true);
    await logoutUser();
    navigate('/login');
  };

  const formatDate = (iso) =>
    iso
      ? new Date(iso).toLocaleString('en-PH', {
          month: 'short', day: 'numeric',
          hour: '2-digit', minute: '2-digit', second: '2-digit',
        })
      : '\u2014';

  const riskColor = (level) => {
    if (!level) return '#94a3b8';
    const l = level.toLowerCase();
    if (l === 'high') return '#ef4444';
    if (l === 'medium') return '#f97316';
    return '#22c55e';
  };

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="ss-dashboard-page">
      <AdminHeader user={user} onLogout={handleLogout} logoutBusy={logoutBusy} />

      <main className="ss-dashboard-main">

        {/* Header */}
        <div className="ss-dashboard-section">
          <div className="container">
            <div className="ss-dashboard-section-heading">
              <div>
                <p className="ss-dashboard-eyebrow">Admin &rsaquo; Monitoring</p>
                <h2>System &amp; AI Logs</h2>
              </div>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="ss-dashboard-btn ss-dashboard-btn-secondary"
                style={{ alignSelf: 'center', minHeight: 40 }}
              >
                <i className={`fas fa-rotate${refreshing ? ' fa-spin' : ''}`} style={{ marginRight: '0.4rem' }}></i>
                {refreshing ? 'Refreshing\u2026' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        {/* NLP / AI Performance Feed */}
        <div className="ss-dashboard-section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="ss-dashboard-section-heading">
              <div>
                <p className="ss-dashboard-eyebrow">AI Output</p>
                <h3 style={{ color: 'var(--ss-dashboard-text)', fontFamily: 'var(--font-display)' }}>
                  NLP Performance Feed
                </h3>
              </div>
              <span className="ss-dashboard-panel-pill">{nlpFeed.length} entries</span>
            </div>
            <div className="ss-dashboard-panel">
              {nlpFeed.length === 0 ? (
                <div className="udb-empty-state">
                  <i className="fas fa-brain" style={{ fontSize: '2rem', marginBottom: '0.75rem' }}></i>
                  <h3>No NLP output recorded</h3>
                  <p>Scans with AI analysis notes will appear here. Ensure the <code>notes</code> column is populated.</p>
                </div>
              ) : (
                <div>
                  {nlpFeed.map((entry) => (
                    <div key={entry.id} className="ss-admin-log-entry">
                      <span
                        className="ss-admin-log-icon"
                        style={{ background: `${riskColor(entry.risk_level)}22`, color: riskColor(entry.risk_level) }}
                      >
                        <i className="fas fa-microchip"></i>
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                          <strong style={{ fontSize: '0.88rem', color: 'var(--ss-dashboard-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {entry.product_name || entry.scan_type || 'Unnamed Scan'}
                          </strong>
                          <span style={{ fontSize: '0.76rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                            {formatDate(entry.created_at)}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.83rem', color: 'var(--ss-dashboard-muted)', margin: 0, lineHeight: 1.5 }}>
                          {entry.notes}
                        </p>
                        {entry.flags && (
                          <p style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '0.3rem', fontFamily: 'monospace' }}>
                            Flags: {entry.flags}
                          </p>
                        )}
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                          <span
                            style={{
                              fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.55rem',
                              borderRadius: 999, background: `${riskColor(entry.risk_level)}20`,
                              color: riskColor(entry.risk_level),
                            }}
                          >
                            {entry.risk_level || 'Unknown'}
                          </span>
                          {entry.risk_score != null && (
                            <span style={{ fontSize: '0.76rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                              Score: {entry.risk_score}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scraper / System Error Logs */}
        <div className="ss-dashboard-section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="ss-dashboard-section-heading">
              <div>
                <p className="ss-dashboard-eyebrow">Errors</p>
                <h3 style={{ color: 'var(--ss-dashboard-text)', fontFamily: 'var(--font-display)' }}>
                  Scraper &amp; System Error Logs
                </h3>
              </div>
              {!noErrorTable && (
                <span className="ss-dashboard-panel-pill">{errorLogs.length} errors</span>
              )}
            </div>
            <div className="ss-dashboard-panel">
              {noErrorTable ? (
                <div className="udb-empty-state">
                  <i className="fas fa-table" style={{ fontSize: '2rem', marginBottom: '0.75rem' }}></i>
                  <h3>system_logs table not found</h3>
                  <p>
                    Create a <code>system_logs</code> table with columns{' '}
                    <code>id, type, message, created_at</code> to enable error tracking.
                  </p>
                </div>
              ) : errorLogs.length === 0 ? (
                <div className="udb-empty-state">
                  <i className="fas fa-circle-check" style={{ fontSize: '2rem', marginBottom: '0.75rem', color: '#22c55e' }}></i>
                  <h3>No errors logged</h3>
                  <p>All systems operational. Error events will appear here when detected.</p>
                </div>
              ) : (
                <div>
                  {errorLogs.map((log) => (
                    <div key={log.id} className="ss-admin-log-entry">
                      <span
                        className="ss-admin-log-icon"
                        style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}
                      >
                        <i className="fas fa-triangle-exclamation"></i>
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                          <strong style={{ fontSize: '0.85rem', color: '#ef4444' }}>
                            {log.type?.toUpperCase() || 'ERROR'}
                          </strong>
                          <span style={{ fontSize: '0.76rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                            {formatDate(log.created_at)}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.84rem', color: 'var(--ss-dashboard-muted)', margin: 0, lineHeight: 1.5 }}>
                          {log.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </main>

      <DashboardFooter />
    </div>
  );
}

export default AdminLogs;
