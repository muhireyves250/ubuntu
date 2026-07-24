"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { IconActivity, IconAlert } from "@/components/dashboard/icons";
import type { Patient, Visit, LabTestResult, Referral } from "@/lib/patients/types";
import { SYMPTOM_CHECKLIST } from "@/lib/patients/symptom-checklist";
import { computePrediction } from "@/lib/patients/ai-prediction";
import { escalateVisitIfCritical } from "@/lib/patients/use-patients";

/* ─── Standardized SectionCard Component ─────────────────────────────────── */

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-300 shadow-sm dark:border-zinc-700">
      <div className="flex items-center gap-2.5 border-b border-zinc-300 bg-[#ffeedb] px-4 py-2.5 dark:border-zinc-700 dark:bg-orange-950/40">
        {icon && (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-teal-700 dark:bg-zinc-900 dark:text-teal-400">
            {icon}
          </span>
        )}
        <h3 className="font-semibold text-sm text-zinc-950 dark:text-zinc-50">{title}</h3>
      </div>
      <div className="bg-white p-4 dark:bg-zinc-900">{children}</div>
    </div>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function InterpretationBadge({ value }: { value: LabTestResult["interpretation"] }) {
  if (value === "Normal") {
    return (
      <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
        Normal
      </span>
    );
  }
  if (value === "Abnormal") {
    return (
      <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
        Abnormal
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-0.5 text-[10px] font-extrabold text-red-700 dark:bg-red-950/40 dark:text-red-400 animate-pulse">
      Critical
    </span>
  );
}

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
        <div className={`h-full rounded-full transition-all duration-300 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-zinc-100 py-1.5 text-sm dark:border-zinc-800">
      <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className="font-semibold text-zinc-950 dark:text-zinc-50">{value}</span>
    </div>
  );
}

const RISK_BANNER_CONFIG = {
  red: {
    bg: "bg-red-50 border-red-300 dark:bg-red-950/20 dark:border-red-900/60",
    text: "text-red-800 dark:text-red-300",
    badge: "bg-red-600 text-white",
    label: "RED CASE — OBSTETRIC EMERGENCY",
    icon: "🚨",
  },
  orange: {
    bg: "bg-orange-50 border-orange-300 dark:bg-orange-950/20 dark:border-orange-900/60",
    text: "text-orange-800 dark:text-orange-300",
    badge: "bg-orange-600 text-white",
    label: "ORANGE CASE — HIGH COMPLICATION RISK",
    icon: "⚠",
  },
  yellow: {
    bg: "bg-yellow-50 border-yellow-300 dark:bg-yellow-950/20 dark:border-yellow-900/60",
    text: "text-yellow-800 dark:text-yellow-300",
    badge: "bg-amber-500 text-white",
    label: "YELLOW CASE — ELEVATED RISK",
    icon: "⚡",
  },
  green: {
    bg: "bg-teal-50 border-teal-300 dark:bg-teal-950/20 dark:border-teal-900/60",
    text: "text-teal-800 dark:text-teal-300",
    badge: "bg-teal-600 text-white",
    label: "GREEN CASE — LOW CLINICAL RISK",
    icon: "✓",
  },
};

/* ─── Step 1: Clinician Review Console ──────────────────────────────────── */

function AssessmentSummaryStep({
  patient,
  visit,
  aiFollowUpSuggestion,
  onConfirm,
}: {
  patient: Patient;
  visit: Visit;
  aiFollowUpSuggestion: string;
  onConfirm: () => void;
}) {
  const labResults: LabTestResult[] = visit.labResults ?? [];
  const pred = computePrediction(visit);

  const [escalation, setEscalation] = useState<Referral | null>(null);
  const hasEscalatedRef = useRef(false);

  useEffect(() => {
    if (pred.riskLevel === "red" && !hasEscalatedRef.current) {
      hasEscalatedRef.current = true;
      // escalateVisitIfCritical writes to the shared store and notifies other
      // subscribed components (e.g. Topbar) — that must happen after commit,
      // not during this component's render, so it belongs in an effect.
      setEscalation(escalateVisitIfCritical(visit, pred.riskLevel));
    }
  }, [pred.riskLevel, visit]);

  const symptomLabels = visit.symptomIds
    .map((id) => SYMPTOM_CHECKLIST.find((s) => s.id === id)?.label ?? id)
    .filter(Boolean);

  const v = visit.labs;
  const config = RISK_BANNER_CONFIG[pred.riskLevel];

  // Alert highlighting for Hemoglobin
  const getHbStyle = (val: number | undefined) => {
    if (val == null) return "text-zinc-950 dark:text-zinc-50";
    if (val < 7) return "text-red-600 font-bold dark:text-red-400";
    if (val < 11) return "text-amber-600 font-semibold dark:text-amber-400";
    return "text-zinc-950 dark:text-zinc-50";
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Dynamic Classification Alert Banner */}
      <div className={`flex items-center justify-between rounded-xl border p-4 shadow-sm ${config.bg} ${config.text}`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{config.icon}</span>
          <div className="text-sm">
            <span className="font-extrabold uppercase tracking-wide">{config.label}</span>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Confirm results review for patient <strong className="font-bold text-zinc-800 dark:text-zinc-200">{patient.firstName} {patient.lastName}</strong> below.
            </p>
          </div>
        </div>
        <span className={`rounded-lg px-3 py-1.5 text-xs font-black uppercase tracking-wider ${config.badge}`}>
          {pred.riskLevel} CASE
        </span>
      </div>

      {escalation && (() => {
        const selfAccepted =
          escalation.status === "accepted" &&
          escalation.acceptedByFacility === escalation.referredByFacility;
        const acceptedElsewhere =
          escalation.status === "accepted" && !selfAccepted;

        return (
          <div
            className={`flex items-start gap-2.5 rounded-xl border p-4 shadow-sm ${
              escalation.status === "accepted"
                ? "border-teal-300 bg-teal-50 text-teal-800 dark:border-teal-700 dark:bg-teal-950/30 dark:text-teal-300"
                : "border-red-300 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-950/30 dark:text-red-300"
            }`}
          >
            <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="text-sm">
              <p className="font-bold uppercase tracking-wide text-xs">
                {selfAccepted
                  ? "Emergency case accepted at this facility"
                  : acceptedElsewhere
                    ? "Emergency referral already accepted"
                    : "Emergency referral sent"}
              </p>
              <p className="mt-1 text-xs opacity-90">
                {selfAccepted
                  ? `${escalation.referredByFacility} has the capability to manage this case directly — the case has been self-accepted and can proceed to treatment here.`
                  : acceptedElsewhere
                    ? `${escalation.acceptedByFacility} has already accepted this emergency referral and is managing the case.`
                    : `This facility cannot manage a critical case alone. A pending emergency referral was automatically created to ${escalation.receivingFacility} for acceptance.`}
              </p>
            </div>
          </div>
        );
      })()}

      {/* Progress navigation */}
      <div className="scrollbar-hidden flex w-fit gap-1 overflow-x-auto rounded-full border border-zinc-300 bg-[#ffeedb] p-1 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
        <span className="rounded-full bg-[#0f766e] px-4 py-1.5 text-xs font-medium text-white shadow-sm">
          1. Clinical Records Review
        </span>
        <span className="px-3 py-1.5 text-xs font-medium text-zinc-400">
          2. Treatment &amp; Action Plan
        </span>
      </div>

      {/* Main Grid: Compact side-by-side console */}
      <div className="grid gap-4 lg:grid-cols-5 items-stretch">
        
        {/* LEFT COLUMN (Span 3): Unified Clinical Assessment Card */}
        <div className="lg:col-span-3 overflow-hidden rounded-xl border border-zinc-300 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900 flex flex-col">
          <div className="flex items-center gap-2 border-b border-zinc-300 bg-[#ffeedb] px-4 py-2.5 dark:border-zinc-700 dark:bg-orange-950/40">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-teal-700 dark:bg-zinc-900 dark:text-teal-400">
              <IconActivity className="h-4 w-4" />
            </span>
            <h3 className="font-bold text-sm text-zinc-950 dark:text-zinc-50">Clinical Assessment Summary</h3>
          </div>

          <div className="p-4 flex-1 flex flex-col gap-4 overflow-y-auto max-h-[50vh] scrollbar-thin">
            {/* Vitals grid */}
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1.5">
                Vitals &amp; Physical Indicators
              </p>
              {v ? (
                <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                  {v.bpSystolic != null && v.bpDiastolic != null && (
                    <Field label="Blood Pressure" value={`${v.bpSystolic}/${v.bpDiastolic} mmHg`} />
                  )}
                  {v.hemoglobin != null && (
                    <Field
                      label="Hemoglobin (Hb)"
                      value={<span className={getHbStyle(v.hemoglobin)}>{v.hemoglobin} g/dL</span>}
                    />
                  )}
                  {v.bloodSugar != null && (
                    <Field label="Blood Glucose" value={`${v.bloodSugar} mmol/L`} />
                  )}
                  {v.temperature != null && (
                    <Field label="Temperature" value={`${v.temperature} °C`} />
                  )}
                  {v.pulse != null && (
                    <Field label="Pulse Rate" value={`${v.pulse} bpm`} />
                  )}
                  {v.weight != null && (
                    <Field label="Weight" value={`${v.weight} kg`} />
                  )}
                </div>
              ) : (
                <p className="text-xs text-zinc-400 italic">No vital parameters recorded.</p>
              )}
            </div>

            {/* Checked symptoms */}
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-2">
                Signs &amp; Symptoms
              </p>
              {symptomLabels.length === 0 ? (
                <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">No symptoms checked by nurse.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {symptomLabels.map((lbl) => (
                    <span
                      key={lbl}
                      className="rounded bg-zinc-100 border border-zinc-200 px-2 py-0.5 text-[10px] font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    >
                      {lbl}
                    </span>
                  ))}
                </div>
              )}
              {visit.notes && (
                <div className="mt-2 bg-zinc-50 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800 dark:bg-zinc-950/20 text-xs italic text-zinc-600 dark:text-zinc-400">
                  <span className="font-bold not-italic block text-[10px] mb-0.5 text-zinc-700 dark:text-zinc-300">Nurse Notes:</span>
                  {visit.notes}
                </div>
              )}
            </div>

            {/* Laboratory Test Results Table */}
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-2">
                Laboratory Test Results
              </p>
              {labResults.length === 0 ? (
                <p className="text-xs text-zinc-400 italic">No laboratory files are linked to this visit.</p>
              ) : (
                <div className="overflow-hidden border border-zinc-200 rounded-lg dark:border-zinc-800">
                  <table className="w-full text-left text-xs divide-y divide-zinc-200 dark:divide-zinc-800">
                    <thead className="bg-[#ffeedb] text-[9px] font-bold uppercase tracking-wider text-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-400">
                      <tr>
                        <th className="px-3 py-2">Test Name</th>
                        <th className="px-3 py-2">Result</th>
                        <th className="px-3 py-2">Unit</th>
                        <th className="px-3 py-2">Interpreter</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-900">
                      {labResults.map((r) => {
                        const valNum = parseFloat(r.result);
                        const isAnemiaHb = (r.testName.toLowerCase().includes("hemoglobin") || r.testName.toLowerCase().includes("hb")) && !isNaN(valNum) && valNum < 7;
                        return (
                          <tr key={r.id}>
                            <td className="px-3 py-2 font-medium text-zinc-900 dark:text-zinc-50">{r.testName}</td>
                            <td className="px-3 py-2 font-mono">
                              <span className={isAnemiaHb ? "text-red-600 font-bold dark:text-red-400" : ""}>
                                {r.result}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-zinc-500">{r.unit}</td>
                            <td className="px-3 py-2">
                              <InterpretationBadge value={isAnemiaHb ? "Critical" : r.interpretation} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (Span 2): AI Decision Copilot Container */}
        <div className="lg:col-span-2 overflow-hidden rounded-xl border border-zinc-300 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900 flex flex-col">
          <div className="flex items-center gap-2 border-b border-zinc-300 bg-[#ffeedb] px-4 py-2.5 dark:border-zinc-700 dark:bg-orange-950/40">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-teal-800 text-[10px] font-extrabold dark:bg-zinc-900 dark:text-teal-400">
              AI
            </span>
            <h3 className="font-bold text-sm text-zinc-950 dark:text-zinc-50">AI Diagnostic Intelligence</h3>
          </div>

          <div className="p-4 flex-1 flex flex-col gap-4 overflow-y-auto max-h-[50vh] scrollbar-thin">
            {/* Risk Meters */}
            <div className="space-y-2">
              <RiskMeter pct={Math.round(pred.eclampsiaRisk * 100)} label="Eclampsia" />
              <RiskMeter pct={Math.round(pred.hemorrhageRisk * 100)} label="Hemorrhage" />
              <RiskMeter pct={Math.round(pred.pretermRisk * 100)} label="Preterm" />
              <RiskMeter pct={Math.round(pred.emergencyRisk * 100)} label="Emergency" />
            </div>

            {/* Alert system message */}
            {pred.alert && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-2.5 text-xs font-semibold text-red-900 dark:bg-red-950/20 dark:border-red-900/40 dark:text-red-400">
                <IconAlert className="h-4 w-4 shrink-0 text-red-500 animate-pulse mt-0.5" />
                <div>
                  <span className="font-bold uppercase tracking-wider block text-[9px] mb-0.5">Alert Condition</span>
                  {pred.alert}
                </div>
              </div>
            )}

            {/* Follow up suggestions */}
            <div className="rounded-lg border border-teal-200 bg-teal-50/40 p-3 dark:border-teal-900/25 dark:bg-teal-950/25 mt-auto">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-teal-700 dark:text-teal-400 block mb-1">
                AI Follow-up Suggestion
              </span>
              <p className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300 font-medium">{aiFollowUpSuggestion}</p>
            </div>
          </div>
        </div>

      </div>

      {/* Button */}
      <button
        type="button"
        onClick={onConfirm}
        className="w-full rounded-xl bg-[#0f766e] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-800"
      >
        I have reviewed the full assessment &amp; lab results — Proceed to Treatment &amp; Follow-up →
      </button>
    </div>
  );
}

/* ─── Step 2: Clinic Entries Form (Compact) ────────────────────────────── */

function TreatmentStep({
  visit,
  aiFollowUpSuggestion,
  onBack,
  onFinalized,
}: {
  visit: Visit;
  aiFollowUpSuggestion: string;
  onBack: () => void;
  onFinalized: (visitId: string, treatment: string, followUpPlan: string) => Promise<void>;
}) {
  const [treatment, setTreatment] = useState("");
  const [followUpPlan, setFollowUpPlan] = useState(aiFollowUpSuggestion);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await onFinalized(visit.id, treatment.trim(), followUpPlan.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to finalize assessment. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Progress navigation */}
      <div className="scrollbar-hidden flex w-fit gap-1 overflow-x-auto rounded-full border border-zinc-300 bg-[#ffeedb] p-1 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full px-4 py-1.5 text-xs font-medium text-zinc-600 hover:bg-white/60 dark:hover:bg-zinc-800/60"
        >
          1. Clinical Records Review
        </button>
        <span className="rounded-full bg-[#0f766e] px-4 py-1.5 text-xs font-medium text-white shadow-sm">
          2. Treatment &amp; Action Plan
        </span>
      </div>

      <div className="mx-auto w-full max-w-xl">
        <SectionCard title="Finalize Treatment Plan &amp; Actions">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-1">
            <label className="flex flex-col gap-1 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Treatment Provided
              <span className="text-[9px] font-normal text-zinc-400 dark:text-zinc-500 block mb-1">
                Document standard medications, referrals, or care administered based on assessment.
              </span>
              <textarea
                rows={3}
                required
                value={treatment}
                onChange={(e) => setTreatment(e.target.value)}
                placeholder="e.g. Prescribed oral iron supplements, scheduled urgent blood transfusion transfer..."
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Follow-up Plan
              <span className="text-[9px] font-normal text-zinc-400 dark:text-zinc-500 block mb-1">
                Scheduling instructions or warnings. Pre-filled based on AI guidelines.
              </span>
              <textarea
                rows={3}
                required
                value={followUpPlan}
                onChange={(e) => setFollowUpPlan(e.target.value)}
                placeholder="e.g. Schedule returning visit in 2 weeks for CBC recount..."
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </label>

            {error && (
              <p className="rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
                {error}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={onBack}
                disabled={isSubmitting}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="grow rounded-lg bg-[#0f766e] px-4 py-2 text-xs font-extrabold text-white shadow-sm transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Finalizing…" : "Complete Visit & Unlock Profile ✔"}
              </button>
            </div>
          </form>
        </SectionCard>
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */

export function FinalizeAssessmentBlocker({
  patient,
  visit,
  onFinalized,
}: {
  patient: Patient;
  visit: Visit;
  onFinalized: (visitId: string, treatment: string, followUpPlan: string) => Promise<void>;
}) {
  const [step, setStep] = useState<1 | 2>(1);

  // Derive follow-up suggestion based on predictions
  const aiFollowUpSuggestion = useMemo(() => {
    const pred = computePrediction(visit);
    const parts: string[] = [];

    if (pred.eclampsiaRisk >= 0.7) {
      parts.push("Prioritize BP monitoring every 4 hours. Assess for Magnesium Sulfate protocol.");
    }
    if (pred.hemorrhageRisk >= 0.7) {
      parts.push("Prioritize blood cross-matching. Establish dual-bore IV access.");
    }
    if (pred.emergencyRisk >= 0.8) {
      parts.push("Prepare immediate ambulance dispatch. Keep critical care team notified.");
    }
    if (pred.pretermRisk >= 0.5) {
      parts.push("Assess eligibility for antenatal corticosteroids. Advise strict bed rest.");
    }

    const labResults: LabTestResult[] = visit.labResults ?? [];
    const hasLowHb = labResults.some(
      (r) => (r.testName.toLowerCase().includes("hemoglobin") || r.testName.toLowerCase().includes("hb")) && parseFloat(r.result) < 8
    );
    if (hasLowHb) {
      parts.push("Ensure IV access; cross-match blood; monitor for active bleeding. Prepare for emergency escalation; alert senior obstetrician. Initiate iron supplementation; repeat CBC in 2 weeks.");
    }

    if (parts.length === 0) {
      parts.push("Follow routine antenatal care intervals.");
    }

    return parts.join(" ");
  }, [visit]);

  if (step === 1) {
    return (
      <AssessmentSummaryStep
        patient={patient}
        visit={visit}
        aiFollowUpSuggestion={aiFollowUpSuggestion}
        onConfirm={() => setStep(2)}
      />
    );
  }

  return (
    <TreatmentStep
      visit={visit}
      aiFollowUpSuggestion={aiFollowUpSuggestion}
      onBack={() => setStep(1)}
      onFinalized={onFinalized}
    />
  );
}
