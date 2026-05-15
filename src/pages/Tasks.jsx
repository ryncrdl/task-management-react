import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { laravelApi, getErrorMessage } from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../hooks/useSocket';
import TaskCard from '../components/TaskCard';
import { TaskCardSkeleton } from '../components/Skeletons';
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
  const [search, setSearch] = useState('');
  const searchDebounceRef = useRef(null);

  // Filter presets
  const [presets, setPresets] = useState([]);
  const [presetName, setPresetName] = useState('');
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [savingPreset, setSavingPreset] = useState(false);

  // Batch operations
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [batchAction, setBatchAction] = useState('complete');
  const [batchLoading, setBatchLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Create task modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ title: '', description: '', priority: 'medium', assigned_to: '', due_date: '' });
  const [saving, setSaving] = useState(false);

  const [showExport, setShowExport] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);

  useEffect(() => { loadTeams(); loadPresets(); }, []);
  useEffect(() => { if (selectedTeam) { setPage(1); loadTasks(1); loadTeamMembers(); } }, [selectedTeam, filters, search]);

  // Real-time: reload task list when tasks change in the selected team
  useSocket(
    {
      'task:created':        () => loadTasks(1),
      'task:updated':        () => loadTasks(page),
      'task:deleted':        () => loadTasks(page),
      'task:status_changed': () => loadTasks(page),
    },
    selectedTeam ? [`team:${selectedTeam}`] : [],
  );

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

  async function loadPresets() {
    try {
      const { data } = await laravelApi.get('/task-filter-presets');
      setPresets(data.data || []);
    } catch {}
  }

  const loadTasks = useCallback(async (p = page) => {
    if (!selectedTeam) return;
    setLoading(true);
    setSelectedIds(new Set());
    try {
      const params = { page: p, per_page: 12, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) };
      if (search.trim()) params.search = search.trim();
      const { data } = await laravelApi.get(`/teams/${selectedTeam}/tasks`, { params });
      setTasks(data.data || []);
      setMeta(data.meta);
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedTeam, filters, search, page]);

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

  // ── Filter presets ──────────────────────────────────────────────────────────
  async function handleSavePreset(e) {
    e.preventDefault();
    if (!presetName.trim()) return;
    setSavingPreset(true);
    try {
      const { data } = await laravelApi.post('/task-filter-presets', { name: presetName, filters });
      setPresets((prev) => [...prev, data.data].sort((a, b) => a.name.localeCompare(b.name)));
      setPresetName('');
      setShowSavePreset(false);
      addToast('Filter preset saved.', 'success');
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    } finally {
      setSavingPreset(false);
    }
  }

  async function handleDeletePreset(presetId) {
    try {
      await laravelApi.delete(`/task-filter-presets/${presetId}`);
      setPresets((prev) => prev.filter((p) => p.id !== presetId));
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    }
  }

  function applyPreset(preset) {
    setFilters({ status: '', priority: '', assigned_to: '', ...preset.filters });
    addToast(`Filter preset "${preset.name}" applied.`, 'info');
  }

  // ── Batch operations ────────────────────────────────────────────────────────
  const selectableTasks = tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled');

  function toggleSelect(task) {
    if (task.status === 'completed' || task.status === 'cancelled') return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(task.id) ? next.delete(task.id) : next.add(task.id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === selectableTasks.length && selectableTasks.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableTasks.map((t) => t.id)));
    }
  }

  async function handleBatch() {
    if (selectedIds.size === 0) return;
    setShowConfirm(true);
  }

  async function executeBatch() {
    setShowConfirm(false);
    setBatchLoading(true);
    try {
      const { data } = await laravelApi.post('/tasks/batch', {
        action: batchAction,
        task_ids: [...selectedIds],
      });
      addToast(`${data.data.processed} tasks processed, ${data.data.skipped} skipped.`, 'success');
      setSelectedIds(new Set());
      loadTasks(1);
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    } finally {
      setBatchLoading(false);
    }
  }

  function handleFilterChange(key, val) {
    setFilters((prev) => ({ ...prev, [key]: val }));
  }

  function handleSearchChange(val) {
    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => setSearch(val), 350);
  }

  const hasActiveFilters = filters.status || filters.priority || filters.assigned_to || search;
  const canBatch = isAdmin || isManager;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
        <div className="flex gap-2">
          {selectedTeam && (
            <button onClick={() => setShowExport(true)} className="btn-secondary">↓ Export</button>
          )}
          {(isAdmin || isManager) && selectedTeam && (
            <button onClick={() => setShowCreate(true)} className="btn-primary">+ New Task</button>
          )}
        </div>
      </div>

      {/* Filters + presets */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          <select value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)} className="input w-40">
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>

          {/* Search */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            <input
              type="text"
              defaultValue={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search tasks…"
              className="input pl-8 w-52"
            />
          </div>
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
          {hasActiveFilters && (
            <button onClick={() => { setFilters({ status: '', priority: '', assigned_to: '' }); setSearch(''); }} className="text-sm text-red-500 hover:underline">
              Clear filters
            </button>
          )}
        </div>

        {/* Preset row */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100">
          <span className="text-xs text-gray-400 font-medium">Presets:</span>
          {presets.map((p) => (
            <div key={p.id} className="flex items-center gap-0.5">
              <button
                onClick={() => applyPreset(p)}
                className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2 py-1 rounded-l border border-indigo-200"
              >
                {p.name}
              </button>
              <button
                onClick={() => handleDeletePreset(p.id)}
                className="text-xs bg-red-50 hover:bg-red-100 text-red-500 px-1.5 py-1 rounded-r border border-red-200"
                title="Delete preset"
              >
                ×
              </button>
            </div>
          ))}
          {hasActiveFilters && (
            <button onClick={() => setShowSavePreset(true)} className="text-xs text-indigo-600 hover:underline">
              + Save current filters
            </button>
          )}
        </div>
      </div>

      {/* Batch toolbar */}
      {canBatch && selectableTasks.length > 0 && (
        <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={selectedIds.size > 0 && selectedIds.size === selectableTasks.length}
              ref={(el) => { if (el) el.indeterminate = selectedIds.size > 0 && selectedIds.size < selectableTasks.length; }}
              onChange={toggleSelectAll}
              className="w-4 h-4 accent-indigo-600 cursor-pointer"
            />
            <span className="text-sm text-gray-500">
              {selectedIds.size > 0 ? (
                <span className="font-semibold text-indigo-600">{selectedIds.size} selected</span>
              ) : (
                <span>Select tasks</span>
              )}
            </span>
          </label>

          {selectedIds.size > 0 && (
            <>
              <div className="h-4 w-px bg-gray-200" />
              <select
                value={batchAction}
                onChange={(e) => setBatchAction(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="complete">Mark complete</option>
                <option value="cancel">Mark cancelled</option>
                <option value="delete">Delete</option>
              </select>
              <button
                onClick={handleBatch}
                disabled={batchLoading}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium px-3.5 py-1.5 rounded-lg transition-colors"
              >
                {batchLoading ? <LoadingSpinner size="sm" /> : null}
                Apply to {selectedIds.size}
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-sm text-gray-400 hover:text-gray-600 ml-auto"
              >
                Clear
              </button>
            </>
          )}
        </div>
      )}

      {/* Tasks grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <TaskCardSkeleton key={i} />)}
        </div>
      ) : tasks.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-gray-500">No tasks found matching your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task) => {
            const isSelectable = canBatch && task.status !== 'completed' && task.status !== 'cancelled';
            const isSelected = selectedIds.has(task.id);
            return (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => navigate(`/tasks/${task.id}`)}
                isSelectable={isSelectable}
                isSelected={isSelected}
                onSelect={() => toggleSelect(task)}
              />
            );
          })}
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

      {/* Save preset modal */}
      <Modal isOpen={showSavePreset} onClose={() => setShowSavePreset(false)} title="Save Filter Preset">
        <form onSubmit={handleSavePreset} className="space-y-4">
          <div>
            <label className="label">Preset Name</label>
            <input
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              className="input"
              placeholder="e.g. High Priority Pending"
              required
              autoFocus
            />
          </div>
          <div className="text-xs text-gray-500 bg-gray-50 rounded p-2">
            Saving: {Object.entries(filters).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join(', ')}
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowSavePreset(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={savingPreset}>
              {savingPreset ? 'Saving…' : 'Save Preset'}
            </button>
          </div>
        </form>
      </Modal>

      <ExportModal isOpen={showExport} onClose={() => setShowExport(false)} teamId={selectedTeam} />

      {/* Batch confirm modal */}
      <Modal isOpen={showConfirm} onClose={() => setShowConfirm(false)} title="Confirm Bulk Action" size="sm">
        <div className="space-y-4">
          <p className="text-gray-700">
            Apply <span className="font-semibold text-indigo-600">{batchAction === 'complete' ? 'Mark complete' : batchAction === 'cancel' ? 'Mark cancelled' : 'Delete'}</span> to{' '}
            <span className="font-semibold">{selectedIds.size}</span> selected task{selectedIds.size !== 1 ? 's' : ''}?
          </p>
          {batchAction === 'delete' && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">This action cannot be undone.</p>
          )}
          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => setShowConfirm(false)} className="btn-secondary">Cancel</button>
            <button
              onClick={executeBatch}
              className={`btn-primary ${ batchAction === 'delete' ? 'bg-red-600 hover:bg-red-700' : '' }`}
            >
              Confirm
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
