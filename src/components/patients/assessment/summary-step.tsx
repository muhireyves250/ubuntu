"use client";

import { useState } from "react";
import {
  computeBmi,
  type VitalSigns,
} from "@/components/patients/assessment/vital-signs-step";
import { recordVisit, usePregnanciesForPatient } from "@/lib/patients/use-patients";
import { SYMPTOM_CHECKLIST } from "@/lib/patients/symptom-checklist";
import type { Visit, VisitLabs, PregnancyMedicalHistory } from "@/lib/patients/types";

const HISTORY_REVIEW_LABELS: { key: keyof PregnancyMedicalHistory; label: string }[] = [
  { key: "historySurgicalOrCervicalTrauma", label: "Surgical history or cervical trauma or cerclage" },
  { key: "historyGynecologicalProblem", label: "History of gynecological problem" },
  { key: "currentlyOnMedication", label: "Currently taking medicines" },
  { key: "historyDiabetes", label: "History of diabetes" },
  { key: "historyLungDisease", label: "Lung disease history" },
  { key: "historyHypertension", label: "History or current hypertension" },
  { key: "alcoholUse", label: "Alcohol use" },
  { key: "historyKidneyProblems", label: "History of kidney problems" },
  { key: "tobaccoUse", label: "Tobacco use" },
  { key: "historyHeartDisease", label: "History of heart disease" },
  { key: "historyPretermDelivery", label: "History of preterm delivery" },
  { key: "historyMacrosomia", label: "History of macrosomia (birth weight >= 4kg)" },
  { key: "historyCongenitalMalformation", label: "History of congenital fetal malformation" },
  { key: "historyMultiplePregnancy", label: "History of multiple pregnancy" },
  { key: "historyAntepartumBleeding", label: "History of antepartum or postpartum bleeding" },
  { key: "recurrentPregnancyLoss", label: "Recurrent pregnancy loss (3+ times)" },
  { key: "familyPlanningBeforePregnancy", label: "Used family planning before this pregnancy" },
  { key: "historyLowBirthWeightDelivery", label: "History of delivery with birth weight < 2.5kg" },
];

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

export function SummaryStep({
  vitals,
  symptoms,
  labsOrdered,
  patientId,
  pregnancyId,
  type,
  scheduledWeek,
  ancNumber,
  onRecorded,
}: {
  vitals: VitalSigns;
  symptoms: string[];
  labsOrdered: boolean;
  patientId: string;
  pregnancyId: string;
  type: "scheduled" | "unscheduled";
  scheduledWeek?: number;
  ancNumber?: number;
  onRecorded: (visit: Visit) => void;
}) {
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const bmi = computeBmi(vitals);

  const pregnancies = usePregnanciesForPatient(patientId);
  const openPregnancy = pregnancies.find((p) => p.id === pregnancyId);
  const notedHistory = openPregnancy
    ? HISTORY_REVIEW_LABELS.filter((f) => !!openPregnancy[f.key]).map((f) => f.label)
    : [];

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const visitLabs: VisitLabs = {
        bpSystolic: vitals.bpSystolic ? Number(vitals.bpSystolic) : undefined,
        bpDiastolic: vitals.bpDiastolic ? Number(vitals.bpDiastolic) : undefined,
        temperature: vitals.temperature ? Number(vitals.temperature) : undefined,
        pulse: vitals.pulse ? Number(vitals.pulse) : undefined,
        weight: vitals.weight ? Number(vitals.weight) : undefined,
      };
      const hasVisitLabs = Object.values(visitLabs).some((v) => v !== undefined);
      const visit = await recordVisit({
        pregnancyId,
        type,
        scheduledWeek,
        ancNumber,
        symptomIds: symptoms,
        notes,
        labs: hasVisitLabs ? visitLabs : undefined,
        labStatus: labsOrdered ? "pending" : undefined,
      });
      onRecorded(visit);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record visit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Review &amp; Submit
      </p>

      <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Vitals
        </p>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <div>
            <dt className="inline text-zinc-400">BP </dt>
            <dd className="inline text-zinc-900 dark:text-zinc-50">
              {vitals.bpSystolic}/{vitals.bpDiastolic} mmHg
            </dd>
          </div>
          <div>
            <dt className="inline text-zinc-400">Temp </dt>
            <dd className="inline text-zinc-900 dark:text-zinc-50">
              {vitals.temperature} °C
            </dd>
          </div>
          <div>
            <dt className="inline text-zinc-400">Pulse </dt>
            <dd className="inline text-zinc-900 dark:text-zinc-50">
              {vitals.pulse} bpm
            </dd>
          </div>
          <div>
            <dt className="inline text-zinc-400">RR </dt>
            <dd className="inline text-zinc-900 dark:text-zinc-50">
              {vitals.respiratoryRate} /min
            </dd>
          </div>
          <div>
            <dt className="inline text-zinc-400">Weight </dt>
            <dd className="inline text-zinc-900 dark:text-zinc-50">
              {vitals.weight} kg
            </dd>
          </div>
          <div>
            <dt className="inline text-zinc-400">Height </dt>
            <dd className="inline text-zinc-900 dark:text-zinc-50">
              {vitals.height} cm
            </dd>
          </div>
          {bmi !== null && (
            <div>
              <dt className="inline text-zinc-400">BMI </dt>
              <dd className="inline text-zinc-900 dark:text-zinc-50">
                {bmi.toFixed(1)}
              </dd>
            </div>
          )}
        </dl>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Symptoms
        </p>
        {symptoms.length === 0 ? (
          <p className="text-sm text-zinc-400">None selected</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {symptoms.map((id) => {
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
      </section>

      <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Consultation
        </p>
        {notedHistory.length === 0 ? (
          <p className="text-sm text-zinc-400">No notable history flagged</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {notedHistory.map((label) => (
              <li
                key={label}
                className="rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300"
              >
                {label}
              </li>
            ))}
          </ul>
        )}
        {openPregnancy?.hivTestResult && (
          <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
            HIV test: <span className="font-medium capitalize">{openPregnancy.hivTestResult}</span>
          </p>
        )}
        {openPregnancy?.stiScreeningResult && (
          <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
            STI screening: <span className="font-medium capitalize">{openPregnancy.stiScreeningResult}</span>
          </p>
        )}
      </section>

      <section
        className={`rounded-lg border p-4 text-sm ${
          labsOrdered
            ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-400"
            : "border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
        }`}
      >
        <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
          Laboratory Tests
        </p>
        <p className="mt-1">
          {labsOrdered
            ? "Sent to the laboratory nurse — results will appear once completed."
            : "No lab tests ordered for this visit."}
        </p>
      </section>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Notes
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional clinical observations…"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
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
        {isSubmitting ? "Submitting…" : labsOrdered ? "Submit Request to Laboratory" : "Continue to AI Review"}
      </button>
    </form>
  );
}
