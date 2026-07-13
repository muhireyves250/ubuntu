"use client";

import { useEffect, useState } from "react";
import { completeLabWork } from "@/lib/patients/use-patients";
import { IconClose } from "./icons";
import type { Visit, VisitLabs } from "@/lib/patients/types";

const URINE_PROTEIN_OPTIONS = ["negative", "trace", "1+", "2+", "3+"] as const;

export function LabResultsModal({
  visit,
  patientName,
  onClose,
  onCompleted,
}: {
  visit: Visit;
  patientName: string;
  onClose: () => void;
  onCompleted: () => void;
}) {
  const [hemoglobin, setHemoglobin] = useState("");
  const [platelets, setPlatelets] = useState("");
  const [bloodSugar, setBloodSugar] = useState("");
  const [urineProtein, setUrineProtein] = useState("");

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    completeLabWork(visit.id, {
      hemoglobin: hemoglobin ? Number(hemoglobin) : undefined,
      platelets: platelets ? Number(platelets) : undefined,
      bloodSugar: bloodSugar ? Number(bloodSugar) : undefined,
      urineProtein: (urineProtein as VisitLabs["urineProtein"]) || undefined,
    });
    onCompleted();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
      />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-300 bg-[#ffeedb] p-6 shadow-2xl dark:border-zinc-700 dark:bg-orange-950/40">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            Lab Results — {patientName}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Visit date {visit.date} · {visit.hospital}
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-4 flex flex-col gap-4 rounded-xl border border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Hemoglobin (g/dL)
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.1"
                value={hemoglobin}
                onChange={(e) => setHemoglobin(e.target.value)}
                placeholder="e.g. 12.5"
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              />
              <span className="text-xs font-normal text-zinc-400">Normal: 11–16 g/dL</span>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Platelets (×10³/μL)
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step="1"
                value={platelets}
                onChange={(e) => setPlatelets(e.target.value)}
                placeholder="e.g. 250"
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              />
              <span className="text-xs font-normal text-zinc-400">Normal: 150–400 ×10³/μL</span>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Blood Sugar (mmol/L)
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.1"
                value={bloodSugar}
                onChange={(e) => setBloodSugar(e.target.value)}
                placeholder="e.g. 4.8"
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              />
              <span className="text-xs font-normal text-zinc-400">Normal fasting: 3.9–5.5 mmol/L</span>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Urine Protein
              <select
                value={urineProtein}
                onChange={(e) => setUrineProtein(e.target.value)}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              >
                <option value="">— not tested —</option>
                {URINE_PROTEIN_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-[#0f766e] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-800"
            >
              Submit Results
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
