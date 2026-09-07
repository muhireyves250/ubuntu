"use client";

import { useState } from "react";
import type { Patient, Visit } from "@/lib/patients/types";
import type { RiskPrediction } from "@/lib/patients/risk-prediction-api";
import { AiReviewStep } from "@/components/patients/assessment/ai-review-step";
import { FinalDiagnosisStep } from "@/components/patients/assessment/final-diagnosis-step";
import { TreatmentStep } from "@/components/patients/assessment/treatment-step";
import { ConsumablesStep } from "@/components/patients/assessment/consumables-step";
import { VaccinationStep } from "@/components/patients/assessment/vaccination-step";
import { escalateVisitIfCritical, confirmAiRisk } from "@/lib/patients/use-patients";

const STEPS = [
  "AI Review",
  "Final Diagnosis",
  "Treatment",
  "Consumables",
  "Followup",
  "Vaccination",
] as const;
type Step = (typeof STEPS)[number];

function FollowupDischargeStep({
  visit,
  recommendation,
  onFinalized,
}: {
  visit: Visit;
  recommendation: string;
  onFinalized: (visitId: string, treatment: string, followUpPlan: string) => Promise<void>;
}) {
  const [treatment, setTreatment] = useState("");
  const [followUpPlan, setFollowUpPlan] = useState(recommendation);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
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
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Followup &amp; Discharge
      </p>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Treatment Summary
        <textarea
          rows={3}
          required
          value={treatment}
          onChange={(e) => setTreatment(e.target.value)}
          placeholder="e.g. Prescribed oral iron supplements, scheduled urgent blood transfusion transfer…"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Follow-up Plan
        <span className="text-xs font-normal text-zinc-400 dark:text-zinc-500">
          Pre-filled from the AI recommendation — edit as needed.
        </span>
        <textarea
          rows={3}
          required
          value={followUpPlan}
          onChange={(e) => setFollowUpPlan(e.target.value)}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </label>
      {error && (
        <p className="rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-[#0f766e] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Finalizing…" : "Continue to Vaccination →"}
      </button>
    </form>
  );
}

export function FinalizeAssessmentBlocker({
  patient,
  visit,
  onFinalized,
  onDone,
}: {
  patient: Patient;
  visit: Visit;
  onFinalized: (visitId: string, treatment: string, followUpPlan: string) => Promise<void>;
  onDone?: () => void;
}) {
  const [step, setStep] = useState<Step>("AI Review");
  const [prediction, setPrediction] = useState<RiskPrediction | null>(null);
  const [predictionConfirmed, setPredictionConfirmed] = useState(false);
  const [finalized, setFinalized] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  const stepIndex = STEPS.indexOf(step);

  async function handleFinish() {
    // Nothing about the patient's status changes just because the nurse
    // submitted to AI or even confirmed/rejected its finding on that
    // screen — it's only applied here, once the entire assessment
    // (Diagnosis, Treatment, Consumables, Follow-up/Discharge) is done,
    // and only if the nurse actually confirmed the AI's assessment.
    if (prediction && predictionConfirmed) {
      setIsTransferring(true);
      setTransferError(null);
      try {
        await confirmAiRisk(visit.id, prediction.predictedRiskLevel, [
          `AI predicted ${prediction.predictedRiskLevel} risk (${prediction.modelVersion})`,
          ...prediction.suggestedDiagnoses.map((d) => d.title),
        ]);
        if (prediction.predictedRiskLevel === "red") {
          // Transfers to a capable facility only now that the patient has
          // been stabilized through the whole pipeline — not at AI Review.
          await escalateVisitIfCritical(visit, "red");
        }
      } catch (err) {
        setTransferError(err instanceof Error ? err.message : "Could not update the patient's status.");
        setIsTransferring(false);
        return;
      }
      setIsTransferring(false);
    }
    onDone?.();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="scrollbar-hidden flex w-fit gap-1 overflow-x-auto rounded-full border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
        {STEPS.map((s, i) => (
          <span
            key={s}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${
              i === stepIndex
                ? "bg-[#0f766e] text-white shadow-sm shadow-teal-700/20"
                : i < stepIndex
                  ? "text-zinc-600 dark:text-zinc-300"
                  : "text-zinc-400 dark:text-zinc-600"
            }`}
          >
            {i + 1}. {s}
          </span>
        ))}
      </div>

      {step === "AI Review" && (
        <AiReviewStep
          patient={patient}
          visit={visit}
          onConfirm={(pred, confirmed) => {
            setPrediction(pred);
            setPredictionConfirmed(confirmed);
            setStep("Final Diagnosis");
          }}
        />
      )}
      {step === "Final Diagnosis" && (
        <FinalDiagnosisStep visitId={visit.id} onContinue={() => setStep("Treatment")} />
      )}
      {step === "Treatment" && (
        <TreatmentStep visitId={visit.id} onContinue={() => setStep("Consumables")} />
      )}
      {step === "Consumables" && (
        <ConsumablesStep visitId={visit.id} onContinue={() => setStep("Followup")} />
      )}
      {step === "Followup" && !finalized && (
        <FollowupDischargeStep
          visit={visit}
          recommendation={prediction?.recommendation ?? ""}
          onFinalized={async (visitId, treatment, followUpPlan) => {
            await onFinalized(visitId, treatment, followUpPlan);
            setFinalized(true);
            setStep("Vaccination");
          }}
        />
      )}
      {step === "Vaccination" && (
        <div className="flex flex-col gap-3">
          {transferError && (
            <p className="rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
              {transferError}
            </p>
          )}
          <VaccinationStep
            pregnancyId={visit.pregnancyId}
            onContinue={handleFinish}
            continueLabel={isTransferring ? "Updating patient status…" : "Finish Assessment"}
          />
        </div>
      )}
    </div>
  );
}
