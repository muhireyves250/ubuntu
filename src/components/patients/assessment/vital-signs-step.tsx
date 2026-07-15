"use client";

import { IconAlert } from "@/components/dashboard/icons";

export interface VitalSigns {
  bpSystolic: string;
  bpDiastolic: string;
  temperature: string;
  pulse: string;
  respiratoryRate: string;
  weight: string;
  height: string;
}

const REQUIRED_VITAL_FIELDS: (keyof VitalSigns)[] = [
  "bpSystolic",
  "bpDiastolic",
  "temperature",
  "pulse",
  "respiratoryRate",
  "weight",
  "height",
];

export function emptyVitalSigns(): VitalSigns {
  return {
    bpSystolic: "",
    bpDiastolic: "",
    temperature: "",
    pulse: "",
    respiratoryRate: "",
    weight: "",
    height: "",
  };
}

export function isVitalSignsComplete(values: VitalSigns): boolean {
  return REQUIRED_VITAL_FIELDS.every((field) => values[field].trim() !== "");
}

export function computeBmi(values: VitalSigns): number | null {
  const weight = Number(values.weight);
  const height = Number(values.height);
  if (!values.weight || !values.height || weight <= 0 || height <= 0) {
    return null;
  }
  const heightMeters = height / 100;
  return weight / (heightMeters * heightMeters);
}

function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal weight";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

interface VitalFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  abnormal: boolean;
  step?: string;
  placeholder: string;
}

function VitalField({
  label,
  value,
  onChange,
  abnormal,
  step,
  placeholder,
}: VitalFieldProps) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
      <span className="flex items-center gap-1.5">
        {label}
        {abnormal && <IconAlert className="h-3.5 w-3.5 text-orange-500" />}
      </span>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step={step ?? "1"}
        required
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`rounded-lg border px-3 py-2 outline-none focus:border-teal-600 dark:bg-zinc-900 ${
          abnormal
            ? "border-orange-400 text-orange-700 dark:border-orange-500 dark:text-orange-400"
            : "border-zinc-300 text-zinc-900 dark:border-zinc-700 dark:text-zinc-50"
        }`}
      />
    </label>
  );
}

export function VitalSignsStep({
  values,
  onChange,
}: {
  values: VitalSigns;
  onChange: (field: keyof VitalSigns, value: string) => void;
}) {
  const bmi = computeBmi(values);
  const bmiAbnormal = bmi !== null && (bmi < 18.5 || bmi >= 30);

  const bpSystolicAbnormal =
    values.bpSystolic !== "" && Number(values.bpSystolic) > 140;
  const bpDiastolicAbnormal =
    values.bpDiastolic !== "" && Number(values.bpDiastolic) > 90;
  const temperatureAbnormal =
    values.temperature !== "" &&
    (Number(values.temperature) < 36 || Number(values.temperature) > 37.5);
  const pulseAbnormal =
    values.pulse !== "" &&
    (Number(values.pulse) < 60 || Number(values.pulse) > 100);
  const respiratoryRateAbnormal =
    values.respiratoryRate !== "" &&
    (Number(values.respiratoryRate) < 12 || Number(values.respiratoryRate) > 20);

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Vital Signs
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <VitalField
          label="Systolic BP (mmHg)"
          value={values.bpSystolic}
          onChange={(value) => onChange("bpSystolic", value)}
          abnormal={bpSystolicAbnormal}
          placeholder="e.g. 120"
        />
        <VitalField
          label="Diastolic BP (mmHg)"
          value={values.bpDiastolic}
          onChange={(value) => onChange("bpDiastolic", value)}
          abnormal={bpDiastolicAbnormal}
          placeholder="e.g. 80"
        />
        <VitalField
          label="Temperature (°C)"
          value={values.temperature}
          onChange={(value) => onChange("temperature", value)}
          abnormal={temperatureAbnormal}
          step="0.1"
          placeholder="e.g. 36.8"
        />
        <VitalField
          label="Pulse (bpm)"
          value={values.pulse}
          onChange={(value) => onChange("pulse", value)}
          abnormal={pulseAbnormal}
          placeholder="e.g. 80"
        />
        <VitalField
          label="Respiratory Rate (breaths/min)"
          value={values.respiratoryRate}
          onChange={(value) => onChange("respiratoryRate", value)}
          abnormal={respiratoryRateAbnormal}
          placeholder="e.g. 16"
        />
        <VitalField
          label="Weight (kg)"
          value={values.weight}
          onChange={(value) => onChange("weight", value)}
          abnormal={false}
          step="0.1"
          placeholder="e.g. 62.5"
        />
        <VitalField
          label="Height (cm)"
          value={values.height}
          onChange={(value) => onChange("height", value)}
          abnormal={false}
          placeholder="e.g. 160"
        />
      </div>

      <div
        className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm font-medium ${
          bmiAbnormal
            ? "border-orange-400 bg-orange-50 text-orange-700 dark:border-orange-500 dark:bg-orange-950/30 dark:text-orange-400"
            : "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
        }`}
      >
        <span>BMI</span>
        <span>
          {bmi !== null ? (
            <>
              {bmi.toFixed(1)}
              <span className="ml-2 text-xs font-normal opacity-80">{bmiCategory(bmi)}</span>
            </>
          ) : (
            "—"
          )}
        </span>
      </div>
    </div>
  );
}
