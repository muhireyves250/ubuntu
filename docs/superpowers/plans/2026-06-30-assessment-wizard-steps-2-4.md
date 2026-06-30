# Assessment Wizard Steps 2–4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the multi-step assessment wizard (symptoms, labs, summary/result) and wire it to save visits, plus add click-to-expand to the visit history table.

**Architecture:** Each wizard step is an isolated component in `src/components/patients/assessment/`. The wizard (`assessment-wizard.tsx`) owns all state and coordinates between steps. Result display is inline within the wizard after submit. The visit history table gains a toggled-expand detail row.

**Tech Stack:** Next.js 16.2.9 App Router, React 19.2.4, TypeScript strict, Tailwind CSS v4, pnpm.

## Global Constraints

- No new routes — all UI within existing patient detail page tabs.
- `recordVisit` in `use-patients.ts` is not modified — only its call site changes.
- No test suite — verification is `pnpm build` + `pnpm lint` after each task, plus browser verification in Task 7.
- Path alias `@/*` → `src/*`.
- No AI prediction panel — out of scope per project memory.
- `Create Referral` button in result panel is a disabled stub only (issue #31 is separate).

---

### Task 1: Data model — extend VisitLabs, symptom list, formatLabs

**Files:**
- Modify: `src/lib/patients/types.ts`
- Modify: `src/lib/patients/symptom-checklist.ts`
- Modify: `src/lib/format.ts`

**Interfaces:**
- Produces: `VisitLabs` with `platelets?: number` and `bloodSugar?: number`; 8 new `SymptomDefinition` entries in `SYMPTOM_CHECKLIST`; `formatLabs` outputs `Plt Xk` and `BG Xmmol/L` tokens.

- [ ] **Step 1: Add `platelets` and `bloodSugar` to `VisitLabs` in `src/lib/patients/types.ts`**

Find the existing `VisitLabs` interface and replace it with:

```ts
export interface VisitLabs {
  bpSystolic?: number;
  bpDiastolic?: number;
  hemoglobin?: number;
  platelets?: number;
  bloodSugar?: number;
  urineProtein?: "negative" | "trace" | "1+" | "2+" | "3+";
  fetalHeartRate?: number;
  temperature?: number;
  pulse?: number;
  fundalHeight?: number;
  weight?: number;
  edema?: "none" | "mild" | "moderate" | "severe";
}
```

- [ ] **Step 2: Add 8 new symptoms to `SYMPTOM_CHECKLIST` in `src/lib/patients/symptom-checklist.ts`**

Append these entries inside the `SYMPTOM_CHECKLIST` array (before the closing `]`):

```ts
  { id: "headache", label: "Headache", severity: "yellow" },
  { id: "convulsions", label: "Convulsions", severity: "red" },
  { id: "bleeding", label: "Vaginal bleeding", severity: "red" },
  { id: "chest-pain", label: "Chest pain", severity: "orange" },
  { id: "fever", label: "Fever", severity: "yellow" },
  { id: "abdominal-pain", label: "Abdominal pain", severity: "yellow" },
  { id: "difficulty-breathing", label: "Difficulty breathing", severity: "orange" },
  { id: "reduced-fetal-movement", label: "Reduced fetal movement", severity: "yellow" },
```

- [ ] **Step 3: Update `formatLabs` in `src/lib/format.ts` to include platelets and bloodSugar**

After the `if (labs.hemoglobin != null) parts.push(...)` line, add:

```ts
  if (labs.platelets != null) parts.push(`Plt ${labs.platelets}k`);
  if (labs.bloodSugar != null) parts.push(`BG ${labs.bloodSugar}mmol/L`);
```

- [ ] **Step 4: Verify**

```bash
pnpm build && pnpm lint
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/patients/types.ts src/lib/patients/symptom-checklist.ts src/lib/format.ts
git commit -m "feat: extend VisitLabs with platelets/bloodSugar, add 8 new symptoms"
```

---

### Task 2: Symptoms step (step 2)

**Files:**
- Create: `src/components/patients/assessment/symptoms-step.tsx`

**Interfaces:**
- Consumes: `SYMPTOM_CHECKLIST` from `@/lib/patients/symptom-checklist`; `RiskLevel` from `@/lib/patients/types`
- Produces: `SymptomsStep({ selectedIds: string[]; onChange: (ids: string[]) => void })`

- [ ] **Step 1: Create `src/components/patients/assessment/symptoms-step.tsx`**

```tsx
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
    <div className="flex flex-col gap-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Signs &amp; Symptoms
      </p>

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
                    onChange={() => toggle(symptom.id)}
                    className="h-4 w-4 rounded border-zinc-300 text-teal-700 focus:ring-teal-600"
                  />
                  {symptom.label}
                </label>
              ))}
            </div>
          </fieldset>
        );
      })}

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
```

- [ ] **Step 2: Verify**

```bash
pnpm build && pnpm lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/patients/assessment/symptoms-step.tsx
git commit -m "feat: add SymptomsStep (assessment wizard step 2)"
```

---

### Task 3: Labs step (step 3)

**Files:**
- Create: `src/components/patients/assessment/labs-step.tsx`

**Interfaces:**
- Produces:
  ```ts
  export interface LabValues {
    hemoglobin: string;
    platelets: string;
    bloodSugar: string;
    urineProtein: string;
  }
  export function emptyLabValues(): LabValues
  export function LabsStep({ values, onChange }: { values: LabValues; onChange: (field: keyof LabValues, value: string) => void }): JSX.Element
  ```

- [ ] **Step 1: Create `src/components/patients/assessment/labs-step.tsx`**

```tsx
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
```

- [ ] **Step 2: Verify**

```bash
pnpm build && pnpm lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/patients/assessment/labs-step.tsx
git commit -m "feat: add LabsStep (assessment wizard step 3)"
```

---

### Task 4: Summary + submit step (step 4)

**Files:**
- Create: `src/components/patients/assessment/summary-step.tsx`

**Interfaces:**
- Consumes:
  - `VitalSigns`, `computeBmi` from `@/components/patients/assessment/vital-signs-step`
  - `LabValues` from `@/components/patients/assessment/labs-step`
  - `recordVisit` from `@/lib/patients/use-patients`
  - `SYMPTOM_CHECKLIST` from `@/lib/patients/symptom-checklist`
  - `Visit`, `VisitLabs` from `@/lib/patients/types`
- Produces:
  ```ts
  SummaryStep({
    vitals: VitalSigns;
    symptoms: string[];
    labs: LabValues;
    patientId: string;
    onRecorded: (visit: Visit) => void;
  })
  ```

- [ ] **Step 1: Create `src/components/patients/assessment/summary-step.tsx`**

```tsx
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
```

- [ ] **Step 2: Verify**

```bash
pnpm build && pnpm lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/patients/assessment/summary-step.tsx
git commit -m "feat: add SummaryStep with review, submit, and result (assessment wizard step 4)"
```

---

### Task 5: Wire up AssessmentWizard + pass patientId from page

**Files:**
- Modify: `src/components/patients/assessment-wizard.tsx`
- Modify: `src/app/dashboard/nurse/patients/[id]/page.tsx`

**Interfaces:**
- Consumes all step components + `RiskBadge` + `SYMPTOM_CHECKLIST` + `Visit` type.
- Produces: `AssessmentWizard({ patientId: string })` (replaces `AssessmentWizard()`)

- [ ] **Step 1: Rewrite `src/components/patients/assessment-wizard.tsx`**

```tsx
"use client";

import { useState } from "react";
import {
  VitalSignsStep,
  emptyVitalSigns,
  isVitalSignsComplete,
  type VitalSigns,
} from "@/components/patients/assessment/vital-signs-step";
import { SymptomsStep } from "@/components/patients/assessment/symptoms-step";
import {
  LabsStep,
  emptyLabValues,
  type LabValues,
} from "@/components/patients/assessment/labs-step";
import { SummaryStep } from "@/components/patients/assessment/summary-step";
import { RiskBadge } from "@/components/patients/risk-badge";
import { SYMPTOM_CHECKLIST } from "@/lib/patients/symptom-checklist";
import type { Visit } from "@/lib/patients/types";

const STEPS = [
  { number: 1, label: "Vitals" },
  { number: 2, label: "Symptoms" },
  { number: 3, label: "Labs" },
  { number: 4, label: "Summary" },
] as const;

type StepNumber = (typeof STEPS)[number]["number"];

const SYMPTOM_LABEL = new Map(SYMPTOM_CHECKLIST.map((s) => [s.id, s.label]));

export function AssessmentWizard({ patientId }: { patientId: string }) {
  const [currentStep, setCurrentStep] = useState<StepNumber>(1);
  const [maxReachedStep, setMaxReachedStep] = useState<StepNumber>(1);
  const [vitals, setVitals] = useState<VitalSigns>(emptyVitalSigns());
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [labs, setLabs] = useState<LabValues>(emptyLabValues());
  const [savedVisit, setSavedVisit] = useState<Visit | null>(null);

  const canAdvance = currentStep === 1 ? isVitalSignsComplete(vitals) : true;

  function handleVitalsChange(field: keyof VitalSigns, value: string) {
    setVitals((current) => ({ ...current, [field]: value }));
  }

  function handleLabsChange(field: keyof LabValues, value: string) {
    setLabs((current) => ({ ...current, [field]: value }));
  }

  function goToStep(step: StepNumber) {
    if (step > maxReachedStep) return;
    setCurrentStep(step);
  }

  function goNext() {
    if (!canAdvance) return;
    setCurrentStep((step) => {
      const next = step < 4 ? ((step + 1) as StepNumber) : step;
      setMaxReachedStep((reached) => (next > reached ? next : reached));
      return next;
    });
  }

  function goBack() {
    setCurrentStep((step) => (step > 1 ? ((step - 1) as StepNumber) : step));
  }

  function reset() {
    setCurrentStep(1);
    setMaxReachedStep(1);
    setVitals(emptyVitalSigns());
    setSymptoms([]);
    setLabs(emptyLabValues());
    setSavedVisit(null);
  }

  if (savedVisit) {
    const triggeredSymptoms = savedVisit.symptomIds.map(
      (id) => SYMPTOM_LABEL.get(id) ?? id,
    );
    const isHighRisk =
      savedVisit.riskLevel === "orange" || savedVisit.riskLevel === "red";

    return (
      <div className="flex flex-col items-center gap-6 py-4 text-center">
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Assessment Result
          </p>
          <RiskBadge level={savedVisit.riskLevel} />
        </div>

        {triggeredSymptoms.length > 0 && (
          <div className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-left text-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Flagged symptoms
            </p>
            <ul className="list-disc pl-4 text-zinc-700 dark:text-zinc-300">
              {triggeredSymptoms.map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex w-full gap-3">
          <button
            type="button"
            onClick={reset}
            className="flex-1 rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Back to Patient
          </button>
          {isHighRisk && (
            <button
              type="button"
              disabled
              title="Referral creation coming in issue #31"
              className="flex-1 cursor-not-allowed rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-medium text-white opacity-50"
            >
              Create Referral
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="scrollbar-hidden flex w-fit gap-1 overflow-x-auto rounded-full border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
        {STEPS.map((step) => {
          const reachable = step.number <= maxReachedStep;
          return (
            <button
              key={step.number}
              type="button"
              onClick={() => goToStep(step.number)}
              disabled={!reachable}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${
                currentStep === step.number
                  ? "bg-[#0f766e] text-white shadow-sm shadow-teal-700/20"
                  : reachable
                    ? "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    : "text-zinc-400 dark:text-zinc-600"
              }`}
            >
              {step.number}. {step.label}
            </button>
          );
        })}
      </div>

      {currentStep === 1 && (
        <VitalSignsStep values={vitals} onChange={handleVitalsChange} />
      )}
      {currentStep === 2 && (
        <SymptomsStep selectedIds={symptoms} onChange={setSymptoms} />
      )}
      {currentStep === 3 && (
        <LabsStep values={labs} onChange={handleLabsChange} />
      )}
      {currentStep === 4 && (
        <SummaryStep
          vitals={vitals}
          symptoms={symptoms}
          labs={labs}
          patientId={patientId}
          onRecorded={setSavedVisit}
        />
      )}

      {currentStep !== 4 && (
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
            disabled={!canAdvance}
            className="rounded-lg bg-[#0f766e] px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Pass `patientId` in patient detail page**

In `src/app/dashboard/nurse/patients/[id]/page.tsx`, change:

```tsx
{activeTab === "New Assessment" && <AssessmentWizard />}
```

to:

```tsx
{activeTab === "New Assessment" && <AssessmentWizard patientId={patient.id} />}
```

- [ ] **Step 3: Verify**

```bash
pnpm build && pnpm lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/patients/assessment-wizard.tsx "src/app/dashboard/nurse/patients/[id]/page.tsx"
git commit -m "feat: wire assessment wizard steps 2-4, result panel, patientId prop"
```

---

### Task 6: Visit history tab — click-to-expand detail rows

**Files:**
- Modify: `src/components/patients/visit-history-tab.tsx`

**Interfaces:**
- Adds local `expandedId: string | null` state. No interface changes.

- [ ] **Step 1: Rewrite `src/components/patients/visit-history-tab.tsx`**

```tsx
"use client";

import { useState } from "react";
import { RiskBadge } from "@/components/patients/risk-badge";
import { SYMPTOM_CHECKLIST } from "@/lib/patients/symptom-checklist";
import { formatLabs } from "@/lib/format";
import type { Visit } from "@/lib/patients/types";

const SYMPTOM_LABEL = new Map(
  SYMPTOM_CHECKLIST.map((symptom) => [symptom.id, symptom.label]),
);

export function VisitHistoryTab({
  visits,
  onAddVisit,
}: {
  visits: Visit[];
  onAddVisit: () => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Antenatal Care Followup
      </p>

      <div className="scrollbar-hidden overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
            <tr>
              <th className="px-3 py-2.5">No.</th>
              <th className="px-3 py-2.5">Visit Date</th>
              <th className="px-3 py-2.5">Risk</th>
              <th className="px-3 py-2.5">Signs &amp; Symptoms</th>
              <th className="px-3 py-2.5">Labs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {visits.map((visit, index) => {
              const expanded = expandedId === visit.id;
              return (
                <>
                  <tr
                    key={visit.id}
                    onClick={() =>
                      setExpandedId(expanded ? null : visit.id)
                    }
                    className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
                  >
                    <td className="px-3 py-2.5 text-zinc-500 dark:text-zinc-400">
                      {index + 1}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-zinc-900 dark:text-zinc-50">
                      {visit.date}
                    </td>
                    <td className="px-3 py-2.5">
                      <RiskBadge level={visit.riskLevel} size="sm" />
                    </td>
                    <td className="px-3 py-2.5 text-zinc-600 dark:text-zinc-400">
                      {visit.symptomIds.length > 0
                        ? visit.symptomIds
                            .map((id) => SYMPTOM_LABEL.get(id) ?? id)
                            .join(", ")
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-600 dark:text-zinc-400">
                      {formatLabs(visit)}
                    </td>
                  </tr>
                  {expanded && (
                    <tr key={`${visit.id}-detail`}>
                      <td
                        colSpan={5}
                        className="bg-zinc-50 px-4 py-3 dark:bg-zinc-900"
                      >
                        <div className="flex flex-col gap-1.5 text-sm text-zinc-700 dark:text-zinc-300">
                          {visit.notes ? (
                            <p>
                              <span className="font-medium text-zinc-400">
                                Notes:{" "}
                              </span>
                              {visit.notes}
                            </p>
                          ) : null}
                          {visit.labs ? (
                            <p>
                              <span className="font-medium text-zinc-400">
                                Labs:{" "}
                              </span>
                              {formatLabs(visit)}
                            </p>
                          ) : null}
                          {!visit.notes && !visit.labs && (
                            <p className="text-zinc-400">
                              No additional details recorded.
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}

            {visits.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-6 text-center text-zinc-500 dark:text-zinc-400"
                >
                  No visits recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={onAddVisit}
        className="w-fit rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        + Add Row
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

```bash
pnpm build && pnpm lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/patients/visit-history-tab.tsx
git commit -m "feat: add click-to-expand detail rows in visit history table"
```

---

### Task 7: End-to-end browser verification

**Files:** none changed.

- [ ] **Step 1: Confirm dev server port**

```bash
for p in 3000 3001 3002; do
  code=$(curl -s -o /dev/null -m 2 -w "%{http_code}" http://localhost:$p/login)
  echo "$p: $code"
done
```

Use the port returning `200`.

- [ ] **Step 2: Run Playwright verification**

In the existing scratchpad `pw-verify/` directory, create and run `verify-assessment.js`:

```js
const { chromium } = require("playwright-core");
const PORT = process.env.PORT || "3001";

(async () => {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/google-chrome",
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();
  page.on("pageerror", (err) => console.log("PAGEERROR:", err.message));

  // Login
  await page.goto(`http://localhost:${PORT}/login`, { waitUntil: "networkidle" });
  await page.getByPlaceholder("Enter your password").fill("nurse123");
  await page.getByRole("button", { name: /log in/i }).click();
  await page.waitForLoadState("networkidle");

  // Open first patient
  await page.getByRole("link", { name: /patient registry/i }).click();
  await page.waitForLoadState("networkidle");
  await page.locator("a[href^='/dashboard/nurse/patients/patient-']").first().click();
  await page.waitForLoadState("networkidle");

  // Step 1 — fill vitals
  await page.getByRole("button", { name: "New Assessment" }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "30-wizard-step1.png" });

  const numInputs = page.locator("input[type=number]");
  const vals = ["120", "80", "36.8", "78", "16", "65", "162"];
  for (let i = 0; i < vals.length; i++) await numInputs.nth(i).fill(vals[i]);
  await page.waitForTimeout(200);
  await page.screenshot({ path: "31-wizard-vitals-filled.png" });

  // Step 2 — symptoms
  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "32-wizard-step2-symptoms.png" });

  await page.getByLabel(/convulsions/i).check();
  await page.waitForTimeout(200);
  await page.screenshot({ path: "33-wizard-convulsions-warning.png" });

  // Step 3 — labs
  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "34-wizard-step3-labs.png" });
  await page.getByPlaceholder(/e\.g\. 12\.5/i).fill("13.2");

  // Step 4 — summary
  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "35-wizard-step4-summary.png" });

  // Submit
  await page.getByRole("button", { name: /submit assessment/i }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "36-wizard-result.png" });

  // Back to patient → visit history → expand row
  await page.getByRole("button", { name: /back to patient/i }).click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "Visit History" }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "37-visit-history.png" });

  await page.locator("tbody tr").first().click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "38-visit-history-expanded.png" });

  await browser.close();
  console.log("DONE — screenshots 30–38 written");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

Expected: `EXIT:0`, no `PAGEERROR` lines, screenshots visible. Screenshot 36 shows `RiskBadge` (red, because Convulsions is red severity) and "Create Referral" button (disabled). Screenshot 38 shows an expanded detail row.

---

## Self-Review Notes

**Spec coverage:**
- ✓ `platelets` / `bloodSugar` added to `VisitLabs` — Task 1
- ✓ 8 new symptoms in `SYMPTOM_CHECKLIST` — Task 1
- ✓ `formatLabs` updated for new fields — Task 1
- ✓ Step 2 symptoms grouped by severity, RED warning banner, selection summary — Task 2
- ✓ Step 3 labs all optional with reference hints — Task 3
- ✓ Step 4 read-only review + editable date/notes + Submit — Task 4
- ✓ Result panel: `RiskBadge`, triggered symptoms, Back / Create Referral (disabled stub) — Task 5
- ✓ `patientId` prop added to `AssessmentWizard`, passed from page — Task 5
- ✓ Visit history click-to-expand detail row — Task 6
- ✓ No AI panel, no referral creation logic — Tasks 5, 6

**Placeholder scan:** No TBDs or vague steps. ✓

**Type consistency:**
- `LabValues` exported from `labs-step.tsx`, imported in `assessment-wizard.tsx` and `summary-step.tsx` ✓
- `emptyLabValues()` used in wizard init ✓
- `handleLabsChange(field: keyof LabValues, value: string)` matches `LabsStep`'s `onChange` signature ✓
- `SummaryStep` props match exactly what wizard passes ✓
- `platelets` / `bloodSugar` added to `VisitLabs` in Task 1 before being written in `summary-step.tsx` Task 4 ✓
