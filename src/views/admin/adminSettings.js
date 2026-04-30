
import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../context/AuthContext';
import { logoutUser } from '../../services/authService';

import '../../styles/dashboard.css';

function AdminSettings() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [logoutBusy, setLogoutBusy] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileAlert, setProfileAlert] = useState(null);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwAlert, setPwAlert] = useState(null);

  const profileAlertRef = useRef(null);
  const pwAlertRef = useRef(null);

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      const name =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        '';
      setDisplayName(name);
    }
    setLoading(false);
  }, [authLoading, user]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileBusy(true);
    setProfileAlert(null);

    const { error } = await supabase.auth.updateUser({
      data: { full_name: displayName.trim() },
    });

    if (error) {
      setProfileAlert({ type: 'error', message: error.message });
    } else {
      setProfileAlert({ type: 'success', message: 'Display name updated successfully.' });
    }

    setProfileBusy(false);
    profileAlertRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwAlert(null);

    if (newPw !== confirmPw) {
      setPwAlert({ type: 'error', message: 'New passwords do not match.' });
      return;
    }
    if (newPw.length < 8) {
      setPwAlert({ type: 'error', message: 'Password must be at least 8 characters.' });
      return;
    }

    setPwBusy(true);

    /* Re-authenticate then update */
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPw,
    });

    if (signInError) {
      setPwAlert({ type: 'error', message: 'Current password is incorrect.' });
      setPwBusy(false);
      pwAlertRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPw });

    if (error) {
      setPwAlert({ type: 'error', message: error.message });
    } else {
      setPwAlert({ type: 'success', message: 'Password changed successfully.' });
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    }

    setPwBusy(false);
    pwAlertRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const handleLogout = async () => {
    setLogoutBusy(true);
    await logoutUser();
    navigate('/login');
  };

  if (loading) return <div className="ss-dashboard-page" aria-busy="true" />;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="ss-dashboard-page">
      <main className="ss-dashboard-main">

        {/* Header */}
        <div className="ss-dashboard-section">
          <div className="container">
            <p className="ss-dashboard-eyebrow">Admin &rsaquo; Configuration</p>
            <h2 style={{ color: 'var(--ss-dashboard-text)', fontFamily: 'var(--font-display)', letterSpacing: '-0.04em', fontSize: '1.85rem' }}>
              Admin Settings
            </h2>
          </div>
        </div>

        {/* Profile section */}
        <div className="ss-dashboard-section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="ss-dashboard-panel">
              <p className="ss-dashboard-eyebrow" style={{ marginBottom: '0.5rem' }}>Profile</p>
              <h3 style={{ color: 'var(--ss-dashboard-text)', marginBottom: '1.25rem', fontFamily: 'var(--font-display)' }}>
                Admin Account
              </h3>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <div
                  style={{
                    width: 54, height: 54, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #ef4444, #f97316)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 800, fontSize: '1.3rem', flexShrink: 0,
                  }}
                >
                  {(displayName || user.email || 'A').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--ss-dashboard-text)', fontSize: '0.95rem' }}>
                    {displayName || 'Admin User'}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>{user.email}</div>
                  <span className="ss-admin-badge" style={{ marginLeft: 0, marginTop: '0.35rem', display: 'inline-flex' }}>
                    Admin
                  </span>
                </div>
              </div>

              <div ref={profileAlertRef}>
                {profileAlert && (
                  <div
                    className={`udb-alert ${profileAlert.type === 'error' ? 'udb-alert-error' : 'udb-alert-success'}`}
                    style={{ marginBottom: '1rem' }}
                  >
                    <i className={`fas ${profileAlert.type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'}`} style={{ marginRight: '0.5rem' }}></i>
                    {profileAlert.message}
                  </div>
                )}
              </div>

              <form onSubmit={handleProfileSave} style={{ display: 'grid', gap: '1rem', maxWidth: 480 }}>
                <div className="udb-form-group">
                  <label htmlFor="admin-display-name" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                    Display Name
                  </label>
                  <input
                    id="admin-display-name"
                    type="text"
                    className="udb-form-input"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your display name"
                  />
                </div>
                <div className="udb-form-group">
                  <label htmlFor="admin-email" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                    Email Address
                  </label>
                  <input
                    id="admin-email"
                    type="email"
                    className="udb-form-input"
                    value={user.email || ''}
                    disabled
                    readOnly
                    style={{ opacity: 0.6, cursor: 'not-allowed' }}
                  />
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.35rem' }}>
                    Email cannot be changed here. Update via Supabase Dashboard.
                  </p>
                </div>
                <div>
                  <button
                    type="submit"
                    disabled={profileBusy}
                    className="ss-dashboard-btn ss-dashboard-btn-primary"
                    style={{ minHeight: 42 }}
                  >
                    {profileBusy ? 'Saving\u2026' : 'Save Profile'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Security — Password Change */}
        <div className="ss-dashboard-section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="ss-dashboard-panel">
              <p className="ss-dashboard-eyebrow" style={{ marginBottom: '0.5rem' }}>Security</p>
              <h3 style={{ color: 'var(--ss-dashboard-text)', marginBottom: '1.25rem', fontFamily: 'var(--font-display)' }}>
                Change Password
              </h3>

              <div ref={pwAlertRef}>
                {pwAlert && (
                  <div
                    className={`udb-alert ${pwAlert.type === 'error' ? 'udb-alert-error' : 'udb-alert-success'}`}
                    style={{ marginBottom: '1rem' }}
                  >
                    <i className={`fas ${pwAlert.type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'}`} style={{ marginRight: '0.5rem' }}></i>
                    {pwAlert.message}
                  </div>
                )}
              </div>

              <form onSubmit={handlePasswordChange} style={{ display: 'grid', gap: '1rem', maxWidth: 480 }}>
                <div className="udb-form-group">
                  <label htmlFor="current-pw" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                    Current Password *
                  </label>
                  <input
                    id="current-pw"
                    type="password"
                    className="udb-form-input"
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>
                <div className="udb-form-group">
                  <label htmlFor="new-pw" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                    New Password *
                  </label>
                  <input
                    id="new-pw"
                    type="password"
                    className="udb-form-input"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>
                <div className="udb-form-group">
                  <label htmlFor="confirm-pw" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                    Confirm New Password *
                  </label>
                  <input
                    id="confirm-pw"
                    type="password"
                    className="udb-form-input"
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <button
                    type="submit"
                    disabled={pwBusy || !currentPw || !newPw || !confirmPw}
                    className="ss-dashboard-btn ss-dashboard-btn-primary"
                    style={{ minHeight: 42 }}
                  >
                    {pwBusy ? 'Updating\u2026' : 'Change Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* System Config */}
        <div className="ss-dashboard-section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="ss-dashboard-panel">
              <p className="ss-dashboard-eyebrow" style={{ marginBottom: '0.5rem' }}>System</p>
              <h3 style={{ color: 'var(--ss-dashboard-text)', marginBottom: '1rem', fontFamily: 'var(--font-display)' }}>
                Platform Configuration
              </h3>
              <div className="ss-dashboard-tip-list">
                <article>
                  <span><i className="fas fa-shield-halved"></i></span>
                  <div>
                    <h3>Risk Threshold</h3>
                    <p>Scans with a risk score &ge; 80 are automatically flagged as High Risk. Configure thresholds via Supabase Edge Functions.</p>
                  </div>
                </article>
                <article>
                  <span><i className="fas fa-robot"></i></span>
                  <div>
                    <h3>NLP Engine</h3>
                    <p>AI-powered listing analysis is handled by the backend NLP service. Review outputs in the Logs section.</p>
                  </div>
                </article>
                <article>
                  <span><i className="fas fa-users-gear"></i></span>
                  <div>
                    <h3>Admin Role Management</h3>
                    <p>Grant admin access by setting <code>app_metadata.role = &quot;admin&quot;</code> for users via the Supabase Dashboard.</p>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </div>

        {/* User Management (frontend stub) */}
        <div className="ss-dashboard-section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="ss-dashboard-panel">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <p className="ss-dashboard-eyebrow" style={{ marginBottom: '0.5rem' }}>Platform</p>
                  <h3 style={{ color: 'var(--ss-dashboard-text)', marginBottom: '0.4rem', fontFamily: 'var(--font-display)' }}>
                    User Management
                  </h3>
                  <p style={{ color: 'var(--ss-dashboard-muted)', fontSize: '0.88rem', maxWidth: 560 }}>
                    Review SureShopPH accounts, change roles, and manage admin access. Backend wiring is pending — actions below are inactive.
                  </p>
                </div>
                <button
                  type="button"
                  className="ss-dashboard-btn ss-dashboard-btn-primary"
                  style={{ minHeight: 40 }}
                  disabled
                  title="Backend not yet wired"
                >
                  <i className="fas fa-user-plus" style={{ marginRight: '0.4rem' }}></i>
                  Invite Admin
                </button>
              </div>

              {/* Search + filter bar */}
              <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <div className="ss-admin-search" style={{ flex: '1 1 240px' }}>
                  <i className="fas fa-search" style={{ color: '#94a3b8', fontSize: '0.9rem' }}></i>
                  <input
                    type="text"
                    placeholder="Search by name or email\u2026"
                    disabled
                  />
                </div>
                <select className="udb-form-input" disabled style={{ maxWidth: 180 }}>
                  <option>All roles</option>
                  <option>Admin</option>
                  <option>User</option>
                </select>
                <select className="udb-form-input" disabled style={{ maxWidth: 180 }}>
                  <option>All statuses</option>
                  <option>Active</option>
                  <option>Suspended</option>
                </select>
              </div>

              {/* Mock table — frontend only */}
              <div className="ss-dashboard-table-wrap">
                <table className="ss-dashboard-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Joined</th>
                      <th style={{ minWidth: 160 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { id: 1, name: 'Maria Santos', email: 'maria.santos@example.ph', role: 'Admin', status: 'Active', joined: 'Mar 12, 2026' },
                      { id: 2, name: 'Juan Dela Cruz', email: 'juan.delacruz@example.ph', role: 'User', status: 'Active', joined: 'Apr 3, 2026' },
                      { id: 3, name: 'Andrea Reyes', email: 'andrea.r@example.ph', role: 'User', status: 'Suspended', joined: 'Feb 27, 2026' },
                      { id: 4, name: 'Mark Villanueva', email: 'mark.v@example.ph', role: 'User', status: 'Active', joined: 'Apr 18, 2026' },
                      { id: 5, name: 'Luis Tan', email: 'luis.tan@example.ph', role: 'Admin', status: 'Active', joined: 'Jan 8, 2026' },
                    ].map((u) => (
                      <tr key={u.id}>
                        <td style={{ fontWeight: 600, color: 'var(--ss-dashboard-text)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <span
                              style={{
                                width: 32, height: 32, borderRadius: '50%',
                                background: u.role === 'Admin'
                                  ? 'linear-gradient(135deg, #ef4444, #f97316)'
                                  : 'linear-gradient(135deg, #0ea5a4, #2563eb)',
                                color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.78rem', fontWeight: 800, flexShrink: 0,
                              }}
                            >
                              {u.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                            </span>
                            {u.name}
                          </div>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--ss-dashboard-muted)' }}>
                          {u.email}
                        </td>
                        <td>
                          <span
                            className="ss-dashboard-risk"
                            style={{
                              background: u.role === 'Admin' ? 'rgba(239,68,68,0.1)' : 'rgba(14,165,164,0.12)',
                              color: u.role === 'Admin' ? '#b91c1c' : 'var(--ss-dashboard-teal-dark)',
                              border: `1px solid ${u.role === 'Admin' ? 'rgba(239,68,68,0.25)' : 'rgba(14,165,164,0.25)'}`,
                            }}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td>
                          <span className={`ss-dashboard-risk ${u.status === 'Active' ? 'ss-dashboard-risk-low' : 'ss-dashboard-risk-high'}`}>
                            {u.status}
                          </span>
                        </td>
                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.82rem', color: 'var(--ss-dashboard-muted)' }}>
                          {u.joined}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button
                              type="button"
                              disabled
                              className="ss-dashboard-btn ss-dashboard-btn-secondary"
                              style={{ minHeight: 32, padding: '0 0.7rem', fontSize: '0.75rem' }}
                              title="Backend not yet wired"
                            >
                              <i className="fas fa-pen" style={{ marginRight: '0.3rem' }}></i>Edit
                            </button>
                            <button
                              type="button"
                              disabled
                              className="ss-dashboard-btn ss-dashboard-btn-secondary"
                              style={{ minHeight: 32, padding: '0 0.7rem', fontSize: '0.75rem', borderColor: 'rgba(239,68,68,0.3)', color: '#ef4444' }}
                              title="Backend not yet wired"
                            >
                              <i className="fas fa-ban" style={{ marginRight: '0.3rem' }}></i>
                              {u.status === 'Active' ? 'Suspend' : 'Reinstate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p style={{ fontSize: '0.78rem', color: 'var(--ss-dashboard-muted)', marginTop: '0.85rem', fontStyle: 'italic' }}>
                <i className="fas fa-circle-info" style={{ marginRight: '0.4rem' }}></i>
                Showing demo data. Wire to <code>auth.users</code> + a <code>profiles</code> table to enable.
              </p>
            </div>
          </div>
        </div>

        {/* Danger zone */}
        <div className="ss-dashboard-section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="ss-dashboard-panel" style={{ borderColor: 'rgba(239,68,68,0.22)' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#ef4444', marginBottom: '0.5rem' }}>
                Danger Zone
              </p>
              <h3 style={{ color: 'var(--ss-dashboard-text)', marginBottom: '0.6rem', fontFamily: 'var(--font-display)' }}>
                Session &amp; Logout
              </h3>
              <p style={{ color: 'var(--ss-dashboard-muted)', fontSize: '0.88rem', marginBottom: '1rem' }}>
                End your current admin session. You will be redirected to the login page.
              </p>
              <button
                type="button"
                onClick={handleLogout}
                disabled={logoutBusy}
                className="ss-dashboard-btn ss-dashboard-btn-secondary"
                style={{ minHeight: 42, borderColor: 'rgba(239,68,68,0.3)', color: '#ef4444' }}
              >
                <i className="fas fa-right-from-bracket" style={{ marginRight: '0.45rem' }}></i>
                {logoutBusy ? 'Signing out\u2026' : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}

export default AdminSettings;
