"use client";

import { useState } from "react";
import { PregnancySummaryCard } from "@/components/patients/pregnancy-tab";
import { VisitHistoryTab } from "@/components/patients/visit-history-tab";
import { PregnancyTimeline } from "@/components/patients/pregnancy/pregnancy-timeline";
import { VisitDetailTabs } from "@/components/patients/visit-detail-tabs";
import { RiskBadge } from "@/components/patients/risk-badge";
import { useVisitsForPregnancy, useReferrals } from "@/lib/patients/use-patients";
import type { Pregnancy, VisitType } from "@/lib/patients/types";

const TYPE_BADGE: Record<VisitType, string> = {
  scheduled: "bg-teal-50 text-teal-800 dark:bg-teal-950/30 dark:text-teal-400",
  unscheduled: "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400",
  emergency: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400",
};

export function PastPregnancyDetail({ pregnancy }: { pregnancy: Pregnancy }) {
  const visits = useVisitsForPregnancy(pregnancy.id);
  const referrals = useReferrals().filter((r) => r.patientId === pregnancy.patientId);
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const selectedVisit = visits.find((v) => v.id === selectedVisitId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <PregnancySummaryCard pregnancy={pregnancy} />
      <VisitHistoryTab pregnancy={pregnancy} visits={visits} readOnly />
      <PregnancyTimeline visits={visits} referrals={referrals} readOnly />

      <div className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Visits during Pregnancy #{pregnancy.pregnancyNumber}
        </p>

        {visits.length === 0 ? (
          <p className="text-sm text-zinc-400">No visits recorded for this pregnancy.</p>
        ) : (
          <div className="scrollbar-hidden overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
                <tr>
                  <th className="px-3 py-2.5">Date</th>
                  <th className="px-3 py-2.5">Week</th>
                  <th className="px-3 py-2.5">Type</th>
                  <th className="px-3 py-2.5">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {visits.map((v) => {
                  const selected = selectedVisitId === v.id;
                  return (
                    <tr
                      key={v.id}
                      onClick={() => setSelectedVisitId(selected ? null : v.id)}
                      className={`cursor-pointer transition-colors ${
                        selected ? "bg-teal-50 dark:bg-teal-950/30" : "hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
                      }`}
                    >
                      <td className="px-3 py-2.5 font-medium text-zinc-900 dark:text-zinc-50">{v.date}</td>
                      <td className="px-3 py-2.5 text-zinc-600 dark:text-zinc-400">
                        {v.scheduledWeek != null ? `Week ${v.scheduledWeek}` : "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${TYPE_BADGE[v.type]}`}>
                          {v.type}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <RiskBadge level={v.riskLevel} size="sm" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {selectedVisit && <VisitDetailTabs visit={selectedVisit} />}
      </div>
    </div>
  );
}
