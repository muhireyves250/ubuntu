"use client";

const URINE_PROTEIN_OPTIONS = ["negative", "trace", "1+", "2+", "3+"] as const;

export interface LabValues {
  hemoglobin: string;
  platelets: string;
  bloodSugar: string;
  urineProtein: string;
}

export function emptyLabValues(): LabValues {
  return { hemoglobin: "", platelets: "", bloodSugar: "", urineProtein: "" };
}

interface LabFieldProps {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  step?: string;
  placeholder: string;
}

function LabField({ label, hint, value, onChange, step, placeholder }: LabFieldProps) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
      {label}
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step={step ?? "0.1"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
      />
      <span className="text-xs font-normal text-zinc-400">{hint}</span>
    </label>
  );
}

export function LabsStep({
  values,
  onChange,
}: {
  values: LabValues;
  onChange: (field: keyof LabValues, value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Laboratory Results{" "}
        <span className="normal-case font-normal">(all optional)</span>
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <LabField
          label="Hemoglobin (g/dL)"
          hint="Normal: 11–16 g/dL"
          value={values.hemoglobin}
          onChange={(v) => onChange("hemoglobin", v)}
          placeholder="e.g. 12.5"
        />
        <LabField
          label="Platelets (×10³/μL)"
          hint="Normal: 150–400 ×10³/μL"
          value={values.platelets}
          onChange={(v) => onChange("platelets", v)}
          step="1"
          placeholder="e.g. 250"
        />
        <LabField
          label="Blood Sugar (mmol/L)"
          hint="Normal fasting: 3.9–5.5 mmol/L"
          value={values.bloodSugar}
          onChange={(v) => onChange("bloodSugar", v)}
          placeholder="e.g. 4.8"
        />
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Urine Protein
          <select
            value={values.urineProtein}
            onChange={(e) => onChange("urineProtein", e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
            <option value="">— not tested —</option>
            {URINE_PROTEIN_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <span className="text-xs font-normal text-zinc-400">
            Select result if tested
          </span>
        </label>
      </div>
    </div>
  );
}
