// ── Shared skeleton building block ───────────────────────────────────────────
const Bone = ({ className = '' }) => (
  <div className={`bg-gray-200 rounded animate-pulse ${className}`} />
);

// ── Task card skeleton (matches TaskCard layout) ──────────────────────────────
export function TaskCardSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-1 space-y-2">
          <Bone className="h-4 w-3/4" />
          <Bone className="h-3 w-1/2" />
        </div>
        <Bone className="h-5 w-14 rounded-full flex-shrink-0" />
      </div>
      <div className="space-y-1.5 mb-4">
        <Bone className="h-3 w-full" />
        <Bone className="h-3 w-4/5" />
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <Bone className="h-5 w-16 rounded-full" />
        <div className="flex items-center gap-2">
          <Bone className="h-3 w-20" />
          <Bone className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
}

// ── Team card skeleton ────────────────────────────────────────────────────────
export function TeamCardSkeleton() {
  return (
    <div className="card animate-pulse space-y-3">
      <div className="flex items-center justify-between">
        <Bone className="h-5 w-32" />
        <Bone className="h-5 w-20 rounded-full" />
      </div>
      <Bone className="h-3 w-40" />
      <div className="flex gap-2 pt-1">
        <Bone className="h-8 w-28 rounded-lg" />
        <Bone className="h-8 w-28 rounded-lg" />
      </div>
    </div>
  );
}

// ── User table row skeleton ───────────────────────────────────────────────────
export function UserRowSkeleton() {
  return (
    <tr className="animate-pulse">
      <td className="px-5 py-3"><Bone className="h-4 w-32" /></td>
      <td className="px-5 py-3"><Bone className="h-4 w-44" /></td>
      <td className="px-5 py-3"><Bone className="h-5 w-16 rounded-full" /></td>
      <td className="px-5 py-3"><Bone className="h-5 w-14 rounded-full" /></td>
      <td className="px-5 py-3 text-right">
        <div className="flex justify-end gap-3">
          <Bone className="h-4 w-8" />
          <Bone className="h-4 w-16" />
        </div>
      </td>
    </tr>
  );
}

// ── Stat card skeleton (Dashboard) ───────────────────────────────────────────
export function StatCardSkeleton() {
  return (
    <div className="card border border-gray-100 p-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Bone className="h-3 w-20" />
          <Bone className="h-8 w-12" />
        </div>
        <Bone className="h-8 w-8 rounded-lg" />
      </div>
    </div>
  );
}

// ── Activity log entry skeleton ───────────────────────────────────────────────
export function ActivityLogSkeleton() {
  return (
    <div className="flex gap-4 py-4 animate-pulse">
      <Bone className="w-8 h-8 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex gap-2">
          <Bone className="h-4 w-24" />
          <Bone className="h-4 w-16 rounded-full" />
          <Bone className="h-4 w-32" />
        </div>
        <Bone className="h-3 w-48" />
      </div>
      <Bone className="h-3 w-24 shrink-0" />
    </div>
  );
}
