"use client";

import { useState } from "react";
import { RiskBadge } from "@/components/patients/risk-badge";
import { VisitDiagnosisSection } from "@/components/patients/visit-diagnosis-section";
import { VisitPharmacySection } from "@/components/patients/visit-pharmacy-section";
import { VisitInvoiceSection } from "@/components/patients/visit-invoice-section";
import { SYMPTOM_CHECKLIST } from "@/lib/patients/symptom-checklist";
import type { Visit } from "@/lib/patients/types";

const SYMPTOM_MAP = new Map(SYMPTOM_CHECKLIST.map((s) => [s.id, s]));

const SEVERITY_COLORS: Record<string, string> = {
  red: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800",
  orange:
    "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800",
  yellow:
    "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-500 dark:border-yellow-800",
  green:
    "bg-zinc-50 text-zinc-600 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800",
};

const INTERPRETATION_COLORS: Record<string, string> = {
  Normal: "text-zinc-600 dark:text-zinc-400",
  Abnormal: "text-orange-700 dark:text-orange-400",
  Critical: "text-red-700 dark:text-red-400",
};

const TABS = ["Vitals", "Symptoms", "Labs", "Diagnosis & Treatment"] as const;
type Tab = (typeof TABS)[number];

function VitalRow({ label, value }: { label: string; value: string | number | undefined }) {
  if (value === undefined || value === "") return null;
  return (
    <div>
      <dt className="inline text-zinc-400">{label} </dt>
      <dd className="inline text-zinc-900 dark:text-zinc-50">{value}</dd>
    </div>
  );
}

export function VisitDetailTabs({ visit }: { visit: Visit }) {
  const [tab, setTab] = useState<Tab>("Vitals");
  const labs = visit.labs;
  const hasVitals =
    labs &&
    (labs.bpSystolic != null ||
      labs.temperature != null ||
      labs.pulse != null ||
      labs.weight != null ||
      labs.fetalHeartRate != null ||
      labs.fundalHeight != null ||
      labs.edema != null);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              tab === t
                ? "bg-teal-700 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Vitals" && (
        <div>
          {!hasVitals ? (
            <p className="text-sm text-zinc-400">No vitals recorded for this visit.</p>
          ) : (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-3">
              <VitalRow
                label="BP"
                value={labs?.bpSystolic != null && labs?.bpDiastolic != null ? `${labs.bpSystolic}/${labs.bpDiastolic} mmHg` : undefined}
              />
              <VitalRow label="Temp" value={labs?.temperature != null ? `${labs.temperature} °C` : undefined} />
              <VitalRow label="Pulse" value={labs?.pulse != null ? `${labs.pulse} bpm` : undefined} />
              <VitalRow label="Weight" value={labs?.weight != null ? `${labs.weight} kg` : undefined} />
              <VitalRow label="FHR" value={labs?.fetalHeartRate != null ? `${labs.fetalHeartRate} bpm` : undefined} />
              <VitalRow label="Fundal height" value={labs?.fundalHeight != null ? `${labs.fundalHeight} cm` : undefined} />
              <VitalRow label="Edema" value={labs?.edema} />
            </dl>
          )}
        </div>
      )}

      {tab === "Symptoms" && (
        <div>
          {visit.symptomIds.length === 0 ? (
            <p className="text-sm text-zinc-400">No symptoms recorded for this visit.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {visit.symptomIds.map((id) => {
                const sym = SYMPTOM_MAP.get(id);
                if (!sym) return null;
                return (
                  <li
                    key={id}
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${SEVERITY_COLORS[sym.severity]}`}
                  >
                    {sym.label}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {tab === "Labs" && (
        <div className="flex flex-col gap-2">
          {visit.labStatus && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Status: <span className="font-medium capitalize">{visit.labStatus.replace("_", " ")}</span>
            </p>
          )}
          {!visit.labResults || visit.labResults.length === 0 ? (
            <p className="text-sm text-zinc-400">No lab results recorded for this visit.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
              {visit.labResults.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                  <span className="text-zinc-700 dark:text-zinc-300">{r.testName}</span>
                  <span className={`font-medium ${INTERPRETATION_COLORS[r.interpretation]}`}>
                    {r.result} {r.unit}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "Diagnosis & Treatment" && (
        <div className="flex flex-col gap-3 text-sm">
          {visit.type === "emergency" && visit.emergencySummary && (
            <p>
              <span className="font-medium text-zinc-400">Summary: </span>
              {visit.emergencySummary}
            </p>
          )}
          {visit.treatment && (
            <p>
              <span className="font-medium text-zinc-400">Treatment: </span>
              {visit.treatment}
            </p>
          )}
          {visit.followUpPlan && (
            <p>
              <span className="font-medium text-zinc-400">Follow-up plan: </span>
              {visit.followUpPlan}
            </p>
          )}
          {visit.notes && (
            <p>
              <span className="font-medium text-zinc-400">Notes: </span>
              {visit.notes}
            </p>
          )}
          {!visit.emergencySummary && !visit.treatment && !visit.followUpPlan && !visit.notes && (
            <p className="text-zinc-400">No additional notes recorded.</p>
          )}
          <div className="flex items-center gap-2 pt-1">
            <RiskBadge level={visit.riskLevel} size="sm" />
          </div>
          <VisitDiagnosisSection visitId={visit.id} readOnly />
          <VisitPharmacySection visitId={visit.id} readOnly />
          <VisitInvoiceSection visitId={visit.id} readOnly />
        </div>
      )}
    </div>
  );
}
