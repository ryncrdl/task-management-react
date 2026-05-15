import { useEffect, useState, useCallback, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { laravelApi, getErrorMessage } from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ActivityLogSkeleton } from '../components/Skeletons';

const ACTION_COLORS = {
  created:        'bg-green-100 text-green-700',
  updated:        'bg-blue-100 text-blue-700',
  deleted:        'bg-red-100 text-red-700',
  commented:      'bg-purple-100 text-purple-700',
  status_changed: 'bg-yellow-100 text-yellow-700',
};

const ACTION_ICONS = {
  created:        '➕',
  updated:        '✏️',
  deleted:        '🗑️',
  commented:      '💬',
  status_changed: '🔄',
};

export default function ActivityLog() {
  const { isAdmin, isManager } = useAuth();
  const { addToast } = useToast();

  if (!isAdmin && !isManager) {
    return <Navigate to="/dashboard" replace />;
  }

  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ action: '', search: '', date_from: '', date_to: '' });
  const [searchInput, setSearchInput] = useState('');
  const searchTimerRef = useRef(null);

  const loadLogs = useCallback(async (p) => {
    setLoading(true);
    try {
      const params = { page: p, per_page: 20 };
      if (filters.action)    params.action    = filters.action;
      if (filters.search)    params.search    = filters.search;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to)   params.date_to   = filters.date_to;
      const { data } = await laravelApi.get('/activity-logs', { params });
      setLogs(data.data || []);
      setMeta(data.meta);
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, addToast]);

  useEffect(() => {
    setPage(1);
    loadLogs(1);
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Skip page 1 — already loaded by the filters effect above
    if (page !== 1) loadLogs(page);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Activity Log</h1>
        <button onClick={() => loadLogs(page)} className="btn-secondary text-sm">↻ Refresh</button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Search */}
          <div className="flex-1 min-w-48">
            <label className="label">Search</label>
            <input
              type="text"
              placeholder="Actor name or subject…"
              value={searchInput}
              onChange={(e) => {
                const val = e.target.value;
                setSearchInput(val);
                clearTimeout(searchTimerRef.current);
                searchTimerRef.current = setTimeout(
                  () => setFilters((f) => ({ ...f, search: val })),
                  350
                );
              }}
              className="input"
            />
          </div>

          {/* Action */}
          <div className="min-w-44">
            <label className="label">Action</label>
            <select
              value={filters.action}
              onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
              className="input"
            >
              <option value="">All actions</option>
              <option value="created">Created</option>
              <option value="updated">Updated</option>
              <option value="deleted">Deleted</option>
              <option value="status_changed">Status changed</option>
              <option value="commented">Commented</option>
            </select>
          </div>

          {/* Date from */}
          <div>
            <label className="label">From</label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value }))}
              className="input"
            />
          </div>

          {/* Date to */}
          <div>
            <label className="label">To</label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value }))}
              className="input"
            />
          </div>

          {/* Clear */}
          {(filters.action || filters.search || filters.date_from || filters.date_to) && (
            <button
              onClick={() => {
                setSearchInput('');
                setFilters({ action: '', search: '', date_from: '', date_to: '' });
              }}
              className="text-sm text-indigo-600 hover:underline self-end pb-2"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Log entries */}
      {loading ? (
        <div className="card divide-y divide-gray-100">
          {Array.from({ length: 6 }).map((_, i) => <ActivityLogSkeleton key={i} />)}
        </div>
      ) : logs.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">No activity found.</div>
      ) : (
        <div className="card divide-y divide-gray-100">
          {logs.map((log) => (
            <div key={log.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
                {log.actor?.name?.[0]?.toUpperCase() ?? '?'}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-gray-800">{log.actor?.name ?? 'System'}</span>
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-600'}`}>
                    {ACTION_ICONS[log.action]} {log.action.replace('_', ' ')}
                  </span>
                  {log.subject_name && (
                    <span className="text-sm text-gray-600 truncate">
                      on <span className="font-medium">{log.subject_name}</span>
                    </span>
                  )}
                </div>

                {/* Change diff */}
                {log.old_values && log.new_values && (
                  <div className="mt-1 text-xs text-gray-500 space-y-0.5">
                    {Object.keys(log.new_values).map((field) => (
                      field !== 'comment_body' && (
                        <div key={field}>
                          <span className="font-medium">{field}:</span>{' '}
                          <span className="line-through text-red-400">{String(log.old_values[field] ?? '—')}</span>
                          {' → '}
                          <span className="text-green-600">{String(log.new_values[field] ?? '—')}</span>
                        </div>
                      )
                    ))}
                    {log.new_values.comment_body && (
                      <div className="italic text-purple-600">"{log.new_values.comment_body}"</div>
                    )}
                  </div>
                )}

                <p className="text-xs text-gray-400 mt-1">{new Date(log.created_at).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.last_page > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary"
          >
            ← Prev
          </button>
          <span className="flex items-center text-sm text-gray-600 px-3">
            Page {meta.current_page} of {meta.last_page}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
            disabled={page === meta.last_page}
            className="btn-secondary"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
