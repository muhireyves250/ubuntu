"use client";

import { useState } from "react";
import {
  VitalSignsStep,
  emptyVitalSigns,
  isVitalSignsComplete,
  type VitalSigns,
} from "@/components/patients/assessment/vital-signs-step";
import { SymptomsStep } from "@/components/patients/assessment/symptoms-step";
import {
  LabsStep,
  emptyLabValues,
  type LabValues,
} from "@/components/patients/assessment/labs-step";
import { SummaryStep } from "@/components/patients/assessment/summary-step";
import { RiskBadge } from "@/components/patients/risk-badge";
import { SYMPTOM_CHECKLIST } from "@/lib/patients/symptom-checklist";
import type { Visit } from "@/lib/patients/types";

const STEPS = [
  { number: 1, label: "Vitals" },
  { number: 2, label: "Symptoms" },
  { number: 3, label: "Labs" },
  { number: 4, label: "Summary" },
] as const;

type StepNumber = (typeof STEPS)[number]["number"];

const SYMPTOM_LABEL = new Map(SYMPTOM_CHECKLIST.map((s) => [s.id, s.label]));

export function AssessmentWizard({
  pregnancyId,
  type,
  scheduledWeek,
  ancNumber,
}: {
  pregnancyId: string;
  type: "scheduled" | "unscheduled";
  scheduledWeek?: number;
  ancNumber?: number;
}) {
  const [currentStep, setCurrentStep] = useState<StepNumber>(1);
  const [maxReachedStep, setMaxReachedStep] = useState<StepNumber>(1);
  const [vitals, setVitals] = useState<VitalSigns>(emptyVitalSigns());
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [labs, setLabs] = useState<LabValues>(emptyLabValues());
  const [savedVisit, setSavedVisit] = useState<Visit | null>(null);

  const canAdvance = currentStep === 1 ? isVitalSignsComplete(vitals) : true;

  function handleVitalsChange(field: keyof VitalSigns, value: string) {
    setVitals((current) => ({ ...current, [field]: value }));
  }

  function handleLabsChange(field: keyof LabValues, value: string) {
    setLabs((current) => ({ ...current, [field]: value }));
  }

  function goToStep(step: StepNumber) {
    if (step > maxReachedStep) return;
    setCurrentStep(step);
  }

  function goNext() {
    if (!canAdvance) return;
    setCurrentStep((step) => {
      const next = step < 4 ? ((step + 1) as StepNumber) : step;
      setMaxReachedStep((reached) => (next > reached ? next : reached));
      return next;
    });
  }

  function goBack() {
    setCurrentStep((step) => (step > 1 ? ((step - 1) as StepNumber) : step));
  }

  function reset() {
    setCurrentStep(1);
    setMaxReachedStep(1);
    setVitals(emptyVitalSigns());
    setSymptoms([]);
    setLabs(emptyLabValues());
    setSavedVisit(null);
  }

  if (savedVisit) {
    const triggeredSymptoms = savedVisit.symptomIds.map(
      (id) => SYMPTOM_LABEL.get(id) ?? id,
    );
    const isHighRisk =
      savedVisit.riskLevel === "orange" || savedVisit.riskLevel === "red";

    return (
      <div className="flex flex-col items-center gap-6 py-4 text-center">
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Assessment Result
          </p>
          <RiskBadge level={savedVisit.riskLevel} />
        </div>

        {triggeredSymptoms.length > 0 && (
          <div className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-left text-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Flagged symptoms
            </p>
            <ul className="list-disc pl-4 text-zinc-700 dark:text-zinc-300">
              {triggeredSymptoms.map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex w-full gap-3">
          <button
            type="button"
            onClick={reset}
            className="flex-1 rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Back to Patient
          </button>
          {isHighRisk && (
            <button
              type="button"
              disabled
              title="Referral creation coming in issue #31"
              className="flex-1 cursor-not-allowed rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-medium text-white opacity-50"
            >
              Create Referral
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="scrollbar-hidden flex w-fit gap-1 overflow-x-auto rounded-full border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
        {STEPS.map((step) => {
          const reachable = step.number <= maxReachedStep;
          return (
            <button
              key={step.number}
              type="button"
              onClick={() => goToStep(step.number)}
              disabled={!reachable}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${
                currentStep === step.number
                  ? "bg-[#0f766e] text-white shadow-sm shadow-teal-700/20"
                  : reachable
                    ? "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    : "text-zinc-400 dark:text-zinc-600"
              }`}
            >
              {step.number}. {step.label}
            </button>
          );
        })}
      </div>

      {currentStep === 1 && (
        <VitalSignsStep values={vitals} onChange={handleVitalsChange} />
      )}
      {currentStep === 2 && (
        <SymptomsStep selectedIds={symptoms} onChange={setSymptoms} />
      )}
      {currentStep === 3 && (
        <LabsStep values={labs} onChange={handleLabsChange} />
      )}
      {currentStep === 4 && (
        <SummaryStep
          vitals={vitals}
          symptoms={symptoms}
          labs={labs}
          pregnancyId={pregnancyId}
          type={type}
          scheduledWeek={scheduledWeek}
          ancNumber={ancNumber}
          onRecorded={setSavedVisit}
        />
      )}

      {currentStep !== 4 && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={goBack}
            disabled={currentStep === 1}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300"
          >
            Back
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={!canAdvance}
            className="rounded-lg bg-[#0f766e] px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
