"use client";

import { useState } from "react";
import { useAllCommunityVisits } from "@/lib/patients/use-patients";
import { flagCommunityVisitEmergencyApi, reviewCommunityVisitApi } from "@/lib/patients/community-visit-api";
import { queryClient } from "@/lib/query-client";

const RISK_COLOR_CLASSES: Record<string, string> = {
  yellow: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-400",
  orange: "bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-400",
  red: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400",
};

export function CommunityVisitList() {
  const visits = useAllCommunityVisits();
  const [flaggingId, setFlaggingId] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFlag(id: string) {
    setFlaggingId(id);
    setError(null);
    try {
      await flagCommunityVisitEmergencyApi(id);
      await queryClient.invalidateQueries({ queryKey: ["community-visits", "all"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to flag visit as emergency. Please try again.");
    } finally {
      setFlaggingId(null);
    }
  }

  async function handleReview(id: string, decision: "accept" | "reject") {
    setReviewingId(id);
    setError(null);
    try {
      await reviewCommunityVisitApi(id, decision);
      await queryClient.invalidateQueries({ queryKey: ["community-visits", "all"] });
      await queryClient.invalidateQueries({ queryKey: ["patients"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record your decision. Please try again.");
    } finally {
      setReviewingId(null);
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
      {error && (
        <p className="rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </p>
      )}
      {visits.map((v) => (
        <div key={v.id} className="flex flex-col gap-3 rounded-xl border border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
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

          {v.proposedRiskLevel && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${RISK_COLOR_CLASSES[v.proposedRiskLevel] ?? ""}`}>
                Proposed: {v.proposedRiskLevel.toUpperCase()}
              </span>
              {v.reviewedAt ? (
                <span className="text-xs text-zinc-400">
                  {v.rejected ? "Rejected" : "Accepted"}
                </span>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={reviewingId === v.id}
                    onClick={() => handleReview(v.id, "reject")}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    disabled={reviewingId === v.id}
                    onClick={() => handleReview(v.id, "accept")}
                    className="rounded-lg bg-[#0f766e] px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-800 disabled:opacity-50"
                  >
                    {reviewingId === v.id ? "Saving…" : "Accept"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
