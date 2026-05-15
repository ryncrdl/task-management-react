const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-orange-100 text-orange-700',
  high: 'bg-red-100 text-red-700',
};

export default function TaskCard({ task, onClick, isSelectable = false, isSelected = false, onSelect }) {
  const isOverdue =
    task.due_date &&
    new Date(task.due_date) < new Date() &&
    !['completed', 'cancelled'].includes(task.status);

  return (
    <div
      onClick={() => onClick?.(task)}
      className={`card hover:shadow-md transition-all cursor-pointer ${
        isSelected ? 'ring-2 ring-indigo-400 bg-indigo-50/30' : ''
      }`}
    >
      <div className="flex items-start gap-3 mb-3">
        {isSelectable && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
            onClick={(e) => e.stopPropagation()}
            className="mt-0.5 w-4 h-4 flex-shrink-0 accent-indigo-600 cursor-pointer"
          />
        )}
        <div className="flex items-start justify-between gap-2 flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 text-sm leading-snug line-clamp-2">
            {task.title}
          </h3>
          <span className={`badge flex-shrink-0 ${PRIORITY_COLORS[task.priority] || 'bg-gray-100'}`}>
            {task.priority}
          </span>
        </div>
      </div>

      {task.description && (
        <p className="text-gray-500 text-xs line-clamp-2 mb-3">{task.description}</p>
      )}

      <div className="flex items-center justify-between gap-2 mt-auto pt-2 border-t border-gray-50">
        <span className={`badge ${STATUS_COLORS[task.status] || 'bg-gray-100'}`}>
          {task.status?.replace('_', ' ')}
        </span>

        <div className="flex items-center gap-2 text-xs text-gray-400">
          {task.assigned_to && (
            <span className="flex items-center gap-1">
              <span>👤</span>
              <span className="truncate max-w-24">{task.assigned_to.name}</span>
            </span>
          )}
          {task.due_date && (
            <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500 font-medium' : ''}`}>
              <span>📅</span>
              {new Date(task.due_date).toLocaleDateString()}
              {isOverdue && ' ⚠️'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
