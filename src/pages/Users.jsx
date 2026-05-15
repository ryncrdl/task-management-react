import { useEffect, useState } from 'react';
import { laravelApi, getErrorMessage } from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import { UserRowSkeleton } from '../components/Skeletons';

export default function Users() {
  const { isAdmin, isManager } = useAuth();
  const { addToast } = useToast();

  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ role: '', status: '' });

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', email: '', password: '', role: 'member' });
  const [saving, setSaving] = useState(false);

  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', role: '' });

  const [resetUser, setResetUser] = useState(null);
  const [resetPwd, setResetPwd] = useState({ new: '', confirm: '' });
  const [savingReset, setSavingReset] = useState(false);

  useEffect(() => { loadUsers(1); }, [filters]);

  async function loadUsers(p = page) {
    setLoading(true);
    try {
      const params = { page: p, per_page: 15, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) };
      const { data } = await laravelApi.get('/users', { params });
      setUsers(data.data || []);
      setMeta(data.meta);
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    } finally { setLoading(false); }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await laravelApi.post('/users', createForm);
      addToast('User created.', 'success');
      setShowCreate(false);
      setCreateForm({ name: '', email: '', password: '', role: 'member' });
      loadUsers(1);
    } catch (err) { addToast(getErrorMessage(err), 'error'); }
    finally { setSaving(false); }
  }

  async function handleUpdate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await laravelApi.patch(`/users/${editUser.id}`, editForm);
      addToast('User updated.', 'success');
      setEditUser(null);
      loadUsers(page);
    } catch (err) { addToast(getErrorMessage(err), 'error'); }
    finally { setSaving(false); }
  }

  async function handleToggleStatus(u) {
    try {
      await laravelApi.patch(`/users/${u.id}/status`);
      addToast(`User ${u.is_active ? 'deactivated' : 'activated'}.`, 'success');
      loadUsers(page);
    } catch (err) { addToast(getErrorMessage(err), 'error'); }
  }

  function openEdit(u) {
    setEditUser(u);
    setEditForm({ name: u.name, email: u.email, role: u.role });
  }

  function openReset(u) {
    setResetUser(u);
    setResetPwd({ new: '', confirm: '' });
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    if (resetPwd.new !== resetPwd.confirm) {
      addToast('Passwords do not match.', 'error');
      return;
    }
    setSavingReset(true);
    try {
      await laravelApi.patch(`/users/${resetUser.id}/password`, {
        new_password: resetPwd.new,
        new_password_confirmation: resetPwd.confirm,
      });
      addToast(`Password for ${resetUser.name} has been reset.`, 'success');
      setResetUser(null);
    } catch (err) { addToast(getErrorMessage(err), 'error'); }
    finally { setSavingReset(false); }
  }

  const roleBadge = { admin: 'bg-purple-100 text-purple-700', manager: 'bg-blue-100 text-blue-700', member: 'bg-gray-100 text-gray-700' };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary">+ New User</button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <select value={filters.role} onChange={(e) => setFilters(f => ({ ...f, role: e.target.value }))} className="input w-36">
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="member">Member</option>
        </select>
        <select value={filters.status} onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))} className="input w-36">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {loading ? (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase bg-gray-50">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Array.from({ length: 5 }).map((_, i) => <UserRowSkeleton key={i} />)}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase bg-gray-50">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium">{u.name}</td>
                  <td className="px-5 py-3 text-gray-500">{u.email}</td>
                  <td className="px-5 py-3"><span className={`badge capitalize ${roleBadge[u.role]}`}>{u.role}</span></td>
                  <td className="px-5 py-3">
                    <span className={`badge ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(u)} className="text-xs text-blue-600 hover:underline">Edit</button>
                      <button onClick={() => openReset(u)} className="text-xs text-indigo-600 hover:underline">Reset pwd</button>
                      <button onClick={() => handleToggleStatus(u)} className={`text-xs hover:underline ${u.is_active ? 'text-red-500' : 'text-green-600'}`}>
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => { setPage(p => p - 1); loadUsers(page - 1); }} disabled={page <= 1} className="btn-secondary">← Prev</button>
          <span className="text-sm text-gray-600">Page {meta.current_page} of {meta.last_page}</span>
          <button onClick={() => { setPage(p => p + 1); loadUsers(page + 1); }} disabled={page >= meta.last_page} className="btn-secondary">Next →</button>
        </div>
      )}

      {/* Create User Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create User">
        <form onSubmit={handleCreate} className="space-y-4">
          <div><label className="label">Name *</label><input value={createForm.name} onChange={(e) => setCreateForm(f => ({ ...f, name: e.target.value }))} className="input" required /></div>
          <div><label className="label">Email *</label><input type="email" value={createForm.email} onChange={(e) => setCreateForm(f => ({ ...f, email: e.target.value }))} className="input" required /></div>
          <div><label className="label">Password * (min 8 chars)</label><input type="password" value={createForm.password} onChange={(e) => setCreateForm(f => ({ ...f, password: e.target.value }))} className="input" minLength={8} required /></div>
          {isAdmin && (
            <div>
              <label className="label">Role</label>
              <select value={createForm.role} onChange={(e) => setCreateForm(f => ({ ...f, role: e.target.value }))} className="input">
                <option value="member">Member</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2 border-t">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create User'}</button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal isOpen={!!editUser} onClose={() => setEditUser(null)} title="Edit User">
        <form onSubmit={handleUpdate} className="space-y-4">
          <div><label className="label">Name</label><input value={editForm.name} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))} className="input" /></div>
          <div><label className="label">Email</label><input type="email" value={editForm.email} onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))} className="input" /></div>
          {isAdmin && (
            <div>
              <label className="label">Role</label>
              <select value={editForm.role} onChange={(e) => setEditForm(f => ({ ...f, role: e.target.value }))} className="input">
                <option value="member">Member</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2 border-t">
            <button type="button" onClick={() => setEditUser(null)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal isOpen={!!resetUser} onClose={() => setResetUser(null)} title={`Reset Password — ${resetUser?.name}`}>
        <form onSubmit={handleResetPassword} className="space-y-4">
          <p className="text-sm text-gray-500">Set a new password for this user. They will need to use it on their next login.</p>
          <div>
            <label className="label">New Password (min 8 chars)</label>
            <input
              type="password"
              value={resetPwd.new}
              onChange={(e) => setResetPwd((p) => ({ ...p, new: e.target.value }))}
              className="input"
              minLength={8}
              autoComplete="new-password"
              required
            />
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input
              type="password"
              value={resetPwd.confirm}
              onChange={(e) => setResetPwd((p) => ({ ...p, confirm: e.target.value }))}
              className="input"
              minLength={8}
              autoComplete="new-password"
              required
            />
            {resetPwd.confirm && resetPwd.new !== resetPwd.confirm && (
              <p className="text-xs text-red-500 mt-1">Passwords do not match.</p>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t">
            <button type="button" onClick={() => setResetUser(null)} className="btn-secondary">Cancel</button>
            <button
              type="submit"
              className="btn-primary"
              disabled={savingReset || (resetPwd.confirm && resetPwd.new !== resetPwd.confirm)}
            >
              {savingReset ? 'Resetting…' : 'Reset Password'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
