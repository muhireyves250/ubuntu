# Assessment Wizard Steps 2–4 Design

**Issues:** #20 (Symptoms), #21 (Labs), #22 (Result + History)
**Epic:** #6 — Assessment Module UI

---

## Problem

The multi-step assessment wizard (`AssessmentWizard`) has Step 1 (Vital Signs) fully built. Steps 2, 3, and 4 are placeholders. The wizard also cannot save anything because it has no `patientId` prop. This design covers completing the wizard and the post-submit result + history view.

---

## Scope Decisions

- **Symptom-free visits allowed:** Step 2 does not require selecting any symptom; a nurse may record a routine visit with no flagged symptoms.
- **Labs are fully optional:** Step 3 never blocks progression. Partial lab entry is saved as-is.
- **No AI prediction panel:** Per project memory, the AI panel in issue #22 is out of scope for this slice.
- **No new routes:** Result panel is inline within the wizard; history stays within the existing Visit History tab.
- **Create Referral button is a stub:** Referral creation is issue #31. The button renders if risk is orange or red but is disabled with a tooltip.
- **`patientId` added to `AssessmentWizard`:** Required prop; passed from the patient detail page.

---

## Data Model Changes

### `VisitLabs` (in `src/lib/patients/types.ts`)

Add two optional fields:

```ts
platelets?: number;    // ×10³/μL
bloodSugar?: number;   // mmol/L
```

### `SYMPTOM_CHECKLIST` (in `src/lib/patients/symptom-checklist.ts`)

Add the eight issue-#20 symptoms (some may overlap with existing entries — add only net-new ones):

| id | label | severity |
|----|-------|----------|
| `headache` | Headache | yellow |
| `convulsions` | Convulsions | red |
| `bleeding` | Vaginal bleeding | red |
| `chest-pain` | Chest pain | orange |
| `fever` | Fever | yellow |
| `abdominal-pain` | Abdominal pain | yellow |
| `difficulty-breathing` | Difficulty breathing | orange |
| `reduced-fetal-movement` | Reduced fetal movement | yellow |

---

## Components

### `src/components/patients/assessment/symptoms-step.tsx`

`SymptomsStep({ selectedIds, onChange }: { selectedIds: string[]; onChange: (ids: string[]) => void })`

- Renders the `SYMPTOM_CHECKLIST` grouped by severity (red → orange → yellow), using the existing bordered-chip checkbox style from `signs-symptoms-tab.tsx`.
- Any RED symptom selected triggers an inline orange warning banner below the grid: **"This symptom may indicate a critical condition."** The banner is visible as long as any red symptom is checked.
- A summary sentence at the bottom of the step: **"N symptom(s) selected"** (or "No symptoms selected" if empty) — always visible, so the nurse sees what they've flagged before advancing.
- No "Next" block — advancing is always allowed.

### `src/components/patients/assessment/labs-step.tsx`

`LabsStep({ values, onChange }: { values: LabValues; onChange: (field: keyof LabValues, value: string) => void })`

Where `LabValues` is an exported string-keyed form state type (all strings, coerced on submit) — exported so `summary-step.tsx` and `assessment-wizard.tsx` can import it:

```ts
interface LabValues {
  hemoglobin: string;
  platelets: string;
  bloodSugar: string;
  urineProtein: string; // "" | "negative" | "trace" | "1+" | "2+" | "3+"
}
```

Fields with reference hints below each input:
- Hemoglobin (g/dL) — "Normal: 11–16 g/dL"
- Platelets (×10³/μL) — "Normal: 150–400 ×10³/μL"
- Blood Sugar (mmol/L) — "Normal fasting: 3.9–5.5 mmol/L"
- Urine Protein — dropdown (negative / trace / 1+ / 2+ / 3+)

No abnormal highlighting. No required fields. Never blocks "Next."

### `src/components/patients/assessment/summary-step.tsx`

`SummaryStep({ vitals, symptoms, labs, patientId, onRecorded }: { vitals: VitalSigns; symptoms: string[]; labs: LabValues; patientId: string; onRecorded: (visit: Visit) => void })`

- Read-only review section for Vitals (same display as VitalSignsStep, read-only), selected symptoms with their severity badges, and any labs entered.
- Editable: `date` (ISO date, defaults today) and `notes` (textarea).
- Submit button calls `recordVisit({ patientId, date, symptomIds, notes, labs })`. On success fires `onRecorded(visit)`.
- No error state needed (recordVisit cannot fail given valid inputs).

### Result Panel (inline in `AssessmentWizard`)

After `onRecorded` fires, the wizard replaces the step content with a result view:

- Large `RiskBadge` (existing component) for the saved visit's `riskLevel`.
- List of triggered symptom labels in plain text.
- Two buttons:
  - **"Back to Patient"** — resets wizard state (step → 1, all fields cleared), returns to step 1 view.
  - **"Create Referral"** — only rendered if `riskLevel === "orange" || riskLevel === "red"`. Disabled, with `title="Referral creation coming in issue #31"`.

### `AssessmentWizard` changes (`src/components/patients/assessment-wizard.tsx`)

- Add `patientId: string` prop.
- Add state for `symptoms: string[]`, `labs: LabValues`, and `savedVisit: Visit | null`.
- `canAdvance`:
  - Step 1: `isVitalSignsComplete(vitals)` (unchanged)
  - Steps 2, 3: always `true`
  - Step 4: always `true` (submit is inside SummaryStep)
- When `savedVisit !== null`, render result panel instead of step content + nav buttons.
- Pass `patientId` down to `SummaryStep`.

### Patient detail page (`src/app/dashboard/nurse/patients/[id]/page.tsx`)

Change: `<AssessmentWizard />` → `<AssessmentWizard patientId={patient.id} />`

---

## Visit History Tab Enhancement (`src/components/patients/visit-history-tab.tsx`)

Replace or augment the existing list with a table layout:

| Date | Risk | Symptoms |
|------|------|----------|
| 2026-06-30 | 🔴 Red | Convulsions, Bleeding |
| 2026-06-10 | 🟡 Yellow | Headache |

- Each row is a `<details>` element (or toggled div) that expands inline to show: full vitals (if recorded), labs (if recorded), and notes.
- No new state needed — `visits` prop already contains all the data.
- `RiskBadge` is reused per row.

---

## Out of Scope

- AI prediction panel (future, per project memory)
- Referral creation from result screen (issue #31)
- Editing or deleting a recorded visit
- Classification history view (issues #23, #24 — separate slice)
- Assessment result as a new route (`/assessments/[id]`)
