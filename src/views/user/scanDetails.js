import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../context/AuthContext';
import ReportListingModal from '../../components/ReportListingModal';
import '../../styles/dashboard.css';

function ScanDetailsPage() {
  const { id } = useParams();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [scan, setScan] = useState(null);
  const [scanLoading, setScanLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    if (!user || !id) return;
    let active = true;
    setScanLoading(true);

    let query = supabase
      .from('scan_history')
      .select('*')
      .eq('id', id);

    if (!isAdmin) {
      query = query.eq('user_id', user.id);
    }

    query.maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        if (!data) { setNotFound(true); }
        else { setScan(data); }
        setScanLoading(false);
      });

    return () => { active = false; };
  }, [user, id, isAdmin]);

  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-PH', {
      weekday: 'long', month: 'long', day: 'numeric',
      year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const riskClass = (level) => {
    if (!level) return 'ss-dashboard-risk-low';
    const l = level.toLowerCase();
    if (l === 'high') return 'ss-dashboard-risk-high';
    if (l === 'medium') return 'ss-dashboard-risk-medium';
    return 'ss-dashboard-risk-low';
  };

  const truncateUrl = (url, maxLength = 110) => {
    if (!url) return '—';
    return url.length > maxLength ? `${url.slice(0, maxLength)}...` : url;
  };

  if (!authLoading && !user) return <Navigate to="/login" replace />;
  if (authLoading) return <div className="ss-dashboard-page" aria-busy="true" />;

  return (
    <div className="ss-dashboard-page">
      <main className="ss-dashboard-main">

        {/* Page title */}
        <div className="ss-dashboard-section">
          <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 1.5rem" }}>
            <div className="ss-dashboard-section-heading">
              <div>
                <p className="ss-dashboard-eyebrow">Report</p>
                <h2>Scan Details</h2>
              </div>
            </div>
          </div>
        </div>

        {scanLoading ? (
          <div className="ss-dashboard-section">
            <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 1.5rem" }}>
              <div className="ss-dashboard-panel">
                <div className="udb-empty-state">
                  <i className="fas fa-spinner fa-spin"></i>
                  <h3>Loading scan report...</h3>
                </div>
              </div>
            </div>
          </div>
        ) : notFound ? (
          <div className="ss-dashboard-section">
            <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 1.5rem" }}>
              <div className="ss-dashboard-panel">
                <div className="udb-empty-state">
                  <i className="fas fa-search"></i>
                  <h3>Scan not found</h3>
                  <p>This scan doesn't exist or you don't have permission to view it.</p>
                  <div style={{ marginTop: '1rem' }}>
                    <Link to="/scan-history" className="ss-dashboard-btn ss-dashboard-btn-secondary">
                      <i className="fas fa-history"></i> Back to History
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Risk summary */}
            <div className="ss-dashboard-section">
              <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 1.5rem" }}>
                <div className="ss-dashboard-section-heading">
                  <div>
                    <p className="ss-dashboard-eyebrow">Risk</p>
                    <h2>Risk Summary</h2>
                  </div>
                  <span className={`ss-dashboard-risk ${riskClass(scan.risk_level)}`} style={{ fontSize: '0.9rem', padding: '6px 18px', alignSelf: 'center' }}>
                    {scan.risk_level || 'Unknown'} Risk
                  </span>
                </div>
                <div className="ss-dashboard-panel">
                  <p style={{ margin: '0 0 1.1rem', fontWeight: 600, color: 'var(--ss-dashboard-text)' }}>
                    {scan.product_name ? (
                      scan.product_name
                    ) : scan.url ? (
                      <a
                        href={scan.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={scan.url}
                        style={{ color: 'inherit', textDecoration: 'underline', wordBreak: 'break-word' }}
                      >
                        {truncateUrl(scan.url)}
                      </a>
                    ) : (
                      'Scan #' + id
                    )}
                  </p>

                  {scan.risk_score != null && (
                    <div style={{ marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--ss-dashboard-muted)', marginBottom: 6 }}>
                        <span>Risk Score</span>
                        <strong style={{ color: 'var(--ss-dashboard-text)' }}>{scan.risk_score}%</strong>
                      </div>
                      <div className="ss-dashboard-meter">
                        <span style={{ width: `${scan.risk_score}%` }} />
                      </div>
                    </div>
                  )}

                  <div className="udb-detail-grid">
                    <div className="udb-detail-item">
                      <label>Scan Mode</label>
                      <span>{scan.scan_mode ? scan.scan_mode.charAt(0).toUpperCase() + scan.scan_mode.slice(1) : '—'}</span>
                    </div>
                    <div className="udb-detail-item">
                      <label>Scanned On</label>
                      <span style={{ fontSize: '0.85rem' }}>{formatDate(scan.created_at)}</span>
                    </div>
                    {scan.url && (
                      <div className="udb-detail-item" style={{ gridColumn: '1 / -1' }}>
                        <label>URL</label>
                        <a
                          href={scan.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={scan.url}
                          style={{
                            display: 'inline-block',
                            maxWidth: '100%',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontSize: '0.85rem',
                            color: 'var(--ss-dashboard-text)',
                            textDecoration: 'underline',
                          }}
                        >
                          {truncateUrl(scan.url, 140)}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Analysis details */}
            {(scan.notes || scan.flags || scan.confidence_pct != null) && (
              <div className="ss-dashboard-section">
                <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 1.5rem" }}>
                  <div className="ss-dashboard-section-heading">
                    <div>
                      <p className="ss-dashboard-eyebrow">Analysis</p>
                      <h2>Analysis Details</h2>
                    </div>
                  </div>
                  <div className="ss-dashboard-panel">
                    {scan.confidence_pct != null && (
                      <div style={{ marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--ss-dashboard-muted)', marginBottom: 6 }}>
                          <span>Confidence</span>
                          <strong style={{ color: 'var(--ss-dashboard-text)' }}>{scan.confidence_pct}%</strong>
                        </div>
                        <div className="ss-dashboard-meter">
                          <span style={{ width: `${scan.confidence_pct}%`, background: 'var(--ss-dashboard-blue)' }} />
                        </div>
                      </div>
                    )}

                    {/* AI-generated insight */}
                    {scan.notes && (
                      <div style={{ background: 'rgba(14,165,164,0.06)', border: '1px solid rgba(14,165,164,0.18)', borderRadius: 14, padding: '1rem', marginBottom: '1.25rem' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--ss-dashboard-teal-dark)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' }}>
                          {scan.raw_data?.risk_message_source === 'groq' ? '✦ AI Analysis' : 'Analysis Summary'}
                        </label>
                        <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.7 }}>{scan.notes}</p>
                      </div>
                    )}

                    {/* Comments analysis — deep scan only */}
                    {scan.raw_data?.comments_summary && (() => {
                      const cs = scan.raw_data.comments_summary;
                      const sentiment = (cs.dominant_sentiment || '').toLowerCase();
                      const sentimentColor = sentiment === 'positive' ? '#16a34a' : sentiment === 'negative' ? '#dc2626' : '#ca8a04';
                      const sentimentIcon = sentiment === 'positive' ? 'fa-thumbs-up' : sentiment === 'negative' ? 'fa-thumbs-down' : 'fa-minus';
                      return (
                        <div style={{ marginBottom: '1.25rem' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--ss-dashboard-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.6rem' }}>
                            Review Analysis
                          </label>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.5rem' }}>
                            {cs.analyzed != null && (
                              <div style={{ background: 'var(--ss-dashboard-panel-bg)', border: '1px solid var(--ss-dashboard-border)', borderRadius: 12, padding: '0.65rem 0.9rem', textAlign: 'center' }}>
                                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--ss-dashboard-text)' }}>{cs.analyzed}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--ss-dashboard-muted)', marginTop: 2 }}>Reviews Checked</div>
                              </div>
                            )}
                            {cs.fake_review_pct != null && (
                              <div style={{ background: cs.fake_review_pct > 40 ? 'rgba(220,38,38,0.07)' : 'var(--ss-dashboard-panel-bg)', border: `1px solid ${cs.fake_review_pct > 40 ? 'rgba(220,38,38,0.2)' : 'var(--ss-dashboard-border)'}`, borderRadius: 12, padding: '0.65rem 0.9rem', textAlign: 'center' }}>
                                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: cs.fake_review_pct > 40 ? '#dc2626' : 'var(--ss-dashboard-text)' }}>{cs.fake_review_pct}%</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--ss-dashboard-muted)', marginTop: 2 }}>Suspicious Reviews</div>
                              </div>
                            )}
                            {cs.bot_likelihood_pct != null && (
                              <div style={{ background: cs.bot_likelihood_pct > 50 ? 'rgba(234,88,12,0.07)' : 'var(--ss-dashboard-panel-bg)', border: `1px solid ${cs.bot_likelihood_pct > 50 ? 'rgba(234,88,12,0.2)' : 'var(--ss-dashboard-border)'}`, borderRadius: 12, padding: '0.65rem 0.9rem', textAlign: 'center' }}>
                                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: cs.bot_likelihood_pct > 50 ? '#ea580c' : 'var(--ss-dashboard-text)' }}>{cs.bot_likelihood_pct}%</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--ss-dashboard-muted)', marginTop: 2 }}>Automated Activity</div>
                              </div>
                            )}
                            {cs.dominant_sentiment && (
                              <div style={{ background: 'var(--ss-dashboard-panel-bg)', border: '1px solid var(--ss-dashboard-border)', borderRadius: 12, padding: '0.65rem 0.9rem', textAlign: 'center' }}>
                                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: sentimentColor }}><i className={`fas ${sentimentIcon}`} style={{ fontSize: '1rem' }} /></div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--ss-dashboard-muted)', marginTop: 2, textTransform: 'capitalize' }}>{cs.dominant_sentiment} Sentiment</div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Enriched risk flags with tips */}
                    {scan.flags && Array.isArray(scan.flags) && scan.flags.length > 0 && (() => {
                      const flagDetails = scan.raw_data?.flag_details;
                      const severityStyle = (sev) => {
                        if (sev === 'high') return { bg: 'rgba(220,38,38,0.08)', border: 'rgba(220,38,38,0.22)', badge: { background: 'rgba(220,38,38,0.12)', color: '#b91c1c' }, icon: 'fa-circle-exclamation', iconColor: '#dc2626' };
                        if (sev === 'medium') return { bg: 'rgba(234,88,12,0.07)', border: 'rgba(234,88,12,0.2)', badge: { background: 'rgba(234,88,12,0.12)', color: '#9a3412' }, icon: 'fa-exclamation-triangle', iconColor: '#ea580c' };
                        return { bg: 'rgba(202,138,4,0.07)', border: 'rgba(202,138,4,0.2)', badge: { background: 'rgba(202,138,4,0.12)', color: '#854d0e' }, icon: 'fa-circle-info', iconColor: '#ca8a04' };
                      };
                      return (
                        <div style={{ marginBottom: '1.25rem' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--ss-dashboard-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.75rem' }}>
                            Risk Flags ({scan.flags.length})
                          </label>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            {flagDetails
                              ? flagDetails.map((fd, i) => {
                                  const s = severityStyle(fd.severity);
                                  return (
                                    <div key={i} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 12, padding: '0.85rem 1rem' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: fd.tip ? '0.4rem' : 0 }}>
                                        <i className={`fas ${s.icon}`} style={{ color: s.iconColor, flexShrink: 0, fontSize: '0.9rem' }} />
                                        <span style={{ fontWeight: 700, fontSize: '0.875rem', flex: 1 }}>{fd.label}</span>
                                        <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', borderRadius: 999, padding: '2px 8px', ...s.badge }}>{fd.severity}</span>
                                      </div>
                                      {fd.tip && <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--ss-dashboard-muted)', lineHeight: 1.55, paddingLeft: '1.4rem' }}>{fd.tip}</p>}
                                      {fd.triggered_by && <p style={{ margin: '0.3rem 0 0 1.4rem', fontSize: '0.78rem', color: 'var(--ss-dashboard-muted)', fontStyle: 'italic' }}>Detected: "{fd.triggered_by}"</p>}
                                    </div>
                                  );
                                })
                              : scan.flags.map((flag, i) => {
                                  const s = severityStyle('medium');
                                  return (
                                    <div key={i} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 12, padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                      <i className={`fas ${s.icon}`} style={{ color: s.iconColor, flexShrink: 0 }} />
                                      <span style={{ fontSize: '0.875rem' }}>{typeof flag === 'string' ? flag : JSON.stringify(flag)}</span>
                                    </div>
                                  );
                                })
                            }
                          </div>
                        </div>
                      );
                    })()}

                    {/* Positive trust signals */}
                    {scan.raw_data?.positive_signals?.length > 0 && (
                      <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--ss-dashboard-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.75rem' }}>
                          Trust Signals
                        </label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {scan.raw_data.positive_signals.map((sig, i) => (
                            <div key={i} style={{ background: 'rgba(22,163,74,0.07)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 12, padding: '0.75rem 1rem', display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                              <i className="fas fa-circle-check" style={{ color: '#16a34a', marginTop: 2, flexShrink: 0 }} />
                              <div>
                                <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>{sig.message}</p>
                                {sig.impact && <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'var(--ss-dashboard-muted)' }}>{sig.impact}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommendations */}
                    {scan.raw_data?.recommendations?.length > 0 && (
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--ss-dashboard-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.75rem' }}>
                          What to check before buying
                        </label>
                        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                          {scan.raw_data.recommendations.map((rec, i) => (
                            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.875rem' }}>
                              <i className="fas fa-arrow-right" style={{ color: 'var(--ss-dashboard-blue)', marginTop: 3, flexShrink: 0, fontSize: '0.75rem' }} />
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Nav */}
        <div className="ss-dashboard-section">
          <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 1.5rem" }}>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <Link to="/scan-history" className="ss-dashboard-btn ss-dashboard-btn-secondary">
                <i className="fas fa-arrow-left"></i> Back to History
              </Link>
              <Link to="/userdashboard" className="ss-dashboard-btn ss-dashboard-btn-secondary">
                <i className="fas fa-tachometer-alt"></i> Dashboard
              </Link>
              <Link to="/scan" className="ss-dashboard-btn ss-dashboard-btn-primary">
                <i className="fas fa-search"></i> New Scan
              </Link>
              {scan?.url && (
                <button
                  type="button"
                  onClick={() => setReportOpen(true)}
                  className="ss-dashboard-btn ss-dashboard-btn-secondary"
                  style={{ borderColor: '#fecaca', color: '#dc2626' }}
                >
                  <i className="fas fa-flag"></i> Report this listing
                </button>
              )}
            </div>
          </div>
        </div>

        <ReportListingModal
          open={reportOpen}
          onClose={() => setReportOpen(false)}
          userId={user?.id}
          listingUrl={scan?.url}
          defaultType={scan?.risk_level === 'High' ? 'scam' : 'misleading'}
        />

      </main>
    </div>
  );
}

export default ScanDetailsPage;
