import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { nodeApi, laravelApi, getErrorMessage } from '../api/axiosConfig';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';

const PIE_COLORS = ['#22c55e', '#f59e0b', '#3b82f6', '#ef4444'];

export default function Analytics() {
  const { addToast } = useToast();

  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [summary, setSummary] = useState(null);
  const [productivity, setProductivity] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadTeams(); }, []);
  useEffect(() => { if (selectedTeam) loadAnalytics(); }, [selectedTeam]);

  async function loadTeams() {
    try {
      const { data } = await laravelApi.get('/teams');
      const list = data.data || [];
      setTeams(list);
      if (list.length > 0) setSelectedTeam(list[0].id);
    } catch {}
  }

  async function loadAnalytics() {
    setLoading(true);
    try {
      const [sumRes, prodRes, deadRes] = await Promise.all([
        nodeApi.get('/analytics/task-summary', { params: { team_id: selectedTeam } }),
        nodeApi.get('/analytics/team-productivity', { params: { team_id: selectedTeam } }),
        nodeApi.get('/analytics/upcoming-deadlines', { params: { team_id: selectedTeam } }),
      ]);
      setSummary(sumRes.data.data);
      setProductivity(prodRes.data.data || []);
      setDeadlines(deadRes.data.data || []);
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  }

  const pieData = summary
    ? [
        { name: 'Completed', value: summary.completed_tasks },
        { name: 'Pending', value: summary.pending_tasks },
        { name: 'In Progress', value: summary.in_progress_tasks },
        { name: 'Cancelled', value: summary.cancelled_tasks },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        {teams.length > 1 && (
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="input w-44"
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : (
        <>
          {/* Summary Stats */}
          {summary && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Tasks', value: summary.total_tasks, icon: '📋' },
                { label: 'Completed', value: summary.completed_tasks, icon: '✅' },
                { label: 'Completion Rate', value: `${summary.completion_rate}%`, icon: '📈' },
                { label: 'Avg Completion', value: summary.avg_completion_time ? `${summary.avg_completion_time}h` : '—', icon: '⏱️' },
              ].map((s) => (
                <div key={s.label} className="card text-center">
                  <p className="text-2xl mb-1">{s.icon}</p>
                  <p className="text-3xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie chart */}
            {pieData.length > 0 && (
              <div className="card">
                <h2 className="font-semibold text-gray-900 mb-4">Task Distribution</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Bar chart — productivity */}
            {productivity.length > 0 && (
              <div className="card">
                <h2 className="font-semibold text-gray-900 mb-4">Team Productivity</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={productivity} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <XAxis dataKey="user_name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="completed_tasks" name="Completed" fill="#22c55e" />
                    <Bar dataKey="pending_tasks" name="Pending" fill="#f59e0b" />
                    <Bar dataKey="in_progress_tasks" name="In Progress" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Upcoming Deadlines */}
          {deadlines.length > 0 && (
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4">Upcoming Deadlines (Next 7 Days)</h2>
              <div className="space-y-4">
                {deadlines.map((group) => (
                  <div key={group.user_id}>
                    <p className="text-sm font-medium text-gray-700 mb-2">👤 {group.user_name}</p>
                    <div className="ml-6 space-y-1">
                      {group.tasks.map((t) => (
                        <div key={t.id} className="flex items-center justify-between text-sm py-1 border-b border-gray-50">
                          <span className="text-gray-700">{t.title}</span>
                          <span className="text-gray-400 text-xs">{t.due_date ? new Date(t.due_date).toLocaleDateString() : '—'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Per-user table */}
          {productivity.length > 0 && (
            <div className="card overflow-hidden p-0">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Member Performance</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 uppercase bg-gray-50 text-left">
                    <th className="px-5 py-3">Member</th>
                    <th className="px-5 py-3">Total</th>
                    <th className="px-5 py-3">Completed</th>
                    <th className="px-5 py-3">Pending</th>
                    <th className="px-5 py-3">Rate</th>
                    <th className="px-5 py-3">Avg Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {productivity.map((u) => (
                    <tr key={u.user_id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium">{u.user_name}</td>
                      <td className="px-5 py-3">{u.total_tasks}</td>
                      <td className="px-5 py-3 text-green-600">{u.completed_tasks}</td>
                      <td className="px-5 py-3 text-yellow-600">{u.pending_tasks}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-1.5">
                            <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${u.completion_rate}%` }} />
                          </div>
                          <span>{u.completion_rate}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-500">{u.avg_completion_time_hours ? `${u.avg_completion_time_hours}h` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
