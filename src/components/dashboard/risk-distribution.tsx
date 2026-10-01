import type { RiskLevel } from "@/lib/patients/types";
import type { RiskSummaryScope } from "@/lib/patients/use-patients";

const LEGEND_ITEMS: { color: RiskLevel; label: string; dotClass: string; hex: string }[] = [
  { color: "green", label: "Green — no alarming sign", dotClass: "bg-emerald-500", hex: "#10b981" },
  { color: "yellow", label: "Yellow — active close follow up", dotClass: "bg-yellow-400", hex: "#facc15" },
  { color: "orange", label: "Orange — active urgent management", dotClass: "bg-orange-500", hex: "#f97316" },
  { color: "red", label: "Red — obstetric emergency", dotClass: "bg-red-600", hex: "#dc2626" },
];

const GAP_DEGREES = 2;

export function RiskDistribution({
  counts,
  highRiskRate,
  scope,
  onScopeChange,
}: {
  counts: Record<RiskLevel, number>;
  highRiskRate: number;
  scope: RiskSummaryScope;
  onScopeChange: (scope: RiskSummaryScope) => void;
}) {
  const total = LEGEND_ITEMS.reduce((sum, item) => sum + counts[item.color], 0);

  const stops: string[] = [];
  if (total > 0) {
    let angle = 0;
    for (const item of LEGEND_ITEMS) {
      const count = counts[item.color];
      if (count === 0) continue;
      const sweep = (count / total) * 360;
      const start = angle;
      const end = angle + sweep;
      stops.push(`${item.hex} ${start}deg ${Math.max(start, end - GAP_DEGREES)}deg`);
      stops.push(`transparent ${Math.max(start, end - GAP_DEGREES)}deg ${end}deg`);
      angle = end;
    }
  }
  const gradient =
    stops.length > 0
      ? `conic-gradient(${stops.join(", ")})`
      : undefined;

  return (
    <div className="flex h-full flex-col rounded-[1.25rem] border border-zinc-300 bg-[#ffeedb] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:border-zinc-700 dark:bg-orange-950/40">
      <div className="flex shrink-0 items-center justify-between">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">
          Risk Distribution
        </h2>
        <select
          value={scope}
          onChange={(e) => onScopeChange(e.target.value as RiskSummaryScope)}
          className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-600 outline-none focus:border-teal-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
        >
          <option value="all">All cases</option>
          <option value="active_pregnancy">Active pregnancies</option>
        </select>
      </div>

      <div className="mt-4 flex flex-1 flex-col items-center justify-center gap-5 sm:flex-row sm:items-center sm:gap-7 lg:flex-col lg:gap-5 xl:flex-row xl:gap-7">
        <div
          className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full"
          style={{ background: gradient ?? "#e4e4e7" }}
          role="img"
          aria-label={`Risk distribution: ${LEGEND_ITEMS.map((i) => `${i.label.split(" — ")[0]} ${counts[i.color]}`).join(", ")}`}
        >
          <div className="absolute inset-2.5 rounded-full bg-white dark:bg-zinc-900" />
          <div className="relative text-center">
            <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              {highRiskRate}%
            </p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              High-risk rate
            </p>
          </div>
        </div>

        <ul className="flex flex-1 flex-col gap-2">
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
              <span className="shrink-0 font-medium text-zinc-900 dark:text-zinc-50">
                {counts[item.color]} cases
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
