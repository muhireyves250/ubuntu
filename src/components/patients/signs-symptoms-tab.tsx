"use client";

import { useState } from "react";
import { SYMPTOM_CHECKLIST } from "@/lib/patients/symptom-checklist";
import { recordVisit } from "@/lib/patients/use-patients";
import type { RiskLevel, VisitLabs } from "@/lib/patients/types";

const URINE_PROTEIN_OPTIONS: NonNullable<VisitLabs["urineProtein"]>[] = [
  "negative",
  "trace",
  "1+",
  "2+",
  "3+",
];

const EDEMA_OPTIONS: NonNullable<VisitLabs["edema"]>[] = [
  "none",
  "mild",
  "moderate",
  "severe",
];

const SEVERITY_ORDER: RiskLevel[] = ["red", "orange", "yellow"];
const SEVERITY_LABEL: Record<RiskLevel, string> = {
  red: "Red — emergency",
  orange: "Orange — urgent",
  yellow: "Yellow — close follow up",
  green: "Green",
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function SignsSymptomsTab({ patientId }: { patientId: string }) {
  const [date, setDate] = useState(today());
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [bpSystolic, setBpSystolic] = useState("");
  const [bpDiastolic, setBpDiastolic] = useState("");
  const [hemoglobin, setHemoglobin] = useState("");
  const [urineProtein, setUrineProtein] = useState<VisitLabs["urineProtein"] | "">("");
  const [fetalHeartRate, setFetalHeartRate] = useState("");
  const [temperature, setTemperature] = useState("");
  const [pulse, setPulse] = useState("");
  const [fundalHeight, setFundalHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [edema, setEdema] = useState<VisitLabs["edema"] | "">("");
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  function toggleSymptom(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((symptomId) => symptomId !== id)
        : [...current, id],
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const labs: VisitLabs = {
      bpSystolic: bpSystolic ? Number(bpSystolic) : undefined,
      bpDiastolic: bpDiastolic ? Number(bpDiastolic) : undefined,
      hemoglobin: hemoglobin ? Number(hemoglobin) : undefined,
      urineProtein: urineProtein || undefined,
      fetalHeartRate: fetalHeartRate ? Number(fetalHeartRate) : undefined,
      temperature: temperature ? Number(temperature) : undefined,
      pulse: pulse ? Number(pulse) : undefined,
      fundalHeight: fundalHeight ? Number(fundalHeight) : undefined,
      weight: weight ? Number(weight) : undefined,
      edema: edema || undefined,
    };
    const hasLabs = Object.values(labs).some((value) => value !== undefined);
    const visit = recordVisit({
      patientId,
      date,
      symptomIds: selectedIds,
      notes,
      labs: hasLabs ? labs : undefined,
    });
    setSelectedIds([]);
    setNotes("");
    setDate(today());
    setBpSystolic("");
    setBpDiastolic("");
    setHemoglobin("");
    setUrineProtein("");
    setFetalHeartRate("");
    setTemperature("");
    setPulse("");
    setFundalHeight("");
    setWeight("");
    setEdema("");
    setSavedMessage(`Visit saved — classified as ${visit.riskLevel}.`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <label className="flex max-w-xs flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Visit date
        <input
          type="date"
          required
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </label>

      {SEVERITY_ORDER.map((severity) => {
        const items = SYMPTOM_CHECKLIST.filter((s) => s.severity === severity);
        if (items.length === 0) return null;
        return (
          <fieldset key={severity}>
            <legend className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              {SEVERITY_LABEL[severity]}
            </legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {items.map((symptom) => (
                <label
                  key={symptom.id}
                  className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-800 dark:text-zinc-300"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(symptom.id)}
                    onChange={() => toggleSymptom(symptom.id)}
                    className="h-4 w-4 rounded border-zinc-300 text-teal-700 focus:ring-teal-600"
                  />
                  {symptom.label}
                </label>
              ))}
            </div>
          </fieldset>
        );
      })}

      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Laboratory &amp; Vitals
        </legend>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <div className="flex gap-2">
            <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              BP systolic
              <input
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="mmHg"
                value={bpSystolic}
                onChange={(event) => setBpSystolic(event.target.value)}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              BP diastolic
              <input
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="mmHg"
                value={bpDiastolic}
                onChange={(event) => setBpDiastolic(event.target.value)}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Hemoglobin (g/dl)
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              placeholder="e.g. 11.2"
              value={hemoglobin}
              onChange={(event) => setHemoglobin(event.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Urine protein
            <select
              value={urineProtein}
              onChange={(event) =>
                setUrineProtein(event.target.value as VisitLabs["urineProtein"] | "")
              }
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            >
              <option value="">Not tested</option>
              {URINE_PROTEIN_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          AI Risk Parameters
        </legend>
        <p className="mt-1 text-xs text-zinc-400">
          Additional vitals used by the upcoming AI risk-analysis model.
        </p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Fetal heart rate (bpm)
            <input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="e.g. 140"
              value={fetalHeartRate}
              onChange={(event) => setFetalHeartRate(event.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Temperature (°C)
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              placeholder="e.g. 36.8"
              value={temperature}
              onChange={(event) => setTemperature(event.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Pulse (bpm)
            <input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="e.g. 80"
              value={pulse}
              onChange={(event) => setPulse(event.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Fundal height (cm)
            <input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="e.g. 30"
              value={fundalHeight}
              onChange={(event) => setFundalHeight(event.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Weight (kg)
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              placeholder="e.g. 62.5"
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Edema
            <select
              value={edema}
              onChange={(event) => setEdema(event.target.value as VisitLabs["edema"] | "")}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            >
              <option value="">Not assessed</option>
              {EDEMA_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Notes
        <textarea
          rows={3}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </label>

      {savedMessage && (
        <p className="text-sm font-medium text-teal-800 dark:text-teal-300">
          {savedMessage}
        </p>
      )}

      <button
        type="submit"
        className="w-fit rounded-lg bg-teal-900 px-4 py-2.5 font-medium text-white hover:bg-teal-800"
      >
        Save Visit
      </button>
    </form>
  );
}
