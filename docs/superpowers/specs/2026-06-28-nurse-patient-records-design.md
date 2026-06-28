# Nurse Patient Records & Risk Classification — Design

## Context

Follows [2026-06-28-auth-roles-foundation-design.md](2026-06-28-auth-roles-foundation-design.md),
which built the mock-login/role-switcher foundation and placeholder dashboard
shells. That spec explicitly deferred patient registration, visit
signs/symptoms entry, and the classification engine (F.6/F.7/F.8 from the
RBC/MNCDA platform requirements) as future work — this is that slice.

The current dashboard sidebar has a disabled "Patient Registry" item tagged
"Soon" for every role. This slice makes it real for the `nurse` role: a
patient list and a tabbed patient detail view, modeled visually on the
Rwanda MOH "eBuzima" Antenatal Care module (list view with filters; detail
view with a tab strip), but scoped to what our spec actually requires —
recording signs/symptoms and computing the red/orange/yellow/green
classification — not eBuzima's full general-EMR tab set (Consultation,
Investigation, Treatment, Consumables, Vaccination, Discharge), which is out
of scope.

This remains frontend-only: no backend, no real database. Data is read and
written to `localStorage`, mirroring the pattern already used for the auth
session in `src/lib/auth/auth-context.tsx`.

## Goals

- A nurse can view a list of registered patients, register a new patient,
  open a patient's record, log a visit's signs & symptoms, and see the
  computed risk classification — all persisted in `localStorage` across
  reloads.
- The classification rule (highest-severity selected symptom wins) is
  implemented for a representative subset of the spec's full symptom list.
- The sidebar's "Patient Registry" item becomes a working link only for the
  `nurse` role; it stays a disabled "Soon" placeholder for every other role.

## Non-goals

- No backend, API, or real database.
- No editing of patient demographics after registration (read-only on the
  Patient Details tab in this slice).
- No SMS/email notifications triggered by classification (that's the
  separate notification-module slice referenced in the auth/roles spec).
- No full transcription of the spec's ~40-item symptom table — only a
  representative ~12-item subset spanning all three severities.
- "ANC Visits" and "Risk Classification" remain disabled sidebar items —
  they are tabs inside a patient's detail page, not standalone routes.

## Data model

```ts
// src/lib/patients/types.ts

interface Patient {
  id: string;
  name: string;
  age: number;
  gestationalAgeWeeks: number;
  facility: string;
  registeredAt: string; // ISO date
  obstetricHistory: string; // free text, e.g. "G3P2, previous PPH"
  medicalHistory: string;   // free text, e.g. "Chronic hypertension"
}

type RiskLevel = "green" | "yellow" | "orange" | "red";

interface Visit {
  id: string;
  patientId: string;
  date: string; // ISO date
  symptomIds: string[]; // selected from SYMPTOM_CHECKLIST
  riskLevel: RiskLevel; // computed, see classification rule below
  notes: string;
}
```

`src/lib/patients/storage.ts` owns reading/writing two `localStorage` keys
(`ubuntumed.patients`, `ubuntumed.visits`), seeding a handful of demo
patients (with at least one prior visit each, so the list isn't empty and
risk badges have something to show) on first load if empty.

## Symptom checklist & classification rule

`src/lib/patients/symptom-checklist.ts`:

```ts
const SYMPTOM_CHECKLIST = [
  { id: "uncontrolled-htn", label: "Uncontrolled hypertension", severity: "red" },
  { id: "preeclampsia", label: "Preeclampsia / eclampsia", severity: "red" },
  { id: "pph", label: "Postpartum hemorrhage", severity: "red" },
  { id: "severe-anemia", label: "Severe anemia (Hb < 7 g/dl)", severity: "red" },
  { id: "prev-cs-2x", label: "Previous C/S ≥2 scars, on labor", severity: "red" },
  { id: "teenage-labor", label: "Teenage pregnancy (≤18), on labor", severity: "red" },
  { id: "preterm-labor", label: "Preterm labor", severity: "orange" },
  { id: "controlled-htn", label: "Controlled chronic hypertension", severity: "yellow" },
  { id: "teenage", label: "Teenage pregnancy (<18)", severity: "yellow" },
  { id: "advanced-age", label: "Advanced maternal age (>40)", severity: "yellow" },
  { id: "prev-pph", label: "Previous PPH (past obstetric history)", severity: "yellow" },
  { id: "multiple-gestation", label: "Multiple gestation", severity: "yellow" },
] as const;
```

**Classification rule**: a visit's `riskLevel` is the highest severity among
its selected symptoms (red > orange > yellow), defaulting to `green` if none
are selected. A patient's "latest risk" (shown in the list) is the
`riskLevel` of their most recent visit by date; a patient with no visits yet
shows as `green`.

## Patient list page (`/dashboard/nurse/patients`)

- Header: "Patients" title + "+ Register Patient" button opening a form
  (name, age, gestational age, obstetric history, medical history) that
  writes a new `Patient` to storage and navigates to its detail page.
- Filter bar: text search by name; dropdown filter by latest risk level
  (All/Red/Orange/Yellow/Green).
- Table columns: Name, Age, Gestational age (weeks), Latest risk (colored
  dot + label badge), Last visit date, Registered date. Row click navigates
  to `/dashboard/nurse/patients/[id]`.
- Empty state ("No patients registered yet") for the edge case where storage
  has been cleared — shouldn't occur normally since we seed demo data.

## Patient detail page (`/dashboard/nurse/patients/[id]`)

Tab strip: **Patient Details** / **Signs & Symptoms** / **Classification** /
**Visit History**.

- **Patient Details**: read-only display of demographics, obstetric
  history, medical history.
- **Signs & Symptoms**: the checklist above as checkboxes (grouped loosely
  by severity), a date field defaulting to today, a notes textarea, and a
  "Save Visit" button that computes `riskLevel` and appends a new `Visit`.
- **Classification**: large, prominent badge showing the current (latest
  visit's) risk color, plus the static red/orange/yellow/green legend
  (reusing the visual style of the dashboard's existing Risk Distribution
  legend).
- **Visit History**: list of past visits for this patient, newest first —
  date, risk badge, selected symptom labels, notes.

## Routing & guards

- Sidebar's "Patient Registry" button (`src/components/dashboard/sidebar.tsx`)
  becomes a real `<Link href="/dashboard/nurse/patients">` only when
  `useAuth().user.role === "nurse"`; unchanged (disabled, "Soon") for every
  other role.
- `/dashboard/nurse/patients` and `/dashboard/nurse/patients/[id]` are
  wrapped in the existing `RoleGuard` component (`path="/dashboard/nurse"`),
  consistent with how every other `/dashboard/*` route is gated — only
  `nurse` or `admin` may access them.
- `src/lib/patients/` mirrors the existing `src/lib/auth/` structure:
  `types.ts`, `symptom-checklist.ts`, `storage.ts`.

## Out of scope for this slice (future work)

- Editing/deleting patients or visits.
- The full ~40-item symptom table from the classification spec.
- SMS/email notifications on red/orange classification (separate
  notification-module slice).
- Real dashboards reflecting actual patient/visit counts on the Overview
  page's stat cards (still static placeholders for every role).
