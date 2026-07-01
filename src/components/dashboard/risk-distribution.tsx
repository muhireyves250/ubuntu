import type { RiskLevel } from "@/lib/patients/types";

const LEGEND_ITEMS: { color: RiskLevel; label: string; dotClass: string }[] = [
  { color: "green", label: "Green — no alarming sign", dotClass: "bg-emerald-500" },
  { color: "yellow", label: "Yellow — active close follow up", dotClass: "bg-yellow-400" },
  { color: "orange", label: "Orange — active urgent management", dotClass: "bg-orange-500" },
  { color: "red", label: "Red — obstetric emergency", dotClass: "bg-red-600" },
];

export function RiskDistribution({
  counts,
  highRiskRate,
}: {
  counts: Record<RiskLevel, number>;
  highRiskRate: number;
}) {
  return (
    <div className="rounded-[1.25rem] border border-zinc-300 bg-[#ffeedb] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:border-zinc-700 dark:bg-orange-950/40">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">
          Risk Distribution
        </h2>
        <select
          disabled
          className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <option>All cases</option>
        </select>
      </div>

      <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:gap-10">
        <div className="relative flex h-36 w-36 shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div className="absolute inset-2 rounded-full bg-white dark:bg-zinc-900" />
          <div className="relative text-center">
            <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              {highRiskRate}%
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              High-risk rate
            </p>
          </div>
        </div>

        <ul className="flex flex-1 flex-col gap-3">
          {LEGEND_ITEMS.map((item) => (
            <li
              key={item.color}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                <span
                  aria-hidden
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.dotClass}`}
                />
                {item.label}
              </span>
              <span className="font-medium text-zinc-900 dark:text-zinc-50">
                {counts[item.color]} cases
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
