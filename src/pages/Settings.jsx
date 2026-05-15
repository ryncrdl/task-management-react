import { useState } from 'react';
import { laravelApi, getErrorMessage } from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Settings() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  async function handleUpdateProfile(e) {
    e.preventDefault();
    setSaving(true);
    try {
      // Update via the user endpoint (self-update)
      await laravelApi.patch(`/users/${user.id}`, { name: form.name, email: form.email });
      addToast('Profile updated.', 'success');
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      addToast('New passwords do not match.', 'error');
      return;
    }
    setSavingPwd(true);
    try {
      await laravelApi.patch('/auth/password', {
        current_password:      passwords.current,
        new_password:          passwords.new,
        new_password_confirmation: passwords.confirm,
      });
      addToast('Password changed successfully.', 'success');
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    } finally {
      setSavingPwd(false);
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Profile */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4">Profile Information</h2>
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="input"
              required
            />
          </div>
          <div>
            <label className="label">Email Address</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="input"
              required
            />
          </div>
          <div>
            <label className="label">Role</label>
            <input value={user?.role || ''} className="input bg-gray-50 capitalize" readOnly />
          </div>
          <div className="flex justify-end">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <LoadingSpinner size="sm" /> : null}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Account info */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-3">Account Info</h2>
        <dl className="text-sm space-y-2">
          <div className="flex justify-between">
            <dt className="text-gray-500">User ID</dt>
            <dd className="font-medium text-gray-700">{user?.id}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Account Status</dt>
            <dd>
              <span className="badge bg-green-100 text-green-700">
                {user?.is_active ? 'Active' : 'Inactive'}
              </span>
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Role</dt>
            <dd className="badge bg-blue-100 text-blue-700 capitalize">{user?.role}</dd>
          </div>
        </dl>
      </div>

      {/* Change Password */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4">Change Password</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="label">Current Password</label>
            <input
              type="password"
              value={passwords.current}
              onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
              className="input"
              autoComplete="current-password"
              required
            />
          </div>
          <div>
            <label className="label">New Password</label>
            <input
              type="password"
              value={passwords.new}
              onChange={(e) => setPasswords((p) => ({ ...p, new: e.target.value }))}
              className="input"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input
              type="password"
              value={passwords.confirm}
              onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
              className="input"
              autoComplete="new-password"
              minLength={8}
              required
            />
            {passwords.confirm && passwords.new !== passwords.confirm && (
              <p className="text-xs text-red-500 mt-1">Passwords do not match.</p>
            )}
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="btn-primary"
              disabled={savingPwd || (passwords.confirm && passwords.new !== passwords.confirm)}
            >
              {savingPwd ? <LoadingSpinner size="sm" /> : null}
              {savingPwd ? 'Saving…' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
