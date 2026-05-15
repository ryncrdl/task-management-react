import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { laravelApi, getErrorMessage } from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';

const STATUS_TRANSITIONS = {
  pending: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'pending'],
  completed: [],
  cancelled: [],
};

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const PRIORITY_COLORS = {
  low: 'text-gray-500', medium: 'text-orange-500', high: 'text-red-600',
};

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin, isManager } = useAuth();
  const { addToast } = useToast();

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [teamMembers, setTeamMembers] = useState([]);

  useEffect(() => { loadTask(); }, [id]);

  async function loadTask() {
    setLoading(true);
    try {
      const { data } = await laravelApi.get(`/tasks/${id}`);
      const t = data.data;
      setTask(t);
      setEditForm({
        title: t.title,
        description: t.description || '',
        priority: t.priority,
        assigned_to: t.assigned_to?.id || '',
        due_date: t.due_date ? t.due_date.slice(0, 16) : '',
      });
      if (t.team?.id) loadTeamMembers(t.team.id);
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
      navigate('/tasks');
    } finally {
      setLoading(false);
    }
  }

  async function loadTeamMembers(teamId) {
    try {
      const { data } = await laravelApi.get(`/teams/${teamId}`);
      setTeamMembers(data.data?.members || []);
    } catch {}
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await laravelApi.patch(`/tasks/${id}`, {
        ...editForm,
        assigned_to: editForm.assigned_to || null,
        due_date: editForm.due_date || null,
      });
      setTask(data.data);
      setEditing(false);
      addToast('Task updated.', 'success');
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(newStatus) {
    try {
      const { data } = await laravelApi.patch(`/tasks/${id}/status`, { status: newStatus });
      setTask(data.data);
      addToast(`Status updated to "${newStatus.replace('_', ' ')}".`, 'success');
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this task? This action cannot be undone.')) return;
    try {
      await laravelApi.delete(`/tasks/${id}`);
      addToast('Task deleted.', 'success');
      navigate('/tasks');
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    }
  }

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>;
  if (!task) return null;

  const canEdit = isAdmin || isManager || task.assigned_to?.id === user?.id;
  const canDelete = isAdmin || task.created_by?.id === user?.id;
  const transitions = STATUS_TRANSITIONS[task.status] || [];
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !['completed', 'cancelled'].includes(task.status);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/tasks')} className="text-gray-400 hover:text-gray-600 text-lg">←</button>
        <h1 className="text-xl font-bold text-gray-900 flex-1">Task Detail</h1>
        {canDelete && (
          <button onClick={handleDelete} className="btn-danger text-xs px-3 py-1.5">Delete</button>
        )}
      </div>

      <div className="card space-y-5">
        {/* Title + badges */}
        <div className="flex items-start gap-3">
          <div className="flex-1">
            {editing ? (
              <input value={editForm.title} onChange={(e) => setEditForm(f => ({ ...f, title: e.target.value }))} className="input text-lg font-semibold" />
            ) : (
              <h2 className="text-xl font-semibold text-gray-900">{task.title}</h2>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span className={`badge ${STATUS_COLORS[task.status]}`}>{task.status?.replace('_', ' ')}</span>
              <span className={`text-sm font-medium ${PRIORITY_COLORS[task.priority]}`}>● {task.priority}</span>
              {isOverdue && <span className="badge bg-red-100 text-red-700">⚠️ Overdue</span>}
            </div>
          </div>
          {canEdit && !editing && (
            <button onClick={() => setEditing(true)} className="btn-secondary text-xs">Edit</button>
          )}
        </div>

        {/* Description */}
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase mb-1">Description</p>
          {editing ? (
            <textarea value={editForm.description} onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))} className="input h-28 resize-none" />
          ) : (
            <p className="text-gray-700 text-sm">{task.description || <span className="text-gray-400 italic">No description.</span>}</p>
          )}
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase mb-1">Assigned To</p>
            {editing && (isAdmin || isManager) ? (
              <select value={editForm.assigned_to} onChange={(e) => setEditForm(f => ({ ...f, assigned_to: e.target.value }))} className="input">
                <option value="">Unassigned</option>
                {teamMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            ) : (
              <p className="text-sm text-gray-700">{task.assigned_to?.name || '—'}</p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase mb-1">Team</p>
            <p className="text-sm text-gray-700">{task.team?.name || '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase mb-1">Priority</p>
            {editing ? (
              <select value={editForm.priority} onChange={(e) => setEditForm(f => ({ ...f, priority: e.target.value }))} className="input">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            ) : (
              <p className={`text-sm font-medium ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase mb-1">Due Date</p>
            {editing ? (
              <input type="datetime-local" value={editForm.due_date} onChange={(e) => setEditForm(f => ({ ...f, due_date: e.target.value }))} className="input" />
            ) : (
              <p className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-700'}`}>
                {task.due_date ? new Date(task.due_date).toLocaleString() : '—'}
              </p>
            )}
          </div>
        </div>

        {editing && (
          <div className="flex gap-3 pt-3 border-t">
            <button onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} className="btn-primary" disabled={saving}>
              {saving ? <LoadingSpinner size="sm" /> : null}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {/* Status transitions */}
      {canEdit && transitions.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-3">Update Status</h3>
          <div className="flex flex-wrap gap-2">
            {transitions.map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                className="btn-secondary capitalize"
              >
                → {s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="text-xs text-gray-400 space-y-1">
        <p>Created by: <span className="text-gray-500">{task.created_by?.name}</span></p>
        <p>Created: <span className="text-gray-500">{new Date(task.created_at).toLocaleString()}</span></p>
        <p>Last updated: <span className="text-gray-500">{new Date(task.updated_at).toLocaleString()}</span></p>
      </div>
    </div>
  );
}
