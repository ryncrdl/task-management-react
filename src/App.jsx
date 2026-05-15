import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import TaskDetail from './pages/TaskDetail';
import Teams from './pages/Teams';
import Users from './pages/Users';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import ActivityLog from './pages/ActivityLog';
import CronJobs from './pages/CronJobs';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <NotificationProvider>
            <Routes>
              {/* Public */}
              <Route path="/login" element={<Login />} />

              {/* Protected */}
              <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/tasks" element={<Tasks />} />
                  <Route path="/tasks/:id" element={<TaskDetail />} />
                  <Route path="/teams" element={<Teams />} />
                  <Route path="/users" element={<Users />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/activity-log" element={<ActivityLog />} />
                  <Route path="/cron-jobs" element={<CronJobs />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </NotificationProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
