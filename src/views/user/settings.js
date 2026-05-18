import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../context/AuthContext';
import '../../styles/dashboard.css';

function SettingsPage() {
  const { user, loading, refreshUser } = useAuth();

  const [readOnly, setReadOnly] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState(null);

  useEffect(() => {
    supabase
      .from('system_config')
      .select('value')
      .eq('key', 'read_only_mode')
      .single()
      .then(({ data }) => {
        if (data?.value?.enabled) setReadOnly(true);
      });
  }, []);

  useEffect(() => {
    if (!user) return;
    const name =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      '';
    setDisplayName(name);
  }, [user]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (readOnly) { setProfileMsg({ type: 'error', text: 'The platform is in read-only mode. Changes cannot be saved right now.' }); return; }
    setProfileMsg(null);
    setSavingProfile(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: displayName.trim() },
      });
      if (error) throw error;
      await refreshUser();
      setProfileMsg({ type: 'success', text: 'Display name updated successfully.' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (readOnly) { setPasswordMsg({ type: 'error', text: 'The platform is in read-only mode. Changes cannot be saved right now.' }); return; }
    setPasswordMsg(null);

    if (!currentPassword) {
      setPasswordMsg({ type: 'error', text: 'Please enter your current password.' });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 8 characters.' });
      return;
    }
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setPasswordMsg({
        type: 'error',
        text: 'New password must include uppercase, lowercase, and a number.',
      });
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordMsg({ type: 'error', text: 'New password must be different from your current password.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    if (!user?.email) {
      setPasswordMsg({ type: 'error', text: 'No email on this account. Please sign in again.' });
      return;
    }

    setChangingPassword(true);
    try {
      // Re-authenticate using the current password before allowing the change.
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (reauthError) {
        const msg = (reauthError.message || '').toLowerCase();
        const friendly = msg.includes('invalid login credentials')
          ? 'Current password is incorrect.'
          : reauthError.message || 'Could not verify current password.';
        setPasswordMsg({ type: 'error', text: friendly });
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      // Best-effort hardening: invalidate other active sessions after a password change.
      await supabase.auth.signOut({ scope: 'others' });

      setPasswordMsg({ type: 'success', text: 'Password changed successfully. Other devices have been signed out.' });
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
  if (loading) return <div className="ss-dashboard-page" aria-busy="true" />;

  return (
    <div className="ss-dashboard-page">
      <main className="ss-dashboard-main">

        {readOnly && (
          <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.65rem 1.5rem', background: 'rgba(249,115,22,0.1)', borderBottom: '1px solid rgba(249,115,22,0.3)', color: '#c2410c', fontSize: '0.875rem' }}>
            <i className="fas fa-lock" />
            <span>The platform is currently in <strong>read-only mode</strong>. Changes cannot be saved until it is lifted by an administrator.</span>
          </div>
        )}

        {/* Page title */}
        <div className="ss-dashboard-section">
          <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 1.5rem" }}>
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
          <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 1.5rem" }}>
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
          <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 1.5rem" }}>
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
                <div className="udb-form-group" style={{ marginBottom: '1.25rem', maxWidth: 580 }}>
                  <label htmlFor="current-password">Current Password</label>
                  <input
                    id="current-password"
                    type="password"
                    className="udb-form-input"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                    autoComplete="current-password"
                    required
                  />
                </div>
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
                      required
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
                      required
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
          <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 1.5rem" }}>
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
          <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 1.5rem" }}>
            <Link to="/userdashboard" className="ss-dashboard-btn ss-dashboard-btn-secondary">
              <i className="fas fa-tachometer-alt"></i> Back to Dashboard
            </Link>
          </div>
        </div>

      </main>
    </div>
  );
}


export default SettingsPage;
