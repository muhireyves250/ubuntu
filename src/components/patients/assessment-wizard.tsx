"use client";

import { useState } from "react";
import {
  VitalSignsStep,
  emptyVitalSigns,
  isVitalSignsComplete,
  type VitalSigns,
} from "@/components/patients/assessment/vital-signs-step";

const STEPS = [
  { number: 1, label: "Vitals" },
  { number: 2, label: "Symptoms" },
  { number: 3, label: "Labs" },
  { number: 4, label: "Summary" },
] as const;

type StepNumber = (typeof STEPS)[number]["number"];

const STEP_ISSUE: Record<2 | 3 | 4, string> = {
  2: "#20",
  3: "#21",
  4: "#22",
};

export function AssessmentWizard() {
  const [currentStep, setCurrentStep] = useState<StepNumber>(1);
  const [maxReachedStep, setMaxReachedStep] = useState<StepNumber>(1);
  const [vitals, setVitals] = useState<VitalSigns>(emptyVitalSigns());

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
      const next = step < 4 ? ((step + 1) as StepNumber) : step;
      setMaxReachedStep((reached) => (next > reached ? next : reached));
      return next;
    });
  }

  function goBack() {
    setCurrentStep((step) => (step > 1 ? ((step - 1) as StepNumber) : step));
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

      {currentStep === 1 ? (
        <VitalSignsStep values={vitals} onChange={handleVitalsChange} />
      ) : (
        <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          This step is part of issue {STEP_ISSUE[currentStep as 2 | 3 | 4]} and
          isn&apos;t built yet.
        </p>
      )}

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
          disabled={!canAdvance || currentStep === 4}
          className="rounded-lg bg-[#0f766e] px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
