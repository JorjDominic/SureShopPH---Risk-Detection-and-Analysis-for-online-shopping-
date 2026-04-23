
import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/dashboard.css';

function DashboardHeader({ user, onLogout, logoutBusy }) {
  const location = useLocation();

  const displayName = useMemo(() => {
    if (!user) return 'User';
    const name =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      'User';
    return name.charAt(0).toUpperCase() + name.slice(1);
  }, [user]);

  const isActive = (path) => location.pathname === path;

  return (
    <header className="udb-header">
      <div className="udb-header-inner">
        <Link to="/" className="udb-logo">
          <i className="fas fa-shield-check"></i>
          <span>SureShop</span>
        </Link>

        <nav className="udb-nav">
          <span className="udb-user-greeting">Hi, {displayName}</span>
          <Link
            to="/userdashboard"
            className={`udb-nav-link${isActive('/userdashboard') ? ' active' : ''}`}
          >
            <i className="fas fa-tachometer-alt"></i>
            <span>Dashboard</span>
          </Link>
          <Link
            to="/scan"
            className={`udb-nav-link${isActive('/scan') ? ' active' : ''}`}
          >
            <i className="fas fa-search"></i>
            <span>New Scan</span>
          </Link>
          <Link
            to="/settings"
            className={`udb-nav-link${isActive('/settings') ? ' active' : ''}`}
          >
            <i className="fas fa-cog"></i>
            <span>Settings</span>
          </Link>
          <button
            type="button"
            className="udb-nav-link logout-link"
            onClick={onLogout}
            disabled={logoutBusy}
          >
            <i className="fas fa-sign-out-alt"></i>
            <span>{logoutBusy ? 'Signing out...' : 'Logout'}</span>
          </button>
        </nav>
      </div>
    </header>
  );
}

export default DashboardHeader;
