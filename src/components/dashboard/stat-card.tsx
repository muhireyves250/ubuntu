interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label: string;
  accentClass: string;
}

export function StatCard({ icon: Icon, value, label, accentClass }: StatCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-[1rem] border border-zinc-300 bg-[#ffeedb] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:border-zinc-700 dark:bg-orange-950/40">
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${accentClass}`}>
        <Icon className="h-6 w-6" />
      </span>
      <div className="flex flex-col">
        <p className="text-xs font-medium text-zinc-400">Total</p>
        <p className="text-2xl font-bold leading-tight text-zinc-900 dark:text-zinc-50">
          {value}
        </p>
        <p className="text-xs font-medium text-zinc-400">{label}</p>
      </div>
    </div>
  );
}
