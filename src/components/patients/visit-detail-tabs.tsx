"use client";

import { useState } from "react";
import { RiskBadge } from "@/components/patients/risk-badge";
import { VisitDiagnosisSection } from "@/components/patients/visit-diagnosis-section";
import { VisitPharmacySection } from "@/components/patients/visit-pharmacy-section";
import { VisitInvoiceSection } from "@/components/patients/visit-invoice-section";
import { SYMPTOM_CHECKLIST } from "@/lib/patients/symptom-checklist";
import { useRiskPredictionForVisit } from "@/lib/patients/use-patients";
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

const TABS = ["Vitals", "Symptoms", "Labs", "AI Review", "Treatment", "Diagnosis", "Medications", "Billing"] as const;
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

const RISK_BANNER_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  red: { bg: "bg-red-50 border-red-300 dark:bg-red-950/20 dark:border-red-900/60", text: "text-red-800 dark:text-red-300", label: "Red case — obstetric emergency" },
  orange: { bg: "bg-orange-50 border-orange-300 dark:bg-orange-950/20 dark:border-orange-900/60", text: "text-orange-800 dark:text-orange-300", label: "Orange case — high complication risk" },
  yellow: { bg: "bg-yellow-50 border-yellow-300 dark:bg-yellow-950/20 dark:border-yellow-900/60", text: "text-yellow-800 dark:text-yellow-300", label: "Yellow case — elevated risk" },
  green: { bg: "bg-teal-50 border-teal-300 dark:bg-teal-950/20 dark:border-teal-900/60", text: "text-teal-800 dark:text-teal-300", label: "Green case — low clinical risk" },
};

function RiskMeter({ pct, label }: { pct: number; label: string }) {
  const isRed = pct >= 75;
  const isAmber = pct >= 40 && pct < 75;
  const barColor = isRed ? "bg-red-600" : isAmber ? "bg-amber-500" : "bg-teal-600";
  const textColor = isRed
    ? "text-red-700 dark:text-red-400"
    : isAmber
      ? "text-amber-700 dark:text-amber-400"
      : "text-teal-700 dark:text-teal-400";
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between text-xs font-semibold">
        <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
        <span className={`font-mono font-bold ${textColor}`}>{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function VisitDetailTabs({ visit }: { visit: Visit }) {
  const [tab, setTab] = useState<Tab>("Vitals");
  const prediction = useRiskPredictionForVisit(visit.id);
  const riskConfig = prediction ? RISK_BANNER_CONFIG[prediction.predictedRiskLevel] : null;
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
      <div className="scrollbar-hidden flex w-fit gap-1 overflow-x-auto rounded-full border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              tab === t
                ? "bg-[#0f766e] text-white shadow-sm shadow-teal-700/20"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
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

      {tab === "AI Review" && (
        <div className="flex flex-col gap-3">
          {!prediction ? (
            <p className="text-sm text-zinc-400">AI review was not run for this visit.</p>
          ) : (
            <>
              {riskConfig && (
                <div className={`flex items-center justify-between rounded-xl border p-3 text-sm ${riskConfig.bg} ${riskConfig.text}`}>
                  <span className="font-semibold uppercase tracking-wide">{riskConfig.label}</span>
                  <RiskBadge level={prediction.predictedRiskLevel} size="sm" />
                </div>
              )}
              <div className="grid gap-2.5 sm:grid-cols-2">
                <RiskMeter pct={Math.round(prediction.eclampsiaProb * 100)} label="Eclampsia" />
                <RiskMeter pct={Math.round(prediction.hemorrhageProb * 100)} label="Hemorrhage" />
                <RiskMeter pct={Math.round(prediction.maternalDeathProb * 100)} label="Maternal Death" />
                <RiskMeter pct={Math.round(prediction.emergencyReferralProb * 100)} label="Emergency Referral" />
              </div>
              <div className="rounded-lg border border-teal-200 bg-teal-50/40 p-3 dark:border-teal-900/25 dark:bg-teal-950/25">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-400">
                  AI Recommendation
                </span>
                <p className="text-sm text-zinc-700 dark:text-zinc-300">{prediction.recommendation}</p>
              </div>
            </>
          )}
        </div>
      )}

      {tab === "Treatment" && (
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
        </div>
      )}

      {tab === "Diagnosis" && (
        <div className="text-sm">
          <VisitDiagnosisSection visitId={visit.id} readOnly />
        </div>
      )}

      {tab === "Medications" && (
        <div className="text-sm">
          <VisitPharmacySection visitId={visit.id} readOnly />
        </div>
      )}

      {tab === "Billing" && (
        <div className="text-sm">
          <VisitInvoiceSection visitId={visit.id} readOnly />
        </div>
      )}
    </div>
  );
}
