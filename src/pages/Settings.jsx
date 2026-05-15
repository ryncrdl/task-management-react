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
    </div>
  );
}
