"use client";

import { useState } from "react";
import { useDiagnosesForVisit, createDiagnosis } from "@/lib/patients/use-patients";
import { DIAGNOSIS_CATEGORIES, ALL_DIAGNOSES } from "@/lib/patients/diagnosis-catalog";

export function FinalDiagnosisStep({ visitId, onContinue }: { visitId: string; onContinue: () => void }) {
  const diagnoses = useDiagnosesForVisit(visitId);
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [diagnosisType, setDiagnosisType] = useState("Principal");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handlePickFromCatalog(pickedCode: string) {
    const match = ALL_DIAGNOSES.find((d) => d.code === pickedCode);
    if (match) {
      setCode(match.code);
      setTitle(match.title);
    }
  }

  async function handleAdd() {
    setError(null);
    setIsSubmitting(true);
    try {
      await createDiagnosis({ visitId, code, title, diagnosisType });
      setCode("");
      setTitle("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save diagnosis");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Final Diagnosis
      </p>

      {diagnoses.length === 0 ? (
        <p className="text-sm text-zinc-400">No diagnosis recorded yet.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {diagnoses.map((d) => (
            <span key={d.id} title={d.caseStatus} className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800 dark:bg-teal-950/30 dark:text-teal-400">
              {d.code} — {d.title}
              {d.diagnosisType === "Principal" ? "" : ` (${d.diagnosisType})`}
            </span>
          ))}
        </div>
      )}

      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Pick from catalog
        <select
          value=""
          onChange={(e) => handlePickFromCatalog(e.target.value)}
          className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">Select a standard diagnosis…</option>
          {DIAGNOSIS_CATEGORIES.map((group) => (
            <optgroup key={group.category} label={group.category}>
              {group.diagnoses.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.code} — {d.title}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
        {error && <p className="w-full text-xs text-red-600 dark:text-red-400">{error}</p>}
        <input
          type="text"
          placeholder="ICD-11 code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-28 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
        <input
          type="text"
          placeholder="Diagnosis title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="min-w-40 flex-1 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
        <select
          value={diagnosisType}
          onChange={(e) => setDiagnosisType(e.target.value)}
          className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="Principal">Principal</option>
          <option value="Secondary">Secondary</option>
        </select>
        <button
          type="button"
          disabled={isSubmitting || !code || !title}
          onClick={handleAdd}
          className="rounded-lg bg-[#0f766e] px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Saving…" : "Add"}
        </button>
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="w-full rounded-xl bg-[#0f766e] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-800"
      >
        Continue to Treatment →
      </button>
    </div>
  );
}
