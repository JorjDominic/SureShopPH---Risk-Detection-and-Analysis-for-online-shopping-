import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import { logoutUser } from '../../services/authService';
import DashboardHeader from '../../components/DashboardHeader';
import DashboardFooter from '../../components/DashboardFooter';
import '../../styles/dashboard.css';

function SettingsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logoutBusy, setLogoutBusy] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);

  const [, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!active) return;
      const u = data?.user ?? null;
      setUser(u);
      if (u) {
        const name =
          u.user_metadata?.full_name ||
          u.user_metadata?.name ||
          u.email?.split('@')[0] ||
          '';
        setDisplayName(name);
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const handleLogout = async () => {
    setLogoutBusy(true);
    await logoutUser();
    navigate('/login');
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileMsg(null);
    setSavingProfile(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: displayName.trim() },
      });
      if (error) throw error;
      setProfileMsg({ type: 'success', text: 'Display name updated successfully.' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 8 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordMsg({ type: 'success', text: 'Password changed successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordMsg({ type: 'error', text: err.message || 'Failed to change password.' });
    } finally {
      setChangingPassword(false);
    }
  };

  if (!loading && !user) return <Navigate to="/login" replace />;
  if (loading) return null;

  return (
    <div className="ss-dashboard-page">
      <DashboardHeader user={user} onLogout={handleLogout} logoutBusy={logoutBusy} />

      <main className="ss-dashboard-main">

        {/* Page title */}
        <div className="ss-dashboard-section">
          <div className="container">
            <div className="ss-dashboard-section-heading">
              <div>
                <p className="ss-dashboard-eyebrow">Account</p>
                <h2>Settings</h2>
              </div>
            </div>
          </div>
        </div>

        {/* Profile section */}
        <div className="ss-dashboard-section">
          <div className="container">
            <div className="ss-dashboard-section-heading">
              <div>
                <p className="ss-dashboard-eyebrow">Profile</p>
                <h2>Your Profile</h2>
              </div>
            </div>
            <div className="ss-dashboard-panel">
              {profileMsg && (
                <div className={`udb-alert udb-alert-${profileMsg.type}`} style={{ marginBottom: '1.25rem' }}>{profileMsg.text}</div>
              )}
              <form onSubmit={handleSaveProfile}>
                <div className="udb-settings-grid">
                  <div className="udb-form-group">
                    <label htmlFor="email">Email Address</label>
                    <input
                      id="email"
                      type="email"
                      className="udb-form-input"
                      value={user?.email ?? ''}
                      disabled
                    />
                  </div>
                  <div className="udb-form-group">
                    <label htmlFor="display-name">Display Name</label>
                    <input
                      id="display-name"
                      type="text"
                      className="udb-form-input"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your name"
                      maxLength={60}
                    />
                  </div>
                </div>
                <div style={{ marginTop: '1.25rem' }}>
                  <button type="submit" className="ss-dashboard-btn ss-dashboard-btn-primary" disabled={savingProfile}>
                    {savingProfile
                      ? <><i className="fas fa-spinner fa-spin"></i> Saving...</>
                      : <><i className="fas fa-save"></i> Save Profile</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Password section */}
        <div className="ss-dashboard-section">
          <div className="container">
            <div className="ss-dashboard-section-heading">
              <div>
                <p className="ss-dashboard-eyebrow">Security</p>
                <h2>Change Password</h2>
              </div>
            </div>
            <div className="ss-dashboard-panel">
              {passwordMsg && (
                <div className={`udb-alert udb-alert-${passwordMsg.type}`} style={{ marginBottom: '1.25rem' }}>{passwordMsg.text}</div>
              )}
              <form onSubmit={handleChangePassword}>
                <div className="udb-settings-grid">
                  <div className="udb-form-group">
                    <label htmlFor="new-password">New Password</label>
                    <input
                      id="new-password"
                      type="password"
                      className="udb-form-input"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      minLength={8}
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="udb-form-group">
                    <label htmlFor="confirm-password">Confirm New Password</label>
                    <input
                      id="confirm-password"
                      type="password"
                      className="udb-form-input"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
                <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button type="submit" className="ss-dashboard-btn ss-dashboard-btn-primary" disabled={changingPassword}>
                    {changingPassword
                      ? <><i className="fas fa-spinner fa-spin"></i> Updating...</>
                      : <><i className="fas fa-key"></i> Update Password</>}
                  </button>
                  <Link to="/forgot-password" style={{ fontSize: '0.875rem', color: 'var(--ss-dashboard-muted)' }}>
                    Forgot your password?
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Account info */}
        <div className="ss-dashboard-section">
          <div className="container">
            <div className="ss-dashboard-section-heading">
              <div>
                <p className="ss-dashboard-eyebrow">Details</p>
                <h2>Account Info</h2>
              </div>
            </div>
            <div className="ss-dashboard-panel">
              <div className="udb-detail-grid">
                <div className="udb-detail-item">
                  <label>Account ID</label>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--ss-dashboard-muted)' }}>
                    {user?.id?.slice(0, 8)}...
                  </span>
                </div>
                <div className="udb-detail-item">
                  <label>Joined</label>
                  <span>
                    {user?.created_at
                      ? new Date(user.created_at).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })
                      : '—'}
                  </span>
                </div>
                <div className="udb-detail-item">
                  <label>Auth Provider</label>
                  <span>{user?.app_metadata?.provider ?? 'Email'}</span>
                </div>
                <div className="udb-detail-item">
                  <label>Email Verified</label>
                  <span>{user?.email_confirmed_at ? '✅ Yes' : '❌ Not yet'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="ss-dashboard-section">
          <div className="container">
            <Link to="/userdashboard" className="ss-dashboard-btn ss-dashboard-btn-secondary">
              <i className="fas fa-tachometer-alt"></i> Back to Dashboard
            </Link>
          </div>
        </div>

      </main>

      <DashboardFooter />
    </div>
  );
}


export default SettingsPage;
