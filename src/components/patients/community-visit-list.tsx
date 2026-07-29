"use client";

import { useState } from "react";
import { useAllCommunityVisits } from "@/lib/patients/use-patients";
import { flagCommunityVisitEmergencyApi } from "@/lib/patients/community-visit-api";
import { queryClient } from "@/lib/query-client";

export function CommunityVisitList() {
  const visits = useAllCommunityVisits();
  const [flaggingId, setFlaggingId] = useState<string | null>(null);

  async function handleFlag(id: string) {
    setFlaggingId(id);
    try {
      await flagCommunityVisitEmergencyApi(id);
      await queryClient.invalidateQueries({ queryKey: ["community-visits", "all"] });
    } finally {
      setFlaggingId(null);
    }
  }

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
        <div key={v.id} className="flex items-center justify-between rounded-xl border border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <div>
            <p className="font-medium text-zinc-900 dark:text-zinc-50">{v.patientName}</p>
            <p className="text-xs text-zinc-500">{v.chwName} — {v.visitDate.slice(0, 10)}</p>
            {v.concerns && <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{v.concerns}</p>}
          </div>
          {v.nurseFlaggedEmergency ? (
            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-400">
              Flagged
            </span>
          ) : (
            <button
              type="button"
              disabled={flaggingId === v.id}
              onClick={() => handleFlag(v.id)}
              className="rounded-lg border border-red-400 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              {flaggingId === v.id ? "Flagging…" : "Flag as Emergency"}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
