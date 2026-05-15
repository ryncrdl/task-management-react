import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { laravelApi } from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { StatCardSkeleton, TaskCardSkeleton } from '../components/Skeletons';
import TaskCard from '../components/TaskCard';

export default function Dashboard() {
  const { user, isAdmin, isManager } = useAuth();
  const navigate = useNavigate();

  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, in_progress: 0, completed: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeams();
  }, []);

  useEffect(() => {
    if (selectedTeam) loadTasks();
  }, [selectedTeam]);

  async function loadTeams() {
    try {
      const { data } = await laravelApi.get('/teams');
      const list = data.data || [];
      setTeams(list);
      if (list.length > 0) setSelectedTeam(list[0].id);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function loadTasks() {
    setLoading(true);
    try {
      const { data } = await laravelApi.get(`/teams/${selectedTeam}/tasks`, {
        params: { per_page: 20 },
      });
      const list = data.data || [];
      setTasks(list);

      // Compute stats
      setStats({
        total: list.length,
        pending: list.filter((t) => t.status === 'pending').length,
        in_progress: list.filter((t) => t.status === 'in_progress').length,
        completed: list.filter((t) => t.status === 'completed').length,
      });
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  const statCards = [
    { label: 'Total Tasks', value: stats.total, color: 'blue', icon: '📋' },
    { label: 'Pending', value: stats.pending, color: 'yellow', icon: '⏳' },
    { label: 'In Progress', value: stats.in_progress, color: 'indigo', icon: '🔄' },
    { label: 'Completed', value: stats.completed, color: 'green', icon: '✅' },
  ];

  const colorMap = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-100',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    green: 'bg-green-50 text-green-700 border-green-100',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Good morning, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-500 mt-1">Here's what's happening across your teams.</p>
        </div>

        {teams.length > 1 && (
          <select
            value={selectedTeam || ''}
            onChange={(e) => setSelectedTeam(Number(e.target.value))}
            className="input w-48"
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          : statCards.map((card) => (
          <div key={card.label} className={`card border ${colorMap[card.color]} p-5`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide opacity-70">{card.label}</p>
                <p className="text-3xl font-bold mt-1">{card.value}</p>
              </div>
              <span className="text-2xl opacity-60">{card.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Recent tasks */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Tasks</h2>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <TaskCardSkeleton key={i} />)}
          </div>
        ) : tasks.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-400 text-4xl mb-3">📭</p>
            <p className="text-gray-500">No tasks yet. Create one to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasks.slice(0, 6).map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => navigate(`/tasks/${task.id}`)}
              />
            ))}
          </div>
        )}

        {tasks.length > 0 && (
          <button
            onClick={() => navigate('/tasks')}
            className="mt-4 text-sm text-blue-600 hover:underline"
          >
            View all tasks →
          </button>
        )}
      </div>
    </div>
  );
}
