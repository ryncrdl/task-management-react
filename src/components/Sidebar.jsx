import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/dashboard',    label: 'Dashboard',     icon: '🏠', roles: ['admin', 'manager', 'member'] },
  { to: '/tasks',        label: 'Tasks',          icon: '✅', roles: ['admin', 'manager', 'member'] },
  { to: '/teams',        label: 'Teams',          icon: '👥', roles: ['admin', 'manager', 'member'] },
  { to: '/users',        label: 'Users',          icon: '👤', roles: ['admin', 'manager'] },
  { to: '/analytics',    label: 'Analytics',      icon: '📊', roles: ['admin', 'manager'] },
  { to: '/activity-log', label: 'Activity Log',   icon: '📜', roles: ['admin', 'manager'] },
  { to: '/settings',     label: 'Settings',       icon: '⚙️', roles: ['admin', 'manager', 'member'] },
];

export default function Sidebar() {
  const { user } = useAuth();

  const visible = navItems.filter((item) => item.roles.includes(user?.role));

  return (
    <aside className="w-60 bg-gray-900 flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-gray-700">
        <span className="text-white font-bold text-lg tracking-tight">📋 TaskFlow</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visible.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User info */}
      <div className="px-4 py-4 border-t border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.name}</p>
            <p className="text-gray-400 text-xs capitalize">{user?.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
