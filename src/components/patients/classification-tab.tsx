"use client";

import { RiskBadge } from "@/components/patients/risk-badge";
import { SYMPTOM_CHECKLIST } from "@/lib/patients/symptom-checklist";
import type { RiskLevel, Visit } from "@/lib/patients/types";

const LEGEND: { level: RiskLevel; description: string }[] = [
  { level: "green", description: "No alarming sign — regular follow up" },
  { level: "yellow", description: "Signs that need active close follow up" },
  { level: "orange", description: "Signs that need active urgent management" },
  { level: "red", description: "Obstetric emergency — active emergent management" },
];

const SYMPTOM_BY_ID = new Map(SYMPTOM_CHECKLIST.map((s) => [s.id, s]));

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function ClassificationTab({
  currentRisk,
  visits = [],
}: {
  currentRisk: RiskLevel;
  visits?: Visit[];
}) {
  const latestVisit = visits[0];
  const triggeredSymptoms = latestVisit
    ? latestVisit.symptomIds
        .map((id) => SYMPTOM_BY_ID.get(id))
        .filter(Boolean)
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Current classification
        </p>
        <RiskBadge level={currentRisk} size="lg" />
        {latestVisit && (
          <p className="text-xs text-zinc-500">
            Last assessed on {formatDate(latestVisit.date)}
          </p>
        )}
      </div>

      {triggeredSymptoms.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Triggered rules
          </p>
          <ul className="flex flex-wrap gap-2">
            {triggeredSymptoms.map((symptom) => (
              <li key={symptom!.id}>
                <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                  <RiskBadge level={symptom!.severity} size="sm" />
                  <span className="ml-1">{symptom!.label}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ul className="grid gap-3 sm:grid-cols-2">
        {LEGEND.map((item) => (
          <li
            key={item.level}
            className="flex items-start gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
          >
            <RiskBadge level={item.level} size="sm" />
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {item.description}
            </p>
          </li>
        ))}
      </ul>

      {visits.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Risk history
          </p>
          <ol className="flex flex-col gap-2">
            {visits.map((visit, index) => (
              <li
                key={visit.id}
                className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <span className="w-5 text-right text-xs text-zinc-400">
                  {index + 1}
                </span>
                <RiskBadge level={visit.riskLevel} size="sm" />
                <span className="flex-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {formatDate(visit.date)}
                </span>
                {visit.symptomIds.length > 0 && (
                  <span className="text-xs text-zinc-400">
                    {visit.symptomIds.length} sign
                    {visit.symptomIds.length !== 1 ? "s" : ""}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
