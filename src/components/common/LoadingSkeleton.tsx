export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading StudyMate workspace">
      <div className="h-36 rounded-2xl bg-slate-200/70 dark:bg-slate-800/60" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="h-24 rounded-2xl bg-slate-200/70 dark:bg-slate-800/60" />
        <div className="h-24 rounded-2xl bg-slate-200/70 dark:bg-slate-800/60" />
        <div className="h-24 rounded-2xl bg-slate-200/70 dark:bg-slate-800/60" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-72 rounded-2xl bg-slate-200/70 dark:bg-slate-800/60" />
        <div className="h-72 rounded-2xl bg-slate-200/70 dark:bg-slate-800/60" />
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 animate-pulse" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-64 rounded-2xl bg-slate-200/70 dark:bg-slate-800/60" />
      ))}
    </div>
  );
}
