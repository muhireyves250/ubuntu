"use client";

import { IconAlert } from "@/components/dashboard/icons";
import { useClinicalReference } from "@/lib/patients/clinical-reference-api";

export interface VitalSigns {
  bpSystolic: string;
  bpDiastolic: string;
  temperature: string;
  pulse: string;
  respiratoryRate: string;
  weight: string;
  height: string;
}

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

// The API names the required vitals by their stored field names.
const FORM_FIELD: Record<string, keyof VitalSigns> = {
  systolic: "bpSystolic",
  diastolic: "bpDiastolic",
  temperature: "temperature",
  pulse: "pulse",
  respiratoryRate: "respiratoryRate",
  weight: "weight",
  height: "height",
};

/** Every vital the API requires is filled in (false until the list loads). */
export function isVitalSignsComplete(values: VitalSigns, required: string[] | undefined): boolean {
  if (!required) return false;
  return required.every((field) => {
    const key = FORM_FIELD[field];
    return !key || values[key].trim() !== "";
  });
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

type BmiBand = { below: number | null; label: string; flagged: boolean };

function bmiBand(bmi: number, bands: BmiBand[]): BmiBand | undefined {
  return bands.find((band) => band.below === null || bmi < band.below);
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
    <label className="flex flex-col gap-1 text-xs font-medium text-zinc-700 dark:text-zinc-300">
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
        className={`rounded-lg border px-2.5 py-1.5 text-sm outline-none focus:border-teal-600 dark:bg-zinc-900 ${
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
  // Normal ranges and BMI bands come from the API; outside a range is flagged.
  const { vitalSignRanges = {}, bmiBands = [] } = useClinicalReference();
  const outOfRange = (value: string, field: string) => {
    const range = vitalSignRanges[field];
    if (value === "" || !range) return false;
    const n = Number(value);
    return (range.min !== undefined && n < range.min) || (range.max !== undefined && n > range.max);
  };

  const bmi = computeBmi(values);
  const band = bmi !== null ? bmiBand(bmi, bmiBands) : undefined;
  const bmiAbnormal = !!band?.flagged;

  const bpSystolicAbnormal = outOfRange(values.bpSystolic, "systolic");
  const bpDiastolicAbnormal = outOfRange(values.bpDiastolic, "diastolic");
  const temperatureAbnormal = outOfRange(values.temperature, "temperature");
  const pulseAbnormal = outOfRange(values.pulse, "pulse");
  const respiratoryRateAbnormal = outOfRange(values.respiratoryRate, "respiratoryRate");

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Vital Signs
      </p>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
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
        className={`flex shrink-0 items-center justify-between rounded-lg border px-3 py-1.5 text-sm font-medium ${
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
              <span className="ml-2 text-xs font-normal opacity-80">{band?.label}</span>
            </>
          ) : (
            "—"
          )}
        </span>
      </div>
    </div>
  );
}
