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

  useEffect(() => {
    supabase
      .from('system_config')
      .select('value')
      .eq('key', 'announcement')
      .single()
      .then(({ data }) => {
        if (data?.value?.enabled && data.value.message?.trim()) {
          setBanner(data.value);
        }
      });
  }, []);

  const handleLogout = async () => {
    setLogoutBusy(true);
    await logoutUser();
    navigate('/login');
  };

  const bc = BANNER_COLORS[banner?.type] || BANNER_COLORS.info;

  return (
    <div className="ss-dashboard-page">
      <DashboardHeader user={user} onLogout={handleLogout} logoutBusy={logoutBusy} />
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
    </div>
  );
}

export const useUserLayout = () => useOutletContext();
export default UserLayout;
