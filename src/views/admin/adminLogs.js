
import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../context/AuthContext';

import AdminSubNav, { TRAINING_TABS } from '../../components/AdminSubNav';
import '../../styles/dashboard.css';

function AdminLogs() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [nlpFeed, setNlpFeed] = useState([]);
  const [errorLogs, setErrorLogs] = useState([]);
  const [noErrorTable, setNoErrorTable] = useState(false);
  const [actionFilter, setActionFilter] = useState('all');

  const loadData = useCallback(async () => {
    let logsQuery = supabase
      .from('admin_logs')
      .select('id, user_id, action, details, created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    if (actionFilter !== 'all') {
      logsQuery = logsQuery.eq('action', actionFilter);
    }

    const [nlpRes, errRes] = await Promise.all([
      supabase
        .from('scan_history')
        .select('id, url, platform, scan_mode, flags, risk_level, risk_score, confidence_pct, created_at')
        .order('created_at', { ascending: false })
        .limit(20),
      logsQuery,
    ]);

    setNlpFeed(nlpRes.data ?? []);

    if (errRes.error) {
      setNoErrorTable(true);
      setErrorLogs([]);
    } else {
      setNoErrorTable(false);
      setErrorLogs(errRes.data ?? []);
    }
  }, [actionFilter]);

  useEffect(() => {
    if (authLoading) return;
    let active = true;

    if (!user) { setLoading(false); return undefined; }

    loadData().finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [authLoading, user, loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
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

  if (loading) return <div className="ss-dashboard-page" aria-busy="true" />;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="ss-dashboard-page">
      <main className="ss-dashboard-main">

        <AdminSubNav eyebrow="Admin › Training" tabs={TRAINING_TABS} />

        {/* Header */}
        <div className="ss-dashboard-section">
          <div style={{ maxWidth: 1440, margin: '0 auto', padding: '0 1.5rem' }}>
            <div className="ss-dashboard-section-heading">
              <div>
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
          <div style={{ maxWidth: 1440, margin: '0 auto', padding: '0 1.5rem' }}>
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
                  <h3>No scan output recorded</h3>
                  <p>Recent scans with detected risk signals will appear here.</p>
                </div>
              ) : (
                <div>
                  {nlpFeed.map((entry) => {
                    const flagsArr = Array.isArray(entry.flags) ? entry.flags : [];
                    const summary = flagsArr.length
                      ? `Detected ${flagsArr.length} risk signal${flagsArr.length === 1 ? '' : 's'}.`
                      : 'No high-risk signals detected.';
                    return (
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
                              {entry.url || entry.platform || entry.scan_mode || 'Unnamed Scan'}
                            </strong>
                            <span style={{ fontSize: '0.76rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                              {formatDate(entry.created_at)}
                            </span>
                          </div>
                          <p style={{ fontSize: '0.83rem', color: 'var(--ss-dashboard-muted)', margin: 0, lineHeight: 1.5 }}>
                            {summary}
                          </p>
                          {flagsArr.length > 0 && (
                            <p style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '0.3rem', fontFamily: 'monospace' }}>
                              Flags: {flagsArr.join(', ')}
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
                            {entry.confidence_pct != null && (
                              <span style={{ fontSize: '0.76rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                                Confidence: {entry.confidence_pct}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Admin action log */}
        <div className="ss-dashboard-section" style={{ paddingTop: 0 }}>
          <div style={{ maxWidth: 1440, margin: '0 auto', padding: '0 1.5rem' }}>
            <div className="ss-dashboard-section-heading">
              <div>
                <p className="ss-dashboard-eyebrow">Audit</p>
                <h3 style={{ color: 'var(--ss-dashboard-text)', fontFamily: 'var(--font-display)' }}>
                  Admin Action Log
                </h3>
              </div>
              {!noErrorTable && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <select
                    value={actionFilter}
                    onChange={(e) => setActionFilter(e.target.value)}
                    className="udb-form-input"
                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', height: 'auto' }}
                    aria-label="Filter by action"
                  >
                    <option value="all">All actions</option>
                    <option value="report.verified">Report verified</option>
                    <option value="report.dismissed">Report dismissed</option>
                    <option value="blacklist.added">Blacklist added</option>
                  </select>
                  <span className="ss-dashboard-panel-pill">{errorLogs.length} entries</span>
                </div>
              )}
            </div>
            <div className="ss-dashboard-panel">
              {noErrorTable ? (
                <div className="udb-empty-state">
                  <i className="fas fa-table" style={{ fontSize: '2rem', marginBottom: '0.75rem' }}></i>
                  <h3>admin_logs table not found</h3>
                  <p>
                    Create an <code>admin_logs</code> table with columns{' '}
                    <code>id, user_id, action, details, created_at</code> to enable audit logging.
                  </p>
                </div>
              ) : errorLogs.length === 0 ? (
                <div className="udb-empty-state">
                  <i className="fas fa-circle-check" style={{ fontSize: '2rem', marginBottom: '0.75rem', color: '#22c55e' }}></i>
                  <h3>No admin actions logged</h3>
                  <p>Administrative actions will appear here when performed.</p>
                </div>
              ) : (
                <div>
                  {errorLogs.map((log) => {
                    const detailsText =
                      log.details && typeof log.details === 'object'
                        ? JSON.stringify(log.details)
                        : (log.details ?? '');
                    return (
                      <div key={log.id} className="ss-admin-log-entry">
                        <span
                          className="ss-admin-log-icon"
                          style={{ background: 'rgba(37,99,235,0.12)', color: '#2563eb' }}
                        >
                          <i className="fas fa-clipboard-list"></i>
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                            <strong style={{ fontSize: '0.85rem', color: '#2563eb' }}>
                              {log.action?.toUpperCase() || 'ACTION'}
                            </strong>
                            <span style={{ fontSize: '0.76rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                              {formatDate(log.created_at)}
                            </span>
                          </div>
                          {detailsText && (
                            <p style={{ fontSize: '0.84rem', color: 'var(--ss-dashboard-muted)', margin: 0, lineHeight: 1.5, fontFamily: 'monospace', wordBreak: 'break-word' }}>
                              {detailsText}
                            </p>
                          )}
                          {log.user_id && (
                            <p style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '0.25rem', fontFamily: 'monospace' }}>
                              by {log.user_id.slice(0, 8)}…
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}

export default AdminLogs;
