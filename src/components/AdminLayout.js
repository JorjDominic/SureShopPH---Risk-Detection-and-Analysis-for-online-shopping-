import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { logoutUser } from '../services/authService';
import { supabase } from '../config/supabase';
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
  const { user } = useAuth();
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    supabase
      .from('system_config')
      .select('value')
      .eq('key', 'announcement')
      .single()
      .then(({ data }) => {
        if (data?.value?.enabled && data.value.message?.trim()) {
          setNotification(data.value);
        }
      });
  }, []);

  const handleLogout = async () => {
    setLogoutBusy(true);
    await logoutUser();
    navigate('/login');
  };

  return (
    <div className="ss-dashboard-page">
      <AdminHeader user={user} onLogout={handleLogout} logoutBusy={logoutBusy} notification={notification} />
      <Outlet context={{ adminUser: user }} />
      <DashboardFooter />
    </div>
  );
}

export const useAdminLayout = () => useOutletContext();
export default AdminLayout;
