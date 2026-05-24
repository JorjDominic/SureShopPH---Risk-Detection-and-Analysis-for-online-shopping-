import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../config/supabase';
import '../../styles/dashboard.css';

// ─── Toggle Switch ────────────────────────────────────────────────────────────
function Toggle({ id, checked, onChange, disabled = false, colorOn = '#0ea5a4' }) {
  return (
    <label
      htmlFor={id}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        userSelect: 'none',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span style={{ position: 'relative', width: 48, height: 26, flexShrink: 0 }}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
        />
        <span
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            borderRadius: 999,
            background: checked ? colorOn : 'rgba(148,163,184,0.35)',
            transition: 'background 0.22s ease',
            boxShadow: checked ? `0 0 0 3px ${colorOn}22` : 'none',
          }}
        />
        <span
          style={{
            position: 'absolute',
            top: 3,
            left: checked ? 'calc(100% - 23px)' : 3,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
            transition: 'left 0.22s ease',
          }}
        />
      </span>
    </label>
  );
}

// ─── Flag Row ─────────────────────────────────────────────────────────────────
function FlagRow({ id, icon, label, description, checked, onChange, danger = false }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.5rem',
        padding: '1rem 0',
        borderBottom: '1px solid var(--ss-dashboard-border)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.9rem', flex: 1, minWidth: 0 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            background: danger
              ? 'rgba(220,38,38,0.1)'
              : 'rgba(14,165,164,0.1)',
            color: danger ? '#dc2626' : '#0f766e',
            fontSize: '1rem',
          }}
        >
          <i className={`fas ${icon}`} />
        </div>
        <div>
          <div style={{ fontWeight: 700, color: 'var(--ss-dashboard-text)', fontSize: '0.93rem', marginBottom: '0.2rem' }}>
            {label}
            {checked && danger && (
              <span
                style={{
                  marginLeft: '0.55rem',
                  padding: '0.22rem 0.55rem',
                  borderRadius: 999,
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  background: 'rgba(220,38,38,0.12)',
                  color: '#dc2626',
                }}
              >
                Active
              </span>
            )}
          </div>
          <p style={{ color: 'var(--ss-dashboard-muted)', fontSize: '0.82rem', margin: 0, lineHeight: 1.45 }}>
            {description}
          </p>
        </div>
      </div>
      <Toggle
        id={id}
        checked={checked}
        onChange={onChange}
        colorOn={danger ? '#dc2626' : '#0ea5a4'}
      />
    </div>
  );
}

// ─── Status Card ──────────────────────────────────────────────────────────────
function StatusCard({ icon, label, value, tone }) {
  const tones = {
    green:  { bg: 'rgba(34,197,94,0.1)',  color: '#16a34a', iconBg: 'linear-gradient(135deg,#22c55e,#16a34a)' },
    red:    { bg: 'rgba(220,38,38,0.1)',  color: '#dc2626', iconBg: 'linear-gradient(135deg,#ef4444,#dc2626)' },
    orange: { bg: 'rgba(249,115,22,0.1)', color: '#c2410c', iconBg: 'linear-gradient(135deg,#f97316,#ea580c)' },
    teal:   { bg: 'rgba(14,165,164,0.1)', color: '#0f766e', iconBg: 'linear-gradient(135deg,#0ea5a4,#2563eb)' },
    muted:  { bg: 'rgba(148,163,184,0.1)',color: '#64748b', iconBg: 'linear-gradient(135deg,#94a3b8,#64748b)' },
  };
  const t = tones[tone] || tones.muted;

  return (
    <div
      className="ss-dashboard-stat-card"
      style={{ borderRadius: 24, padding: '1.25rem', background: t.bg, border: '1px solid transparent' }}
    >
      <div className="ss-dashboard-stat-top">
        <div>
          <p style={{ margin: 0, marginBottom: '0.35rem', color: '#64748b', textTransform: 'uppercase', fontSize: '0.74rem', letterSpacing: '0.06em', fontFamily: 'var(--font-accent)', fontWeight: 800 }}>
            {label}
          </p>
          <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', color: t.color, margin: 0 }}>
            {value}
          </h3>
        </div>
        <div
          className="ss-dashboard-stat-icon"
          style={{ width: 44, height: 44, borderRadius: 14, background: t.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1rem' }}
        >
          <i className={`fas ${icon}`} />
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
function AdminControls() {
  const { user, loading: authLoading } = useAuth();
  const [loading] = useState(false);

  // ── Feature Flags ─────────────────────────────────────────────────────────
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [scannerEnabled, setScannerEnabled] = useState(true);
  const [registrationsOpen, setRegistrationsOpen] = useState(true);
  const [readOnlyMode, setReadOnlyMode] = useState(false);
  const [flagError, setFlagError] = useState('');

  // ── Announcement Banner ───────────────────────────────────────────────────
  const [bannerEnabled, setBannerEnabled] = useState(false);
  const [bannerType, setBannerType] = useState('info'); // 'info' | 'warning' | 'critical'
  const [bannerMessage, setBannerMessage] = useState('');
  const [bannerDismissible, setBannerDismissible] = useState(true);
  const [bannerSaved, setBannerSaved] = useState(false);

  // ── Email Broadcast ───────────────────────────────────────────────────────
  const [emailTarget, setEmailTarget] = useState('all');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailConfirm, setEmailConfirm] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailSending, setEmailSending] = useState(false);

  // ── Scheduled Maintenance ─────────────────────────────────────────────────
  const [scheduleStart, setScheduleStart] = useState('');
  const [scheduleEnd, setScheduleEnd] = useState('');
  const [scheduleNotify, setScheduleNotify] = useState(true);
  const [schedEnabled, setSchedEnabled] = useState(false);

  // ── Load config from Supabase ─────────────────────────────────────────────
  useEffect(() => {
    supabase.from('system_config').select('key, value').then(({ data }) => {
      data?.forEach(({ key, value }) => {
        if (key === 'maintenance_mode') setMaintenanceMode(value.enabled ?? false);
        if (key === 'scanner_enabled') setScannerEnabled(value.enabled ?? true);
        if (key === 'registrations_open') setRegistrationsOpen(value.open ?? true);
        if (key === 'read_only_mode') setReadOnlyMode(value.enabled ?? false);
        if (key === 'announcement') {
          setBannerEnabled(value.enabled ?? false);
          setBannerType(value.type ?? 'info');
          setBannerMessage(value.message ?? '');
          setBannerDismissible(value.dismissible ?? true);
        }
        if (key === 'scheduled_maintenance') {
          setScheduleStart(value.start ?? '');
          setScheduleEnd(value.end ?? '');
          setScheduleNotify(value.notify ?? true);
        }
      });
    });
  }, []);

  if (authLoading || loading) return <div className="ss-dashboard-page" aria-busy="true" />;
  if (!user) return <Navigate to="/login" replace />;

  // ── Derived status ────────────────────────────────────────────────────────
  const systemStatus = maintenanceMode ? { label: 'Maintenance', tone: 'orange' } : { label: 'Operational', tone: 'green' };
  const scannerStatus = scannerEnabled ? { label: 'Enabled', tone: 'green' } : { label: 'Disabled', tone: 'red' };
  const registrationStatus = registrationsOpen ? { label: 'Open', tone: 'green' } : { label: 'Closed', tone: 'red' };
  const announcementStatus = bannerEnabled && bannerMessage.trim() ? { label: 'Active', tone: 'orange' } : { label: 'None', tone: 'muted' };

  // ── Banner preview styles ─────────────────────────────────────────────────
  const bannerPreviewStyles = {
    info:     { bg: 'rgba(37,99,235,0.1)',   border: 'rgba(37,99,235,0.3)',   color: '#1e40af', icon: 'fa-circle-info' },
    warning:  { bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.35)', color: '#c2410c', icon: 'fa-triangle-exclamation' },
    critical: { bg: 'rgba(220,38,38,0.1)',   border: 'rgba(220,38,38,0.3)',   color: '#dc2626', icon: 'fa-circle-exclamation' },
  };
  const bps = bannerPreviewStyles[bannerType];

  const handleSendNotification = async (e) => {
    e.preventDefault();
    setEmailError('');
    setEmailSending(true);

    // Save in-app banner to Supabase
    const { error: bannerError } = await supabase.from('system_config').upsert({
      key: 'announcement',
      value: { enabled: bannerEnabled, type: bannerType, message: bannerMessage, dismissible: bannerDismissible },
    }, { onConflict: 'key' });
    if (bannerError) {
      setEmailError(`Failed to save banner: ${bannerError.message}`);
      setEmailSending(false);
      return;
    }

    // Save schedule if set
    if (schedEnabled && scheduleStart) {
      await supabase.from('system_config').upsert({
        key: 'scheduled_maintenance',
        value: { start: scheduleStart, end: scheduleEnd, message: bannerMessage, notify: scheduleNotify },
      }, { onConflict: 'key' });
    }

    // Fire email via Edge Function if email channel is on and confirmed
    if (scheduleNotify && emailConfirm) {
      if (!emailSubject.trim() || !emailBody.trim()) {
        setEmailError('Email subject and message body are required.');
        setEmailSending(false);
        return;
      }
      const htmlBody = `<p style="font-family:sans-serif;font-size:15px;line-height:1.6;color:#1e293b">${emailBody.replace(/\n/g, '<br/>')}</p>`;
      const { data: fnData, error: fnError } = await supabase.functions.invoke('send-notification', {
        body: { target: emailTarget, subject: emailSubject.trim(), html: htmlBody },
      });
      if (fnError) {
        const detail = fnData?.error ? ` — ${fnData.error}` : '';
        setEmailError(`Banner saved, but email failed: ${fnError.message}${detail}`);
        setEmailSending(false);
        return;
      }
    }

    setEmailSending(false);
    setEmailConfirm(false);
    setBannerSaved(true);
    setTimeout(() => setBannerSaved(false), 2500);
  };

  const inputStyle = {
    width: '100%',
    padding: '0.65rem 0.9rem',
    borderRadius: 12,
    border: '1px solid rgba(148,163,184,0.35)',
    background: 'var(--ss-input-bg)',
    color: 'var(--ss-dashboard-text)',
    fontSize: '0.9rem',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    display: 'block',
    fontWeight: 700,
    fontSize: '0.83rem',
    color: 'var(--ss-dashboard-text)',
    marginBottom: '0.4rem',
  };

  const sectionContainerStyle = {
    maxWidth: 1440,
    margin: '0 auto',
    padding: '0 1.5rem',
  };

  return (
    <div className="ss-dashboard-page">
      <main className="ss-dashboard-main">

        {/* ── Page Header ─────────────────────────────────────────────────── */}
        <div className="ss-dashboard-section">
          <div style={sectionContainerStyle}>
            <div className="ss-dashboard-section-heading">
              <div>
                <p className="ss-dashboard-eyebrow">Admin › Operations</p>
                <h2 style={{ color: 'var(--ss-dashboard-text)', fontFamily: 'var(--font-display)', letterSpacing: '-0.04em', fontSize: '1.85rem', margin: 0 }}>
                  Platform Controls
                </h2>
                <p style={{ color: 'var(--ss-dashboard-muted)', marginTop: '0.4rem', fontSize: '0.9rem' }}>
                  Manage feature availability, broadcast announcements, and schedule maintenance.
                </p>
              </div>
              <div style={{ alignSelf: 'flex-start', marginTop: '0.3rem' }}>
                {maintenanceMode && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      padding: '0.5rem 0.95rem',
                      borderRadius: 999,
                      background: 'rgba(249,115,22,0.14)',
                      color: '#c2410c',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      fontFamily: 'var(--font-accent)',
                    }}
                  >
                    <i className="fas fa-triangle-exclamation" />
                    Maintenance Active
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Status Overview ──────────────────────────────────────────────── */}
        <div className="ss-dashboard-section" style={{ paddingTop: 0 }}>
          <div style={sectionContainerStyle}>
            <div className="ss-dashboard-stats-grid">
              <StatusCard icon="fa-server" label="System Status" value={systemStatus.label} tone={systemStatus.tone} />
              <StatusCard icon="fa-magnifying-glass" label="URL Scanner" value={scannerStatus.label} tone={scannerStatus.tone} />
              <StatusCard icon="fa-user-plus" label="Registrations" value={registrationStatus.label} tone={registrationStatus.tone} />
              <StatusCard icon="fa-bullhorn" label="Announcement" value={announcementStatus.label} tone={announcementStatus.tone} />
            </div>
          </div>
        </div>

        {/* ── Feature Flags ────────────────────────────────────────────────── */}
        <div className="ss-dashboard-section" style={{ paddingTop: 0 }}>
          <div style={sectionContainerStyle}>
            <div className="ss-dashboard-panel">
              <div className="ss-dashboard-panel-header">
                <div>
                  <p className="ss-dashboard-eyebrow" style={{ marginBottom: '0.25rem' }}>Controls</p>
                  <h3 style={{ color: 'var(--ss-dashboard-text)', fontFamily: 'var(--font-display)', margin: 0, fontSize: '1.2rem' }}>Feature Flags</h3>
                </div>
                <span className="ss-dashboard-panel-pill">
                  {[maintenanceMode, !scannerEnabled, !registrationsOpen, readOnlyMode].filter(Boolean).length} active restrictions
                </span>
              </div>
              <div style={{ marginTop: '0.5rem' }}>
                <FlagRow id="flag-maintenance" icon="fa-cone" label="Maintenance Mode" description="All non-admin users are redirected to a maintenance notice. Admins retain full access." checked={maintenanceMode}
                  onChange={async (e) => { const enabled = e.target.checked; setMaintenanceMode(enabled); setFlagError(''); const { error } = await supabase.from('system_config').upsert({ key: 'maintenance_mode', value: { enabled } }, { onConflict: 'key' }); if (error) { setMaintenanceMode(!enabled); setFlagError('Failed to save maintenance_mode: ' + error.message); } }} danger />
                <FlagRow id="flag-scanner" icon="fa-magnifying-glass-chart" label="URL Scanner" description="Allow users to submit new scan requests. Disable during model updates or backend maintenance." checked={scannerEnabled}
                  onChange={async (e) => { const enabled = e.target.checked; setScannerEnabled(enabled); setFlagError(''); const { error } = await supabase.from('system_config').upsert({ key: 'scanner_enabled', value: { enabled } }, { onConflict: 'key' }); if (error) { setScannerEnabled(!enabled); setFlagError('Failed to save scanner_enabled: ' + error.message); } }} />
                <FlagRow id="flag-registrations" icon="fa-user-plus" label="New Registrations" description="Allow new users to create accounts. Disable to temporarily pause sign-ups." checked={registrationsOpen}
                  onChange={async (e) => { const open = e.target.checked; setRegistrationsOpen(open); setFlagError(''); const { error } = await supabase.from('system_config').upsert({ key: 'registrations_open', value: { open } }, { onConflict: 'key' }); if (error) { setRegistrationsOpen(!open); setFlagError('Failed to save registrations_open: ' + error.message); } }} />
                <FlagRow id="flag-readonly" icon="fa-lock" label="Read-Only Mode" description="Blocks all user writes (scans, reports, settings) while still allowing browsing. Admins are unaffected." checked={readOnlyMode}
                  onChange={async (e) => { const enabled = e.target.checked; setReadOnlyMode(enabled); setFlagError(''); const { error } = await supabase.from('system_config').upsert({ key: 'read_only_mode', value: { enabled } }, { onConflict: 'key' }); if (error) { setReadOnlyMode(!enabled); setFlagError('Failed to save read_only_mode: ' + error.message); } }} danger />
              </div>
              {flagError && (
                <p style={{ color: '#dc2626', fontSize: '0.82rem', marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <i className="fas fa-circle-exclamation" /> {flagError}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Send Notification ────────────────────────────────────────────── */}
        <div className="ss-dashboard-section" style={{ paddingTop: 0, paddingBottom: '2rem' }}>
          <div style={sectionContainerStyle}>
            <div className="ss-dashboard-panel">
              <div className="ss-dashboard-panel-header" style={{ marginBottom: '1.25rem' }}>
                <div>
                  <p className="ss-dashboard-eyebrow" style={{ marginBottom: '0.25rem' }}>Notifications</p>
                  <h3 style={{ color: 'var(--ss-dashboard-text)', fontFamily: 'var(--font-display)', margin: 0, fontSize: '1.2rem' }}>Send Notification</h3>
                  <p style={{ color: 'var(--ss-dashboard-muted)', fontSize: '0.82rem', marginTop: '0.3rem' }}>
                    Compose once — shows as an in-app banner and optionally sends an email.
                  </p>
                </div>
                <Toggle id="banner-enabled" checked={bannerEnabled} onChange={(e) => setBannerEnabled(e.target.checked)} />
              </div>

              <form onSubmit={handleSendNotification}>
                {/* ── Compose ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '1rem', alignItems: 'start' }}>
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    <div>
                      <span style={labelStyle}>Type</span>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {[
                          { value: 'info',     label: 'Info',     icon: 'fa-circle-info',          color: '#2563eb' },
                          { value: 'warning',  label: 'Warning',  icon: 'fa-triangle-exclamation', color: '#c2410c' },
                          { value: 'critical', label: 'Critical', icon: 'fa-circle-exclamation',   color: '#dc2626' },
                        ].map((opt) => (
                          <label key={opt.value} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', borderRadius: 12, border: `1.5px solid ${bannerType === opt.value ? opt.color : 'rgba(148,163,184,0.3)'}`, background: bannerType === opt.value ? `${opt.color}14` : 'rgba(255,255,255,0.5)', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', color: bannerType === opt.value ? opt.color : 'var(--ss-dashboard-muted)', transition: 'all 0.18s ease' }}>
                            <input type="radio" name="bannerType" value={opt.value} checked={bannerType === opt.value} onChange={() => setBannerType(opt.value)} style={{ display: 'none' }} />
                            <i className={`fas ${opt.icon}`} style={{ fontSize: '0.76rem' }} />{opt.label}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label htmlFor="notif-msg" style={labelStyle}>Message</label>
                      <textarea id="notif-msg" value={bannerMessage} onChange={(e) => setBannerMessage(e.target.value)} placeholder="e.g. Scheduled maintenance in progress. Some features may be temporarily unavailable." rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.55 }} />
                      <p style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '0.2rem' }}>{bannerMessage.length}/300</p>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.86rem', fontWeight: 600, color: 'var(--ss-dashboard-text)' }}>
                      <Toggle id="banner-dismissible" checked={bannerDismissible} onChange={(e) => setBannerDismissible(e.target.checked)} />
                      Allow users to dismiss this banner
                    </label>
                  </div>

                  {/* Live preview */}
                  <div>
                    <span style={labelStyle}>Banner Preview</span>
                    {bannerEnabled && bannerMessage.trim() ? (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', padding: '0.75rem 1rem', borderRadius: 12, background: bps.bg, border: `1px solid ${bps.border}`, color: bps.color }}>
                        <i className={`fas ${bps.icon}`} style={{ marginTop: '0.1rem', flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: '0.86rem', lineHeight: 1.5 }}>{bannerMessage}</span>
                        {bannerDismissible && <i className="fas fa-xmark" style={{ opacity: 0.6, flexShrink: 0 }} />}
                      </div>
                    ) : (
                      <div style={{ padding: '1.1rem', borderRadius: 12, border: '1.5px dashed rgba(148,163,184,0.35)', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                        <i className="fas fa-eye-slash" style={{ display: 'block', fontSize: '1.1rem', marginBottom: '0.35rem' }} />
                        Enable and enter a message to preview.
                      </div>
                    )}
                    <p style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '0.5rem', lineHeight: 1.4 }}>
                      <i className="fas fa-circle-info" style={{ marginRight: '0.35rem' }} />Shown at the top of every page for all logged-in users.
                    </p>
                  </div>
                </div>

                {/* ── Email channel ── */}
                <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--ss-dashboard-border)' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', fontSize: '0.86rem', fontWeight: 700, color: 'var(--ss-dashboard-text)', userSelect: 'none' }}>
                    <Toggle id="sched-notify" checked={scheduleNotify} onChange={(e) => setScheduleNotify(e.target.checked)} />
                    Also send as email
                  </label>
                  {scheduleNotify && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                      <div>
                        <label htmlFor="email-target" style={labelStyle}>Recipients</label>
                        <select id="email-target" value={emailTarget} onChange={(e) => setEmailTarget(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                          <option value="all">All users</option>
                          <option value="active">Active users (last 30 days)</option>
                          <option value="admins">Admins only</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="email-subject" style={labelStyle}>Subject</label>
                        <input id="email-subject" type="text" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder="e.g. Scheduled maintenance on May 12" style={inputStyle} />
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label htmlFor="email-body" style={labelStyle}>Message Body</label>
                        <textarea id="email-body" value={emailBody} onChange={(e) => setEmailBody(e.target.value)} placeholder="Plain text only." rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.86rem', fontWeight: 600, color: emailConfirm ? '#dc2626' : 'var(--ss-dashboard-muted)', userSelect: 'none' }}>
                          <input type="checkbox" checked={emailConfirm} onChange={(e) => setEmailConfirm(e.target.checked)} style={{ width: 15, height: 15, accentColor: '#dc2626', cursor: 'pointer' }} />
                          I confirm I want to send this email. This cannot be undone.
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Schedule (optional) ── */}
                <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--ss-dashboard-border)' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', fontSize: '0.86rem', fontWeight: 700, color: 'var(--ss-dashboard-text)', userSelect: 'none' }}>
                    <Toggle id="sched-enabled" checked={schedEnabled} onChange={(e) => setSchedEnabled(e.target.checked)} />
                    Schedule for later
                  </label>
                  {schedEnabled && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                      <div>
                        <label htmlFor="sched-start" style={labelStyle}>
                          <i className="fas fa-calendar-plus" style={{ marginRight: '0.4rem', color: '#2563eb' }} />Start
                        </label>
                        <input id="sched-start" type="datetime-local" value={scheduleStart} onChange={(e) => setScheduleStart(e.target.value)} style={inputStyle} />
                      </div>
                      <div>
                        <label htmlFor="sched-end" style={labelStyle}>
                          <i className="fas fa-calendar-check" style={{ marginRight: '0.4rem', color: '#16a34a' }} />Estimated End
                        </label>
                        <input id="sched-end" type="datetime-local" value={scheduleEnd} onChange={(e) => setScheduleEnd(e.target.value)} style={inputStyle} />
                      </div>
                      <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.6rem 0.85rem', borderRadius: 10, background: 'rgba(148,163,184,0.08)', fontSize: '0.79rem', color: 'var(--ss-dashboard-muted)', lineHeight: 1.5 }}>
                        <i className="fas fa-circle-info" style={{ color: '#2563eb', flexShrink: 0, marginTop: '0.1rem' }} />
                        <span>Maintenance Mode will be automatically enabled at the start time and disabled at the end.</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Actions ── */}
                {emailError && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginTop: '1rem', padding: '0.65rem 0.9rem', borderRadius: 10, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)', fontSize: '0.82rem', color: '#dc2626', lineHeight: 1.5 }}>
                    <i className="fas fa-circle-exclamation" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                    <span>{emailError}</span>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '0.65rem', marginTop: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {(() => {
                    const isDisabled = emailSending || !bannerMessage.trim() || (scheduleNotify && (!emailConfirm || !emailSubject.trim() || !emailBody.trim()));
                    return (
                      <button
                        type="submit"
                        disabled={isDisabled}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', minHeight: 38, padding: '0 1.1rem', borderRadius: 14, border: 'none', background: isDisabled ? 'rgba(148,163,184,0.25)' : 'linear-gradient(135deg,#0ea5a4,#2563eb)', color: isDisabled ? '#94a3b8' : '#fff', fontFamily: 'var(--font-accent)', fontWeight: 700, fontSize: '0.86rem', cursor: isDisabled ? 'not-allowed' : 'pointer', transition: 'all 0.2s ease', boxShadow: isDisabled ? 'none' : '0 14px 28px -14px rgba(37,99,235,0.55)' }}
                      >
                        <i className={`fas ${emailSending ? 'fa-spinner fa-spin' : bannerSaved ? 'fa-check' : 'fa-bell'}`} />
                        {emailSending ? 'Sending…' : bannerSaved ? 'Sent!' : 'Send Notification'}
                      </button>
                    );
                  })()}
                  <button type="button" className="ss-dashboard-btn ss-dashboard-btn-secondary" style={{ minHeight: 38, fontSize: '0.86rem' }}
                    onClick={() => { setBannerMessage(''); setBannerEnabled(false); setScheduleNotify(false); setSchedEnabled(false); setScheduleStart(''); setScheduleEnd(''); setEmailSubject(''); setEmailBody(''); setEmailConfirm(false); setEmailError(''); }}>
                    <i className="fas fa-rotate-left" style={{ marginRight: '0.4rem' }} />Clear
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}

export default AdminControls;
