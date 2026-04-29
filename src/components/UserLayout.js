import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useOutletContext } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { logoutUser } from '../services/authService';
import DashboardHeader from './DashboardHeader';
import DashboardFooter from './DashboardFooter';

/**
 * UserLayout — persistent shell for all signed-in user routes.
 * Mounts the dashboard header once so it does not flicker between pages.
 */
function UserLayout() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [logoutBusy, setLogoutBusy] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setUser(data?.user ?? null);
    });
    return () => { active = false; };
  }, []);

  const handleLogout = async () => {
    setLogoutBusy(true);
    await logoutUser();
    navigate('/login');
  };

  return (
    <div className="ss-dashboard-page">
      <DashboardHeader user={user} onLogout={handleLogout} logoutBusy={logoutBusy} />
      <Outlet context={{ dashboardUser: user }} />
      <DashboardFooter />
    </div>
  );
}

export const useUserLayout = () => useOutletContext();
export default UserLayout;
