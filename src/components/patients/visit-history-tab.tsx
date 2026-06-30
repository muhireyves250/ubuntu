"use client";

import { Fragment, useState } from "react";
import { RiskBadge } from "@/components/patients/risk-badge";
import { SYMPTOM_CHECKLIST } from "@/lib/patients/symptom-checklist";
import { formatLabs } from "@/lib/format";
import type { Visit } from "@/lib/patients/types";

const SYMPTOM_LABEL = new Map(
  SYMPTOM_CHECKLIST.map((symptom) => [symptom.id, symptom.label]),
);

export function VisitHistoryTab({
  visits,
  onAddVisit,
}: {
  visits: Visit[];
  onAddVisit: () => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Antenatal Care Followup
      </p>

      <div className="scrollbar-hidden overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
            <tr>
              <th className="px-3 py-2.5">No.</th>
              <th className="px-3 py-2.5">Visit Date</th>
              <th className="px-3 py-2.5">Risk</th>
              <th className="px-3 py-2.5">Signs &amp; Symptoms</th>
              <th className="px-3 py-2.5">Labs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {visits.map((visit, index) => {
              const expanded = expandedId === visit.id;
              return (
                <Fragment key={visit.id}>
                  <tr
                    onClick={() =>
                      setExpandedId(expanded ? null : visit.id)
                    }
                    className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
                  >
                    <td className="px-3 py-2.5 text-zinc-500 dark:text-zinc-400">
                      {index + 1}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-zinc-900 dark:text-zinc-50">
                      {visit.date}
                    </td>
                    <td className="px-3 py-2.5">
                      <RiskBadge level={visit.riskLevel} size="sm" />
                    </td>
                    <td className="px-3 py-2.5 text-zinc-600 dark:text-zinc-400">
                      {visit.symptomIds.length > 0
                        ? visit.symptomIds
                            .map((id) => SYMPTOM_LABEL.get(id) ?? id)
                            .join(", ")
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-600 dark:text-zinc-400">
                      {formatLabs(visit)}
                    </td>
                  </tr>
                  {expanded && (
                    <tr key={`${visit.id}-detail`}>
                      <td
                        colSpan={5}
                        className="bg-zinc-50 px-4 py-3 dark:bg-zinc-900"
                      >
                        <div className="flex flex-col gap-1.5 text-sm text-zinc-700 dark:text-zinc-300">
                          {visit.notes ? (
                            <p>
                              <span className="font-medium text-zinc-400">
                                Notes:{" "}
                              </span>
                              {visit.notes}
                            </p>
                          ) : null}
                          {visit.labs ? (
                            <p>
                              <span className="font-medium text-zinc-400">
                                Labs:{" "}
                              </span>
                              {formatLabs(visit)}
                            </p>
                          ) : null}
                          {!visit.notes && !visit.labs && (
                            <p className="text-zinc-400">
                              No additional details recorded.
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}

            {visits.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-6 text-center text-zinc-500 dark:text-zinc-400"
                >
                  No visits recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={onAddVisit}
        className="w-fit rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        + Add Row
      </button>
    </div>
  );
}
