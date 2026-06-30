# Vital Signs Form — Step 1 of Assessment Wizard

GitHub issue: ubuntu-med/antinatal-web#19 (part of epic #6)

## Problem

The patient detail page has a "Signs & Symptoms" tab that records vitals, symptoms,
and labs together in a single ad-hoc form. The product epic (#6) calls for a
structured multi-step assessment flow instead: Vitals → Symptoms → Labs → Summary,
with a progress indicator, per-step validation gating, and abnormal-value
highlighting. Issue #19 covers step 1 (Vitals) only; steps 2-4 are separate,
not-yet-built issues (#20, #21, #22).

## Scope

- Build the wizard shell: step state, pill-style progress indicator, Next/Back
  navigation.
- Fully implement Step 1 (Vital Signs).
- Stub Steps 2-4 as placeholder cards ("Coming soon — part of issue #20/#21/#22")
  so the wizard has real steps to gate against.
- No persistence in this issue. The wizard holds vitals in local component state
  only; saving the full assessment is deferred to issue #22 (Summary step), once
  symptoms and labs are also collected.
- The existing "Signs & Symptoms" tab and its `recordVisit` flow are untouched.

## Placement

Add a new "New Assessment" tab to the patient detail page
(`src/app/dashboard/nurse/patients/[id]/page.tsx`), alongside the existing
"Patient Details", "Signs & Symptoms", "Classification", "Visit History" tabs.
It renders `<AssessmentWizard patientId={patient.id} />`.

## Components

### `AssessmentWizard` (`src/components/patients/assessment-wizard.tsx`)

- Owns `currentStep: 1 | 2 | 3 | 4` and the `VitalSigns` state object.
- Renders a step indicator (4 pills: Vitals, Symptoms, Labs, Summary) styled to
  match the existing tab-pill pattern (`bg-[#0f766e]` active, `text-zinc-600`
  inactive).
- Renders the active step's content:
  - Step 1 → `<VitalSignsStep />`
  - Steps 2-4 → placeholder card: "This step is part of issue #20/#21/#22 and
    isn't built yet."
- Footer: Back button (disabled on step 1) / Next button (disabled until step 1's
  required fields are valid — see below). Next on step 4's placeholder does
  nothing further (no real step 5).

### `VitalSignsStep` (`src/components/patients/assessment/vital-signs-step.tsx`)

Pure controlled component — receives `values` and `onChange` from the wizard, no
internal state.

Fields (all required to advance):

| Field | Unit | Abnormal range (orange highlight) |
|---|---|---|
| Systolic BP | mmHg | > 140 |
| Diastolic BP | mmHg | > 90 |
| Temperature | °C | < 36 or > 37.5 |
| Pulse | bpm | < 60 or > 100 |
| Respiratory Rate | breaths/min | < 12 or > 20 |
| Weight | kg | — |
| Height | cm | — |

BMI is derived (`weight / (height/100)²`), displayed read-only as soon as both
weight and height are entered, and highlighted orange when < 18.5 or ≥ 30.

Each input gets an orange border + orange value text when its value is outside
its abnormal range. BP's two fields are evaluated independently (either one
out of range highlights that field, not both).

### Validation gate

"Next" on step 1 is disabled until all 7 fields (Systolic BP, Diastolic BP,
Temperature, Pulse, Respiratory Rate, Weight, Height) have a value. Abnormal
values do not block progression — they're a visual warning, not a hard stop.

## Data model

No changes to `VisitLabs`/`Visit` types in this issue — vitals stay in wizard
-local state since there's no save target yet. Respiratory Rate, Height, and
BMI don't currently exist in `VisitLabs`; they'll be added when persistence is
wired up in issue #22, scoped to that issue's design.

## Out of scope

- Saving/submitting the assessment.
- Steps 2-4 functionality (separate issues).
- Editing/resuming an in-progress assessment across page reloads.
