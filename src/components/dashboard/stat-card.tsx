interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label: string;
  accentClass: string;
}

export function StatCard({ icon: Icon, value, label, accentClass }: StatCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-[1rem] border border-zinc-300 bg-[#ffeedb] p-3 shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:border-zinc-700 dark:bg-orange-950/40">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${accentClass}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="flex min-w-0 flex-col">
        <p className="text-[11px] font-medium text-zinc-400">Total</p>
        <p className="text-lg font-bold leading-tight text-zinc-900 dark:text-zinc-50">
          {value}
        </p>
        <p className="truncate text-[11px] font-medium text-zinc-400">{label}</p>
      </div>
    </div>
  );
}
