import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { logoutUser } from '../services/authService';
import { supabase } from '../config/supabase';
import AdminHeader from './AdminHeader';
import DashboardFooter from './DashboardFooter';

const BANNER_COLORS = {
  info:     { bg: 'rgba(37,99,235,0.1)',   border: 'rgba(37,99,235,0.3)',   color: '#1e40af', icon: 'fa-circle-info' },
  warning:  { bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.35)', color: '#c2410c', icon: 'fa-triangle-exclamation' },
  critical: { bg: 'rgba(220,38,38,0.1)',   border: 'rgba(220,38,38,0.3)',   color: '#dc2626', icon: 'fa-circle-exclamation' },
};

const BANNER_COLORS_DARK = {
  info:     { bg: 'rgba(37,99,235,0.18)',  border: 'rgba(37,99,235,0.45)',  color: '#93c5fd', icon: 'fa-circle-info' },
  warning:  { bg: 'rgba(249,115,22,0.18)', border: 'rgba(249,115,22,0.45)', color: '#fb923c', icon: 'fa-triangle-exclamation' },
  critical: { bg: 'rgba(220,38,38,0.18)',  border: 'rgba(220,38,38,0.45)',  color: '#f87171', icon: 'fa-circle-exclamation' },
};

const BANNER_CACHE_KEY = 'ss_banner_cache';

/**
 * AdminLayout — persistent shell for all admin routes.
 *
 * Why this exists: previously each admin page rendered its own AdminHeader.
 * On navigation, the page (and its header) unmounted and remounted, causing
 * a brief disappearance/flicker of the top navbar. With this layout, the
 * header is mounted ONCE; only the inner content swaps via <Outlet />.
 */
function AdminLayout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [notification, setNotification] = useState(null);
  const [notifUnread, setNotifUnread] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [isDark, setIsDark] = useState(() => document.body.classList.contains('ss-theme-dark'));

  // Keep isDark in sync whenever the body class changes (theme toggle)
  useEffect(() => {
    const observer = new MutationObserver(() =>
      setIsDark(document.body.classList.contains('ss-theme-dark'))
    );
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const seen = localStorage.getItem('ss_notif_seen');

    // Show immediately from sessionStorage cache — eliminates network-fetch delay
    try {
      const cached = sessionStorage.getItem(BANNER_CACHE_KEY);
      if (cached) {
        const cachedBanner = JSON.parse(cached);
        if (cachedBanner?.enabled && cachedBanner.message?.trim()) {
          setNotification(cachedBanner);
          if (seen !== cachedBanner.message) {
            setNotifUnread(true);
            setShowToast(true);
          }
        }
      }
    } catch { /* ignore malformed cache */ }

    // Refresh from Supabase in the background and update cache
    supabase
      .from('system_config')
      .select('value')
      .eq('key', 'announcement')
      .single()
      .then(({ data }) => {
        if (data?.value?.enabled && data.value.message?.trim()) {
          sessionStorage.setItem(BANNER_CACHE_KEY, JSON.stringify(data.value));
          setNotification(data.value);
          if (seen !== data.value.message) {
            setNotifUnread(true);
            setShowToast(true);
          }
        } else {
          sessionStorage.removeItem(BANNER_CACHE_KEY);
          setNotification(null);
        }
      });
  }, []);

  useEffect(() => {
    if (!showToast) return;
    const t = setTimeout(() => setShowToast(false), 6000);
    return () => clearTimeout(t);
  }, [showToast]);

  const handleNotifRead = () => {
    if (notification?.message) {
      localStorage.setItem('ss_notif_seen', notification.message);
      setNotifUnread(false);
    }
  };

  const handleLogout = async () => {
    setLogoutBusy(true);
    await logoutUser();
    navigate('/login');
  };

  const colors = isDark ? BANNER_COLORS_DARK : BANNER_COLORS;
  const bc = colors[notification?.type] || colors.info;

  return (
    <div className="ss-dashboard-page">
      <AdminHeader user={user} onLogout={handleLogout} logoutBusy={logoutBusy} notification={notification} notifUnread={notifUnread} onNotifRead={handleNotifRead} />
      <Outlet context={{ adminUser: user }} />
      <DashboardFooter />
      {showToast && notification && (
        <>
          <style>{`@keyframes ss-toast-in{from{transform:translateX(110%);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
          <div
            role="alert"
            aria-live="polite"
            style={{
              position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 9999,
              width: 320, padding: '0.85rem 1rem', borderRadius: 14,
              background: isDark ? 'rgba(15,23,42,0.97)' : '#ffffff',
              border: `1px solid ${bc.border}`,
              boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.45)' : '0 8px 32px rgba(0,0,0,0.12)',
              display: 'flex', alignItems: 'flex-start', gap: '0.65rem',
              animation: 'ss-toast-in 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
            }}
          >
            <i className={`fas ${bc.icon}`} style={{ color: bc.color, flexShrink: 0, marginTop: '0.15rem', fontSize: '1rem' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: bc.color, marginBottom: '0.2rem' }}>
                {notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}
              </div>
              <p style={{ margin: 0, fontSize: '0.84rem', lineHeight: 1.45, color: isDark ? '#e2e8f0' : '#0f172a', wordBreak: 'break-word' }}>
                {notification.message}
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

export const useAdminLayout = () => useOutletContext();
export default AdminLayout;
