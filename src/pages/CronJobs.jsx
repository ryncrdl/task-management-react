import { useEffect, useState, useCallback, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { laravelApi, nodeApi, getErrorMessage } from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const STATUS_STYLES = {
  pending:    'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100  text-blue-700',
  sent:       'bg-green-100 text-green-700',
  failed:     'bg-red-100   text-red-700',
};

const STATUS_ICONS = {
  pending:    '⏳',
  processing: '⚙️',
  sent:       '✅',
  failed:     '❌',
};

const EVENT_LABELS = {
  assigned:       'Task Assigned',
  status_changed: 'Status Changed',
  mentioned:      'Mentioned',
  deactivated:    'Deactivated',
  reactivated:    'Reactivated',
};

export default function CronJobs() {
  const { isAdmin } = useAuth();
  const { addToast } = useToast();

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const [jobs, setJobs]         = useState([]);
  const [stats, setStats]       = useState(null);
  const [crons, setCrons]       = useState([]);
  const [meta, setMeta]         = useState(null);
  const [loading, setLoading]   = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage]         = useState(1);
  const [retrying, setRetrying] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [restarting, setRestarting] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [triggeringJob, setTriggeringJob] = useState(null);
  const [togglingJob, setTogglingJob] = useState(null); // job being paused/resumed
  const autoRefreshRef          = useRef(null);

  const loadStats = useCallback(async () => {
    try {
      const [statsRes, cronRes] = await Promise.allSettled([
        laravelApi.get('/admin/notification-jobs/stats'),
        nodeApi.get('/cron/status'),
      ]);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data.stats);
      if (cronRes.status === 'fulfilled') {
        setCrons(cronRes.value.data.jobs.map((j) => ({
          ...j,
          human: {
            'notification-processor': 'Every 30 seconds',
            'daily-digest':           'Every day at 8:00 AM',
            'deadline-reminder':      'Every 2 hours',
            'task-cleanup':           'Every day at midnight',
          }[j.name] || j.schedule,
        })));
      }
    } catch (_) {}
  }, []);

  const loadJobs = useCallback(async (p, status) => {
    setLoading(true);
    try {
      const params = { page: p, per_page: 20 };
      if (status) params.status = status;
      const { data } = await laravelApi.get('/admin/notification-jobs', { params });
      setJobs(data.data || []);
      setMeta(data.meta);
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const refresh = useCallback(() => {
    loadStats();
    loadJobs(page, statusFilter);
  }, [loadStats, loadJobs, page, statusFilter]);

  // Initial load
  useEffect(() => {
    loadStats();
    loadJobs(1, '');
  }, []); // eslint-disable-line

  // Reload when filter or page changes
  useEffect(() => {
    loadJobs(page, statusFilter);
  }, [page, statusFilter]); // eslint-disable-line

  // Auto-refresh every 30 s
  useEffect(() => {
    autoRefreshRef.current = setInterval(refresh, 30000);
    return () => clearInterval(autoRefreshRef.current);
  }, [refresh]);

  async function handleRetry(id) {
    setRetrying(id);
    try {
      await laravelApi.post(`/admin/notification-jobs/${id}/retry`);
      addToast('Job queued for retry.', 'success');
      refresh();
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    } finally {
      setRetrying(null);
    }
  }

  async function handleDelete(id) {
    setDeleting(id);
    try {
      await laravelApi.delete(`/admin/notification-jobs/${id}`);
      addToast('Job deleted.', 'success');
      refresh();
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    } finally {
      setDeleting(null);
    }
  }

  async function handleRestartCron() {
    setRestarting(true);
    try {
      await nodeApi.post('/cron/restart');
      addToast('Cron scheduler restarted.', 'success');
      refresh();
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    } finally {
      setRestarting(false);
    }
  }

  async function handleTriggerNow() {
    setTriggering(true);
    try {
      await nodeApi.post('/cron/trigger/notification-processor');
      addToast('Notification processor triggered.', 'success');
      setTimeout(refresh, 1500);
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    } finally {
      setTriggering(false);
    }
  }

  async function handleTriggerJob(jobKey) {
    setTriggeringJob(jobKey);
    try {
      await nodeApi.post(`/cron/trigger/${jobKey}`);
      addToast(`${jobKey} triggered successfully.`, 'success');
      setTimeout(refresh, 1500);
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    } finally {
      setTriggeringJob(null);
    }
  }

  async function handleToggleJob(job) {
    setTogglingJob(job.name);
    try {
      const action = job.paused ? 'resume' : 'pause';
      const { data } = await nodeApi.post(`/cron/${action}/${job.name}`);
      setCrons(data.jobs.map((j) => ({
        ...j,
        human: {
          'notification-processor': 'Every 30 seconds',
          'daily-digest':           'Every day at 8:00 AM',
          'deadline-reminder':      'Every 2 hours',
          'task-cleanup':           'Every day at midnight',
        }[j.name] || j.schedule,
      })));
      addToast(`${job.name} ${action}d.`, 'success');
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    } finally {
      setTogglingJob(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cron Jobs</h1>
          <p className="text-sm text-gray-500 mt-0.5">Monitor scheduled jobs and notification queue</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleTriggerNow} disabled={triggering} className="btn-secondary flex items-center gap-2 text-sm">
            {triggering ? '⏳ Running...' : '▶ Run Now'}
          </button>
          <button onClick={handleRestartCron} disabled={restarting} className="btn-secondary flex items-center gap-2 text-sm">
            {restarting ? '⏳ Restarting...' : '↺ Restart Cron'}
          </button>
          <button onClick={refresh} className="btn-secondary flex items-center gap-2 text-sm">
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Scheduled cron jobs */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-800 mb-3">Scheduled Jobs</h2>
        <div className="divide-y divide-gray-100">
          {crons.length === 0 && (
            <p className="text-sm text-gray-400 py-3">Loading...</p>
          )}
          {crons.map((c) => (
            <div key={c.name} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-gray-800">{c.name}</p>
                <p className="text-xs text-gray-500">{c.description}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <code className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded block">{c.schedule}</code>
                  <span className="text-xs text-gray-400">{c.human}</span>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  c.paused  ? 'bg-yellow-100 text-yellow-700' :
                  c.running ? 'bg-green-100 text-green-700'   :
                              'bg-gray-100 text-gray-500'
                }`}>
                  {c.paused ? '⏸ Paused' : c.running ? '● Running' : '○ Stopped'}
                </span>
                {/* Pause / Resume toggle */}
                {(c.running || c.paused) && (
                  <button
                    onClick={() => handleToggleJob(c)}
                    disabled={togglingJob === c.name}
                    className={`text-xs px-2 py-1 rounded border font-medium transition-colors ${
                      c.paused
                        ? 'border-green-400 text-green-600 hover:bg-green-50'
                        : 'border-yellow-400 text-yellow-600 hover:bg-yellow-50'
                    } disabled:opacity-50`}
                    title={c.paused ? `Resume ${c.name}` : `Pause ${c.name}`}
                  >
                    {togglingJob === c.name ? '⏳' : c.paused ? '▶ Resume' : '⏸ Pause'}
                  </button>
                )}
                {/* Manual trigger (not for notification-processor) */}
                {c.name !== 'notification-processor' && (
                  <button
                    onClick={() => handleTriggerJob(c.name)}
                    disabled={triggeringJob === c.name || c.paused}
                    className="btn-secondary text-xs px-2 py-1 disabled:opacity-40"
                    title={c.paused ? 'Resume job first' : `Manually run ${c.name}`}
                  >
                    {triggeringJob === c.name ? '⏳' : '▶ Run'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats summary */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Pending',    key: 'pending',    color: 'text-yellow-600' },
            { label: 'Processing', key: 'processing', color: 'text-blue-600'   },
            { label: 'Sent',       key: 'sent',       color: 'text-green-600'  },
            { label: 'Failed',     key: 'failed',     color: 'text-red-600'    },
          ].map(({ label, key, color }) => (
            <button
              key={key}
              onClick={() => { setStatusFilter(statusFilter === key ? '' : key); setPage(1); }}
              className={`card text-center cursor-pointer transition-all hover:shadow-md ${statusFilter === key ? 'ring-2 ring-indigo-500' : ''}`}
            >
              <p className={`text-3xl font-bold ${color}`}>{stats[key] ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">{label}</p>
            </button>
          ))}
        </div>
      )}

      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600 font-medium">Filter:</span>
        {['', 'pending', 'processing', 'sent', 'failed'].map((s) => (
          <button
            key={s || 'all'}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`text-sm px-3 py-1 rounded-full border transition-colors ${
              statusFilter === s
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
            }`}
          >
            {s ? STATUS_ICONS[s] + ' ' + s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
          </button>
        ))}
      </div>

      {/* Jobs table */}
      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading jobs...</div>
        ) : jobs.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No jobs found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Event</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Recipient</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Attempts</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Scheduled</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Processed</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">#{job.id}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-800">
                        {EVENT_LABELS[job.event_type] || job.event_type}
                      </span>
                      {job.task_id && (
                        <span className="ml-1 text-xs text-gray-400">task #{job.task_id}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {job.recipient_name && (
                        <p className="font-medium text-gray-800">{job.recipient_name}</p>
                      )}
                      <p className="text-xs text-gray-500">{job.recipient_email || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[job.status]}`}>
                        {STATUS_ICONS[job.status]} {job.status}
                      </span>
                      {job.error_message && (
                        <p className="text-xs text-red-500 mt-1 max-w-xs truncate" title={job.error_message}>
                          {job.error_message}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">{job.attempts}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(job.scheduled_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {job.processed_at ? new Date(job.processed_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {job.status === 'failed' && (
                          <button
                            onClick={() => handleRetry(job.id)}
                            disabled={retrying === job.id}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium disabled:opacity-50"
                          >
                            {retrying === job.id ? '...' : '↻ Retry'}
                          </button>
                        )}
                        {(job.status === 'sent' || job.status === 'failed') && (
                          <button
                            onClick={() => handleDelete(job.id)}
                            disabled={deleting === job.id}
                            className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
                          >
                            {deleting === job.id ? '...' : '🗑 Delete'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {meta && meta.last_page > 1 && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm px-3 py-1 disabled:opacity-40">
            ← Prev
          </button>
          <span className="text-sm text-gray-500 self-center">Page {page} of {meta.last_page}</span>
          <button onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))} disabled={page === meta.last_page} className="btn-secondary text-sm px-3 py-1 disabled:opacity-40">
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
