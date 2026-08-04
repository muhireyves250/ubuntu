"use client";

import { useRouter } from "next/navigation";
import { useAllCommunityVisits } from "@/lib/patients/use-patients";
import { formatExactDateTime } from "@/lib/format";
import { IconChevronRight } from "@/components/dashboard/icons";

const RISK_COLOR_CLASSES: Record<string, string> = {
  yellow: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-400",
  orange: "bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-400",
  red: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400",
};

export function CommunityVisitList() {
  const visits = useAllCommunityVisits();
  const router = useRouter();

  if (visits.length === 0) {
    return (
      <p className="rounded-xl border border-zinc-300 bg-white p-4 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
        No community reports yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {visits.map((v) => (
        <button
          key={v.id}
          type="button"
          onClick={() => router.push(`/dashboard/nurse/patients/${v.patientId}?tab=${encodeURIComponent("CHW Reports")}`)}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-300 bg-white p-4 text-left transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800/60"
        >
          <div className="min-w-0 flex-1">
            <p className="font-medium text-zinc-900 dark:text-zinc-50">{v.patientName}</p>
            <p className="text-xs text-zinc-500">{v.chwName} — {formatExactDateTime(v.visitDate)}</p>
            {v.concerns && <p className="mt-1 truncate text-sm text-zinc-600 dark:text-zinc-400">{v.concerns}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {v.proposedRiskLevel && (
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${RISK_COLOR_CLASSES[v.proposedRiskLevel] ?? ""}`}>
                {v.proposedRiskLevel.toUpperCase()}
                {v.reviewedAt ? (v.rejected ? " (rejected)" : " (accepted)") : " (pending)"}
              </span>
            )}
            {v.nurseFlaggedEmergency && (
              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-400">
                Flagged
              </span>
            )}
            <IconChevronRight className="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" />
          </div>
        </button>
      ))}
    </div>
  );
}
