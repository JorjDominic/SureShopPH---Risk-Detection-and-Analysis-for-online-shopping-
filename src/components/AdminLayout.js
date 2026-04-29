import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useOutletContext } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { logoutUser } from '../services/authService';
import AdminHeader from './AdminHeader';
import DashboardFooter from './DashboardFooter';

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
      <AdminHeader user={user} onLogout={handleLogout} logoutBusy={logoutBusy} />
      <Outlet context={{ adminUser: user }} />
      <DashboardFooter />
    </div>
  );
}

export const useAdminLayout = () => useOutletContext();
export default AdminLayout;
