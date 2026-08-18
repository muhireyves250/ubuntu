"use client";

import { useState } from "react";
import {
  VitalSignsStep,
  emptyVitalSigns,
  isVitalSignsComplete,
  type VitalSigns,
} from "@/components/patients/assessment/vital-signs-step";
import { SymptomsStep } from "@/components/patients/assessment/symptoms-step";
import { ConsultationStep } from "@/components/patients/assessment/consultation-step";
import { LabsStep } from "@/components/patients/assessment/labs-step";
import { SummaryStep } from "@/components/patients/assessment/summary-step";
import { FinalizeAssessmentBlocker } from "@/components/patients/finalize-assessment-blocker";
import { finalizeAssessment } from "@/lib/patients/use-patients";
import type { Patient, Visit } from "@/lib/patients/types";

const STEPS = [
  { number: 1, label: "Vitals" },
  { number: 2, label: "Symptoms" },
  { number: 3, label: "Consultation" },
  { number: 4, label: "Labs" },
  { number: 5, label: "Summary" },
] as const;

type StepNumber = (typeof STEPS)[number]["number"];

export function AssessmentWizard({
  patient,
  patientId,
  pregnancyId,
  type,
  scheduledWeek,
  ancNumber,
  onSubmitted,
}: {
  patient: Patient;
  patientId: string;
  pregnancyId: string;
  type: "scheduled" | "unscheduled";
  scheduledWeek?: number;
  ancNumber?: number;
  onSubmitted?: () => void;
}) {
  const [currentStep, setCurrentStep] = useState<StepNumber>(1);
  const [maxReachedStep, setMaxReachedStep] = useState<StepNumber>(1);
  const [vitals, setVitals] = useState<VitalSigns>(emptyVitalSigns());
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [labsOrdered, setLabsOrdered] = useState(false);
  const [savedVisit, setSavedVisit] = useState<Visit | null>(null);

  const canAdvance = currentStep === 1 ? isVitalSignsComplete(vitals) : true;

  function handleVitalsChange(field: keyof VitalSigns, value: string) {
    setVitals((current) => ({ ...current, [field]: value }));
  }

  function goToStep(step: StepNumber) {
    if (step > maxReachedStep) return;
    setCurrentStep(step);
  }

  function goNext() {
    if (!canAdvance) return;
    setCurrentStep((step) => {
      const next = step < 5 ? ((step + 1) as StepNumber) : step;
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
    setLabsOrdered(false);
    setSavedVisit(null);
  }

  // A visit that didn't need labs is unlocked for the full Final
  // Diagnosis → … → Discharge pipeline immediately. A visit that needs
  // labs exits the wizard here — page.tsx shows AwaitingLabsBlocker, then
  // FinalizeAssessmentBlocker once labs land (same component, reused).
  if (savedVisit && !labsOrdered) {
    return (
      <FinalizeAssessmentBlocker
        patient={patient}
        visit={savedVisit}
        onFinalized={finalizeAssessment}
      />
    );
  }

  if (savedVisit && labsOrdered) {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Sent to the laboratory nurse.
        </p>
        <p className="max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
          This visit will continue automatically once lab results are submitted.
        </p>
        <button
          type="button"
          onClick={() => { reset(); onSubmitted?.(); }}
          className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Back to Patient
        </button>
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
        <ConsultationStep patientId={patientId} onSaved={goNext} />
      )}
      {currentStep === 4 && (
        <LabsStep labsOrdered={labsOrdered} onChange={setLabsOrdered} />
      )}
      {currentStep === 5 && (
        <SummaryStep
          vitals={vitals}
          symptoms={symptoms}
          labsOrdered={labsOrdered}
          pregnancyId={pregnancyId}
          type={type}
          scheduledWeek={scheduledWeek}
          ancNumber={ancNumber}
          onRecorded={setSavedVisit}
        />
      )}

      {currentStep !== 3 && currentStep !== 5 && (
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
