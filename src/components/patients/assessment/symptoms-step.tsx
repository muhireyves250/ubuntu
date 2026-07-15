"use client";

import { SYMPTOM_CHECKLIST } from "@/lib/patients/symptom-checklist";
import type { RiskLevel } from "@/lib/patients/types";

const SEVERITY_ORDER: RiskLevel[] = ["red", "orange", "yellow"];
const SEVERITY_LABEL: Record<RiskLevel, string> = {
  red: "Red — emergency",
  orange: "Orange — urgent",
  yellow: "Yellow — close follow up",
  green: "Green",
};

export function SymptomsStep({
  selectedIds,
  onChange,
}: {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const hasRedSymptom = selectedIds.some(
    (id) => SYMPTOM_CHECKLIST.find((s) => s.id === id)?.severity === "red",
  );

  function toggle(id: string) {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((s) => s !== id)
        : [...selectedIds, id],
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Signs &amp; Symptoms
      </p>

      <div className="scrollbar-hidden flex max-h-64 flex-col gap-3 overflow-y-auto rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
        {SEVERITY_ORDER.map((severity) => {
          const items = SYMPTOM_CHECKLIST.filter((s) => s.severity === severity);
          if (items.length === 0) return null;
          return (
            <fieldset key={severity}>
              <legend className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                {SEVERITY_LABEL[severity]}
              </legend>
              <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((symptom) => (
                  <label
                    key={symptom.id}
                    className="flex items-center gap-2 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-sm text-zinc-700 dark:border-zinc-800 dark:text-zinc-300"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(symptom.id)}
                      onChange={() => toggle(symptom.id)}
                      className="h-4 w-4 shrink-0 rounded border-zinc-300 text-teal-700 focus:ring-teal-600"
                    />
                    {symptom.label}
                  </label>
                ))}
              </div>
            </fieldset>
          );
        })}
      </div>

      {hasRedSymptom && (
        <div className="rounded-lg border border-orange-300 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-700 dark:border-orange-700 dark:bg-orange-950/30 dark:text-orange-400">
          ⚠ This symptom may indicate a critical condition.
        </div>
      )}

      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {selectedIds.length === 0
          ? "No symptoms selected."
          : `${selectedIds.length} symptom${selectedIds.length === 1 ? "" : "s"} selected.`}
      </p>
    </div>
  );
}
