import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { logoutUser } from '../services/authService';
import { supabase } from '../config/supabase';
import DashboardHeader from './DashboardHeader';
import DashboardFooter from './DashboardFooter';

const BANNER_COLORS = {
  info:     { bg: 'rgba(37,99,235,0.1)',   border: 'rgba(37,99,235,0.3)',   color: '#1e40af', icon: 'fa-circle-info' },
  warning:  { bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.35)', color: '#c2410c', icon: 'fa-triangle-exclamation' },
  critical: { bg: 'rgba(220,38,38,0.1)',   border: 'rgba(220,38,38,0.3)',   color: '#dc2626', icon: 'fa-circle-exclamation' },
};

/**
 * UserLayout — persistent shell for all signed-in user routes.
 * Mounts the dashboard header once so it does not flicker between pages.
 */
function UserLayout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [banner, setBanner] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [notifUnread, setNotifUnread] = useState(false);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    supabase
      .from('system_config')
      .select('value')
      .eq('key', 'announcement')
      .single()
      .then(({ data }) => {
        if (data?.value?.enabled && data.value.message?.trim()) {
          setBanner(data.value);
          const seen = localStorage.getItem('ss_notif_seen');
          if (seen !== data.value.message) {
            setNotifUnread(true);
            setShowToast(true);
          }
        }
      });
  }, []);

  useEffect(() => {
    if (!showToast) return;
    const t = setTimeout(() => setShowToast(false), 6000);
    return () => clearTimeout(t);
  }, [showToast]);

  const handleNotifRead = () => {
    if (banner?.message) {
      localStorage.setItem('ss_notif_seen', banner.message);
      setNotifUnread(false);
    }
  };

  const handleLogout = async () => {
    setLogoutBusy(true);
    await logoutUser();
    navigate('/login');
  };

  const bc = BANNER_COLORS[banner?.type] || BANNER_COLORS.info;

  return (
    <div className="ss-dashboard-page">
      <DashboardHeader user={user} onLogout={handleLogout} logoutBusy={logoutBusy} notification={banner && !dismissed ? banner : null} notifUnread={notifUnread} onNotifRead={handleNotifRead} />
      {banner && !dismissed && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.65rem 1.5rem',
            background: bc.bg,
            borderBottom: `1px solid ${bc.border}`,
            color: bc.color,
            fontSize: '0.875rem',
            lineHeight: 1.45,
          }}
        >
          <i className={`fas ${bc.icon}`} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{banner.message}</span>
          {banner.dismissible && (
            <button
              type="button"
              onClick={() => setDismissed(true)}
              aria-label="Dismiss announcement"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: bc.color, opacity: 0.7, fontSize: '1rem', padding: 0, flexShrink: 0 }}
            >
              <i className="fas fa-xmark" />
            </button>
          )}
        </div>
      )}
      <Outlet context={{ dashboardUser: user }} />
      <DashboardFooter />
      {showToast && banner && (
        <>
          <style>{`@keyframes ss-toast-in{from{transform:translateX(110%);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
          <div
            role="alert"
            aria-live="polite"
            style={{
              position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 9999,
              width: 320, padding: '0.85rem 1rem', borderRadius: 14,
              background: 'var(--ss-dashboard-card, #1e293b)',
              border: `1px solid ${bc.border}`,
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              display: 'flex', alignItems: 'flex-start', gap: '0.65rem',
              animation: 'ss-toast-in 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
            }}
          >
            <i className={`fas ${bc.icon}`} style={{ color: bc.color, flexShrink: 0, marginTop: '0.15rem', fontSize: '1rem' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: bc.color, marginBottom: '0.2rem' }}>
                {banner.type.charAt(0).toUpperCase() + banner.type.slice(1)}
              </div>
              <p style={{ margin: 0, fontSize: '0.84rem', lineHeight: 1.45, color: 'var(--ss-dashboard-text, #e2e8f0)', wordBreak: 'break-word' }}>
                {banner.message}
              </p>
            </div>
            <button type="button" onClick={() => { setShowToast(false); handleNotifRead(); }}
              aria-label="Dismiss notification"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(148,163,184,0.6)', fontSize: '0.9rem', padding: 0, flexShrink: 0 }}>
              <i className="fas fa-xmark" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export const useUserLayout = () => useOutletContext();
export default UserLayout;
