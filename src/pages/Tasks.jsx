import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { laravelApi, getErrorMessage } from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import TaskCard from '../components/TaskCard';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import ExportModal from '../components/ExportModal';

export default function Tasks() {
  const { user, isAdmin, isManager } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [tasks, setTasks] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // Filters
  const [filters, setFilters] = useState({ status: '', priority: '', assigned_to: '' });

  // Create task modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ title: '', description: '', priority: 'medium', assigned_to: '', due_date: '' });
  const [saving, setSaving] = useState(false);

  const [showExport, setShowExport] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);

  useEffect(() => { loadTeams(); }, []);
  useEffect(() => { if (selectedTeam) { setPage(1); loadTasks(1); loadTeamMembers(); } }, [selectedTeam, filters]);

  async function loadTeams() {
    try {
      const { data } = await laravelApi.get('/teams');
      const list = data.data || [];
      setTeams(list);
      if (list.length > 0) setSelectedTeam(list[0].id);
    } catch {}
  }

  async function loadTeamMembers() {
    if (!selectedTeam) return;
    try {
      const { data } = await laravelApi.get(`/teams/${selectedTeam}`);
      setTeamMembers(data.data?.members || []);
    } catch {}
  }

  const loadTasks = useCallback(async (p = page) => {
    if (!selectedTeam) return;
    setLoading(true);
    try {
      const params = { page: p, per_page: 12, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) };
      const { data } = await laravelApi.get(`/teams/${selectedTeam}/tasks`, { params });
      setTasks(data.data || []);
      setMeta(data.meta);
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedTeam, filters, page]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!createForm.title.trim()) { addToast('Title is required.', 'warning'); return; }

    setSaving(true);
    try {
      await laravelApi.post(`/teams/${selectedTeam}/tasks`, {
        ...createForm,
        assigned_to: createForm.assigned_to || null,
        due_date: createForm.due_date || null,
      });
      addToast('Task created successfully.', 'success');
      setShowCreate(false);
      setCreateForm({ title: '', description: '', priority: 'medium', assigned_to: '', due_date: '' });
      loadTasks(1);
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  }

  function handleFilterChange(key, val) {
    setFilters((prev) => ({ ...prev, [key]: val }));
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
        <div className="flex gap-2">
          {selectedTeam && (
            <button onClick={() => setShowExport(true)} className="btn-secondary">
              ↓ Export
            </button>
          )}
          {(isAdmin || isManager) && selectedTeam && (
            <button onClick={() => setShowCreate(true)} className="btn-primary">
              + New Task
            </button>
          )}
        </div>
      </div>

      {/* Team selector + Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <select value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)} className="input w-40">
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)} className="input w-36">
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select value={filters.priority} onChange={(e) => handleFilterChange('priority', e.target.value)} className="input w-32">
            <option value="">All priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          {teamMembers.length > 0 && (
            <select value={filters.assigned_to} onChange={(e) => handleFilterChange('assigned_to', e.target.value)} className="input w-40">
              <option value="">All assignees</option>
              {teamMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          )}
          {(filters.status || filters.priority || filters.assigned_to) && (
            <button onClick={() => setFilters({ status: '', priority: '', assigned_to: '' })} className="text-sm text-red-500 hover:underline">Clear filters</button>
          )}
        </div>
      </div>

      {/* Tasks grid */}
      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : tasks.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-gray-500">No tasks found matching your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={() => navigate(`/tasks/${task.id}`)} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => { setPage(p => p - 1); loadTasks(page - 1); }} disabled={page <= 1} className="btn-secondary">← Prev</button>
          <span className="text-sm text-gray-600">Page {meta.current_page} of {meta.last_page}</span>
          <button onClick={() => { setPage(p => p + 1); loadTasks(page + 1); }} disabled={page >= meta.last_page} className="btn-secondary">Next →</button>
        </div>
      )}

      {/* Create Task Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create New Task">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Title *</label>
            <input value={createForm.title} onChange={(e) => setCreateForm(f => ({ ...f, title: e.target.value }))} className="input" placeholder="Task title" required />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea value={createForm.description} onChange={(e) => setCreateForm(f => ({ ...f, description: e.target.value }))} className="input h-24 resize-none" placeholder="Optional description" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Priority</label>
              <select value={createForm.priority} onChange={(e) => setCreateForm(f => ({ ...f, priority: e.target.value }))} className="input">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="label">Assign To</label>
              <select value={createForm.assigned_to} onChange={(e) => setCreateForm(f => ({ ...f, assigned_to: e.target.value }))} className="input">
                <option value="">Unassigned</option>
                {teamMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Due Date</label>
            <input type="datetime-local" value={createForm.due_date} onChange={(e) => setCreateForm(f => ({ ...f, due_date: e.target.value }))} className="input" />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <LoadingSpinner size="sm" /> : null}
              {saving ? 'Creating…' : 'Create Task'}
            </button>
          </div>
        </form>
      </Modal>

      <ExportModal isOpen={showExport} onClose={() => setShowExport(false)} teamId={selectedTeam} />
    </div>
  );
}
