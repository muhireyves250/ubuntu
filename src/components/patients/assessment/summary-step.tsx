"use client";

import { useState } from "react";
import {
  computeBmi,
  type VitalSigns,
} from "@/components/patients/assessment/vital-signs-step";
import type { LabValues } from "@/components/patients/assessment/labs-step";
import { recordVisit } from "@/lib/patients/use-patients";
import { SYMPTOM_CHECKLIST } from "@/lib/patients/symptom-checklist";
import type { Visit, VisitLabs } from "@/lib/patients/types";

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

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function SummaryStep({
  vitals,
  symptoms,
  labs,
  patientId,
  onRecorded,
}: {
  vitals: VitalSigns;
  symptoms: string[];
  labs: LabValues;
  patientId: string;
  onRecorded: (visit: Visit) => void;
}) {
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState("");

  const bmi = computeBmi(vitals);
  const hasLabs =
    labs.hemoglobin || labs.platelets || labs.bloodSugar || labs.urineProtein;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const visitLabs: VisitLabs = {
      bpSystolic: vitals.bpSystolic ? Number(vitals.bpSystolic) : undefined,
      bpDiastolic: vitals.bpDiastolic ? Number(vitals.bpDiastolic) : undefined,
      temperature: vitals.temperature ? Number(vitals.temperature) : undefined,
      pulse: vitals.pulse ? Number(vitals.pulse) : undefined,
      weight: vitals.weight ? Number(vitals.weight) : undefined,
      hemoglobin: labs.hemoglobin ? Number(labs.hemoglobin) : undefined,
      platelets: labs.platelets ? Number(labs.platelets) : undefined,
      bloodSugar: labs.bloodSugar ? Number(labs.bloodSugar) : undefined,
      urineProtein:
        (labs.urineProtein as VisitLabs["urineProtein"]) || undefined,
    };
    const hasVisitLabs = Object.values(visitLabs).some((v) => v !== undefined);
    const visit = recordVisit({
      patientId,
      date,
      symptomIds: symptoms,
      notes,
      labs: hasVisitLabs ? visitLabs : undefined,
    });
    onRecorded(visit);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Review &amp; Submit
      </p>

      <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
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
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
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

      {hasLabs && (
        <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Labs
          </p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {labs.hemoglobin && (
              <div>
                <dt className="inline text-zinc-400">Hb </dt>
                <dd className="inline text-zinc-900 dark:text-zinc-50">
                  {labs.hemoglobin} g/dL
                </dd>
              </div>
            )}
            {labs.platelets && (
              <div>
                <dt className="inline text-zinc-400">Plt </dt>
                <dd className="inline text-zinc-900 dark:text-zinc-50">
                  {labs.platelets}k
                </dd>
              </div>
            )}
            {labs.bloodSugar && (
              <div>
                <dt className="inline text-zinc-400">BG </dt>
                <dd className="inline text-zinc-900 dark:text-zinc-50">
                  {labs.bloodSugar} mmol/L
                </dd>
              </div>
            )}
            {labs.urineProtein && (
              <div>
                <dt className="inline text-zinc-400">Urine protein </dt>
                <dd className="inline text-zinc-900 dark:text-zinc-50">
                  {labs.urineProtein}
                </dd>
              </div>
            )}
          </dl>
        </section>
      )}

      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Visit date
        <input
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </label>

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

      <button
        type="submit"
        className="w-full rounded-xl bg-[#0f766e] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-800"
      >
        Submit Assessment
      </button>
    </form>
  );
}
