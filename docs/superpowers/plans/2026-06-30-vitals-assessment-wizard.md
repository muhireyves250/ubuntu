# Vitals Assessment Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 4-step "New Assessment" wizard tab on the patient detail page, with Step 1 (Vital Signs) fully functional and Steps 2-4 stubbed as placeholders.

**Architecture:** Two new presentational components — `VitalSignsStep` (pure controlled form fields + BMI/abnormal-range logic) and `AssessmentWizard` (step state, progress indicator, Next/Back gating, renders `VitalSignsStep` for step 1 and placeholders for steps 2-4) — wired into the existing patient detail page as a new tab. No backend/persistence changes.

**Tech Stack:** Next.js 16.2.9 App Router, React 19.2.4, TypeScript strict mode, Tailwind CSS v4. No test suite is configured in this repo — verification is `pnpm build` + `pnpm lint` plus manual browser checks, per project convention (see `CLAUDE.md`).

## Global Constraints

- No automated test suite exists; every task is verified via `pnpm build`, `pnpm lint`, and a manual click-through — do not introduce a test framework.
- Match existing visual language: cream `#ffeedb` cards, white inset form fields, `#0f766e` teal accent for active/primary controls, `rounded-lg`/`rounded-xl` radii (see `src/components/patients/signs-symptoms-tab.tsx` and `src/app/dashboard/nurse/patients/[id]/page.tsx` for the exact classes already in use).
- No persistence in this feature — vitals stay in wizard-local state only (per spec `docs/superpowers/specs/2026-06-30-vitals-assessment-wizard-design.md`). Do not call `recordVisit` or touch `VisitLabs`/`Visit` types.
- Abnormal thresholds (exact values, do not deviate): Systolic BP > 140, Diastolic BP > 90, Temperature < 36 or > 37.5°C, Pulse < 60 or > 100 bpm, Respiratory Rate < 12 or > 20 breaths/min, BMI < 18.5 or ≥ 30.
- All 7 vitals fields (Systolic BP, Diastolic BP, Temperature, Pulse, Respiratory Rate, Weight, Height) are required before the wizard's "Next" button on step 1 is enabled.

---

### Task 1: `VitalSignsStep` component

**Files:**
- Create: `src/components/patients/assessment/vital-signs-step.tsx`

**Interfaces:**
- Produces: `VitalSigns` interface (`bpSystolic`, `bpDiastolic`, `temperature`, `pulse`, `respiratoryRate`, `weight`, `height` — all `string`), `emptyVitalSigns(): VitalSigns`, `isVitalSignsComplete(values: VitalSigns): boolean`, `computeBmi(values: VitalSigns): number | null`, and `VitalSignsStep({ values, onChange }: { values: VitalSigns; onChange: (field: keyof VitalSigns, value: string) => void })`. Task 2 imports all of these from this file.

- [ ] **Step 1: Create the component file**

```tsx
"use client";

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
      {label}
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
        <span>{bmi !== null ? bmi.toFixed(1) : "—"}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the build and lint are clean**

Run: `pnpm build 2>&1 | tail -20 && pnpm lint 2>&1 | tail -20`
Expected: `✓ Compiled successfully`, all routes listed with no new ones yet (this file isn't imported anywhere), and lint prints no errors/warnings for the new file.

- [ ] **Step 3: Commit**

```bash
git add src/components/patients/assessment/vital-signs-step.tsx
git commit -m "feat: add vital signs step component for assessment wizard"
```

---

### Task 2: `AssessmentWizard` shell

**Files:**
- Create: `src/components/patients/assessment-wizard.tsx`

**Interfaces:**
- Consumes: `VitalSignsStep`, `emptyVitalSigns`, `isVitalSignsComplete`, `VitalSigns` from `@/components/patients/assessment/vital-signs-step` (Task 1).
- Produces: `AssessmentWizard()` — a component with no required props. Task 3 imports and renders `<AssessmentWizard />`.

- [ ] **Step 1: Create the wizard component**

```tsx
"use client";

import { useState } from "react";
import {
  VitalSignsStep,
  emptyVitalSigns,
  isVitalSignsComplete,
  type VitalSigns,
} from "@/components/patients/assessment/vital-signs-step";

const STEPS = [
  { number: 1, label: "Vitals" },
  { number: 2, label: "Symptoms" },
  { number: 3, label: "Labs" },
  { number: 4, label: "Summary" },
] as const;

type StepNumber = (typeof STEPS)[number]["number"];

const STEP_ISSUE: Record<2 | 3 | 4, string> = {
  2: "#20",
  3: "#21",
  4: "#22",
};

export function AssessmentWizard() {
  const [currentStep, setCurrentStep] = useState<StepNumber>(1);
  const [vitals, setVitals] = useState<VitalSigns>(emptyVitalSigns());

  const canAdvance = currentStep === 1 ? isVitalSignsComplete(vitals) : true;

  function handleVitalsChange(field: keyof VitalSigns, value: string) {
    setVitals((current) => ({ ...current, [field]: value }));
  }

  function goNext() {
    if (!canAdvance) return;
    setCurrentStep((step) => (step < 4 ? ((step + 1) as StepNumber) : step));
  }

  function goBack() {
    setCurrentStep((step) => (step > 1 ? ((step - 1) as StepNumber) : step));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="scrollbar-hidden flex w-fit gap-1 overflow-x-auto rounded-full border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
        {STEPS.map((step) => (
          <span
            key={step.number}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              currentStep === step.number
                ? "bg-[#0f766e] text-white shadow-sm shadow-teal-700/20"
                : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            {step.number}. {step.label}
          </span>
        ))}
      </div>

      {currentStep === 1 ? (
        <VitalSignsStep values={vitals} onChange={handleVitalsChange} />
      ) : (
        <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          This step is part of issue {STEP_ISSUE[currentStep as 2 | 3 | 4]} and
          isn&apos;t built yet.
        </p>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={goBack}
          disabled={currentStep === 1}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300"
        >
          Back
        </button>
        <button
          type="button"
          onClick={goNext}
          disabled={!canAdvance || currentStep === 4}
          className="rounded-lg bg-[#0f766e] px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the build and lint are clean**

Run: `pnpm build 2>&1 | tail -20 && pnpm lint 2>&1 | tail -20`
Expected: `✓ Compiled successfully`, no new routes yet (not wired into a page), lint clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/patients/assessment-wizard.tsx
git commit -m "feat: add assessment wizard shell with step gating"
```

---

### Task 3: Wire "New Assessment" tab into patient detail page

**Files:**
- Modify: `src/app/dashboard/nurse/patients/[id]/page.tsx:1-29` (imports and `TABS` array)
- Modify: `src/app/dashboard/nurse/patients/[id]/page.tsx:138-154` (tab content rendering)

**Interfaces:**
- Consumes: `AssessmentWizard` from `@/components/patients/assessment-wizard` (Task 2).

- [ ] **Step 1: Add the import**

In `src/app/dashboard/nurse/patients/[id]/page.tsx`, add this import next to the other tab-component imports (after the `VisitHistoryTab` import on line 9):

```tsx
import { AssessmentWizard } from "@/components/patients/assessment-wizard";
```

- [ ] **Step 2: Add "New Assessment" to the `TABS` array**

Replace:

```tsx
const TABS = [
  "Patient Details",
  "Signs & Symptoms",
  "Classification",
  "Visit History",
] as const;
```

With:

```tsx
const TABS = [
  "Patient Details",
  "Signs & Symptoms",
  "New Assessment",
  "Classification",
  "Visit History",
] as const;
```

- [ ] **Step 3: Render the wizard for the new tab**

Find this block:

```tsx
        {activeTab === "Signs & Symptoms" && (
          <SignsSymptomsTab patientId={patient.id} />
        )}
        {activeTab === "Classification" && (
```

Replace with:

```tsx
        {activeTab === "Signs & Symptoms" && (
          <SignsSymptomsTab patientId={patient.id} />
        )}
        {activeTab === "New Assessment" && <AssessmentWizard />}
        {activeTab === "Classification" && (
```

- [ ] **Step 4: Verify the build and lint are clean**

Run: `pnpm build 2>&1 | tail -25 && pnpm lint 2>&1 | tail -20`
Expected: `✓ Compiled successfully`, `/dashboard/nurse/patients/[id]` still listed as a dynamic route (`ƒ`), lint clean.

- [ ] **Step 5: Manual verification in the browser**

1. Start the dev server if not already running: `pnpm dev`
2. Log in and navigate to any patient's detail page (e.g. `/dashboard/nurse/patients/patient-uwimana`).
3. Click the "New Assessment" tab — confirm the step pill row shows "1. Vitals" highlighted teal, "2. Symptoms", "3. Labs", "4. Summary" in gray.
4. Confirm "Back" is disabled and "Next" is disabled (no fields filled yet).
5. Fill in Systolic BP `150`, Diastolic BP `80`, Temperature `36.8`, Pulse `80`, Respiratory Rate `16`, Weight `60`, Height `160`.
6. Confirm the Systolic BP field shows an orange border/text (150 > 140) while Diastolic BP stays normal.
7. Confirm the BMI row shows `23.4` (60 / 1.6²) in normal (non-orange) styling.
8. Confirm "Next" is now enabled; click it — confirm it advances to "2. Symptoms" and shows "This step is part of issue #20 and isn't built yet."
9. Click "Back" — confirm it returns to step 1 with the previously entered vitals still filled in.

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/nurse/patients/\[id\]/page.tsx
git commit -m "feat: add New Assessment tab to patient detail page"
```

---

## Self-Review Notes

- **Spec coverage:** Wizard shell + step indicator (Task 2), Step 1 fields + BMI + abnormal highlighting (Task 1), tab placement (Task 3), no-persistence constraint (respected — no `recordVisit` call anywhere), placeholder steps 2-4 (Task 2). All spec sections have a corresponding task.
- **Placeholder scan:** No TBD/TODO; all steps contain complete code.
- **Type consistency:** `VitalSigns` keys (`bpSystolic`, `bpDiastolic`, `temperature`, `pulse`, `respiratoryRate`, `weight`, `height`) are identical across Task 1's definition and Task 2's usage. `emptyVitalSigns`, `isVitalSignsComplete`, `computeBmi`, `VitalSignsStep` signatures match between producer (Task 1) and consumer (Task 2).
