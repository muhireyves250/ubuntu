"use client";

import { useState } from "react";
import { reviewCommunityVisitApi } from "@/lib/patients/community-visit-api";
import { queryClient } from "@/lib/query-client";
import { formatExactDateTime } from "@/lib/format";
import { CHW_SYMPTOM_CHECKLIST } from "@/lib/patients/chw-symptom-checklist";
import { IconChevronRight } from "@/components/dashboard/icons";
import { ConfirmModal } from "@/components/dashboard/confirm-modal";
import type { CommunityVisit } from "@/lib/patients/types";

const RISK_COLOR_CLASSES: Record<string, string> = {
  yellow: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-400",
  orange: "bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-400",
  red: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400",
};

const CHW_SIGN_LABEL = new Map(CHW_SYMPTOM_CHECKLIST.map((s) => [s.id, s.label]));

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === "") return null;
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
        {label}
      </dt>
      <dd className="text-sm text-zinc-800 dark:text-zinc-200">{value}</dd>
    </div>
  );
}

export function ChwReportsTab({
  communityVisits,
  canReview,
}: {
  communityVisits: CommunityVisit[];
  canReview: boolean;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingReview, setPendingReview] = useState<{
    id: string;
    decision: "accept" | "reject";
    patientName: string;
    riskLevel?: string;
  } | null>(null);

  async function handleReview(id: string, decision: "accept" | "reject") {
    setPendingReview(null);
    setReviewingId(id);
    setError(null);
    try {
      await reviewCommunityVisitApi(id, decision);
      await queryClient.invalidateQueries({ queryKey: ["community-visits"] });
      await queryClient.invalidateQueries({ queryKey: ["patients"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record your decision. Please try again.");
    } finally {
      setReviewingId(null);
    }
  }

  if (communityVisits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-zinc-200 bg-white p-10 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
          No CHW home visits recorded yet.
        </p>
        <p className="text-xs text-zinc-400">
          Reports the assigned community health worker submits will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p className="rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </p>
      )}
      {communityVisits.map((v) => {
        const isExpanded = expandedId === v.id;
        const needsReview = !!v.proposedRiskLevel && !v.reviewedAt;
        return (
          <div
            key={v.id}
            className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <button
              type="button"
              onClick={() => setExpandedId(isExpanded ? null : v.id)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
            >
              <div className="min-w-0">
                <p className="font-medium text-zinc-900 dark:text-zinc-50">{v.chwName}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {formatExactDateTime(v.visitDate)}
                  {v.ancVisitNumber != null && ` · Home visit #${v.ancVisitNumber}`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {v.proposedRiskLevel && (
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      RISK_COLOR_CLASSES[v.proposedRiskLevel] ?? ""
                    }`}
                  >
                    {v.proposedRiskLevel.toUpperCase()}
                    {v.reviewedAt ? (v.rejected ? " (rejected)" : " (accepted)") : " (pending)"}
                  </span>
                )}
                {v.nurseFlaggedEmergency && (
                  <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-400">
                    Flagged
                  </span>
                )}
                <IconChevronRight
                  className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform dark:text-zinc-500 ${
                    isExpanded ? "rotate-90" : ""
                  }`}
                />
              </div>
            </button>

            {isExpanded && (
              <div className="flex flex-col gap-3 border-t border-zinc-100 bg-zinc-50/60 px-4 py-3.5 dark:border-zinc-800 dark:bg-zinc-950/30">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                  <DetailField
                    label="Blood pressure"
                    value={v.systolic != null && v.diastolic != null ? `${v.systolic}/${v.diastolic} mmHg` : null}
                  />
                  <DetailField label="Baby weight" value={v.babyWeight != null ? `${v.babyWeight} kg` : null} />
                  <DetailField label="Feeding status" value={v.feedingStatus} />
                </dl>
                <DetailField label="Concerns reported" value={v.concerns} />
                <DetailField label="Notes" value={v.notes} />
                {v.checkedSigns.length > 0 && (
                  <DetailField
                    label="Danger signs observed"
                    value={v.checkedSigns.map((id) => CHW_SIGN_LABEL.get(id) ?? id).join(", ")}
                  />
                )}
                {v.riskFlag && (
                  <DetailField
                    label="Why this was flagged"
                    value={
                      v.riskReasons.length > 0
                        ? v.riskReasons.join("; ")
                        : "Flagged by the CHW, but no specific reason was recorded for this report."
                    }
                  />
                )}

                {canReview && needsReview && (
                  <div className="flex justify-end gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
                    <button
                      type="button"
                      disabled={reviewingId === v.id}
                      onClick={() =>
                        setPendingReview({
                          id: v.id,
                          decision: "reject",
                          patientName: v.patientName,
                          riskLevel: v.proposedRiskLevel,
                        })
                      }
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      disabled={reviewingId === v.id}
                      onClick={() =>
                        setPendingReview({
                          id: v.id,
                          decision: "accept",
                          patientName: v.patientName,
                          riskLevel: v.proposedRiskLevel,
                        })
                      }
                      className="rounded-lg bg-[#0f766e] px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-800 disabled:opacity-50"
                    >
                      {reviewingId === v.id ? "Saving…" : "Accept"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {pendingReview && (
        <ConfirmModal
          title={pendingReview.decision === "accept" ? "Accept this risk report?" : "Reject this risk report?"}
          description={
            pendingReview.decision === "accept"
              ? `This sets ${pendingReview.patientName}'s risk level to ${pendingReview.riskLevel?.toUpperCase() ?? "the proposed level"} everywhere in the system, until a real clinical assessment replaces it. Only confirm if you agree with the CHW's assessment.`
              : `This dismisses the CHW's proposed ${pendingReview.riskLevel?.toUpperCase() ?? ""} risk flag for ${pendingReview.patientName} — no risk level will be changed. This can't be undone.`
          }
          confirmLabel={pendingReview.decision === "accept" ? "Accept" : "Reject"}
          tone={pendingReview.decision === "reject" ? "danger" : "default"}
          onConfirm={() => handleReview(pendingReview.id, pendingReview.decision)}
          onCancel={() => setPendingReview(null)}
        />
      )}
    </div>
  );
}
