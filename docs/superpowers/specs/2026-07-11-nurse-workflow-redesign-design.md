# Nurse Workflow Redesign — Registration, Pregnancy Lifecycle, Emergency Triage, Visit Scheduling, Timeline

## Problem

The current nurse workflow has four gaps relative to the target clinical process:

1. **Registration is overloaded.** `RegisterPatientModal` collects `obstetricHistory`/`medicalHistory`/`gestationalAgeWeeks` at registration time — clinical/pregnancy data that belongs in the Pregnancy and Assessment modules, not on the identity record. It also has no national ID, address, emergency contact, or basic medical info (blood group, allergies, chronic conditions).
2. **Pregnancy has no lifecycle.** `Pregnancy.status` is permanently `"active"` — there's no way to close a pregnancy (record a delivery outcome) or start a new one afterward. `gravity`/`parity` exist but nothing represents "this pregnancy ended, here's what happened."
3. **There are two parallel, disconnected visit concepts.** `Visit` (symptoms/labs/risk classification, recorded via the "Signs & Symptoms" tab) and `AncVisit` (a lightweight attendance record: date/number/provider/notes, recorded via "Add ANC Visit") both exist and don't reference each other. A real ANC visit needs vitals + symptoms + labs + risk classification + attendance info as **one** record.
4. **No emergency fast-path.** Every visit today goes through the same "Signs & Symptoms" form (symptom checklist + full labs/vitals). There's no quick danger-sign triage that can, on its own, flag RED and auto-generate a referral without the nurse first completing a full assessment.

## Scope decisions

- **`Visit` absorbs `AncVisit`.** They become one record. `AncVisit` is deleted. `Visit` gains `ancNumber`, `provider`/`attendingNurse`, `hospital`, and `type: "scheduled" | "unscheduled" | "emergency"`. This matches how a real ANC visit actually works (attendance + clinical data together) and removes the need to keep two lists in sync.
- **`Pregnancy.status` becomes `"open" | "closed"`.** A patient can have multiple `Pregnancy` records over time (one per pregnancy), but only one `"open"` at once — enforced the same way the existing `createPregnancy` already guards against a second active pregnancy, just renamed. Closing records delivery outcome fields directly on the `Pregnancy` record (no separate "Delivery" entity — one pregnancy, one delivery, keeps the data model flat).
- **Danger-sign triage is a separate, fixed checklist from the general `SYMPTOM_CHECKLIST`.** The existing 20-item severity-ranked checklist (used inside "New Assessment") is untouched — it's for routine ANC symptom review. The new triage screen uses its own fixed list of 10 danger signs (per the source spec), 8 of which are plain checkboxes and 2 of which (very high BP, high fever) are auto-derived from a **quick BP + temperature entry** on the same screen — not the full Vitals form, which still exists inside "New Assessment" for proper charting. This keeps triage fast (the whole point) while still being data-driven rather than guessed.
- **Emergency auto-creation reuses existing `Referral`/alert plumbing**, not a new system. "Create an emergency referral" / "create an active emergency alert" call the same `createReferral`-equivalent functions the codebase already has for manual referrals (`create-referral-modal.tsx`'s underlying storage functions), just triggered automatically instead of via a form. Multi-hospital referral *routing/acceptance workflow* (the "sent to higher-level hospitals for acceptance" hand-off) is **out of scope** — this phase creates the referral record and alert; a receiving facility accepting/declining it is existing/future scope, not new work here.
- **"Current hospital" / "current assigned nurse" on Overview are computed, not stored on `Patient`.** Derived from the latest `Visit` (by date) across all the patient's pregnancies, or the most recent emergency visit if more recent. No new field on `Patient` — `Patient.facility` is retired as a static field in favor of this derived value (see Data model).
- **ANC schedule is a fixed constant** (weeks 8/12/16/20/24/28/32/36/38/40), replacing the existing 4-visit schedule constant (`ANC_SCHEDULE` in `pregnancy.ts`, currently weeks 12/26/30/36). This is a straightforward constant swap, not a structural change.
- **Backend integration is explicitly out of scope for this spec.** Everything here is built against the existing localStorage-backed pattern (`storage.ts` + `use-patients.ts`), matching how every other module in this frontend already works. Wiring to a backend that supports this shape is future work.

## Data model

`src/lib/patients/types.ts` changes:

```ts
export interface Patient {
  id: string;
  nationalId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // ISO date
  phone: string;
  altPhone?: string;
  maritalStatus?: string;
  address: {
    district: string;
    sector: string;
    cell: string;
    village: string;
  };
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  bloodGroup?: string;
  rhFactor?: "positive" | "negative";
  allergies?: string;
  chronicConditions?: string[]; // e.g. ["Hypertension", "Diabetes"]
  registeredAt: string; // ISO date
  registeredBy: string; // nurse name, from auth context at registration time
  registrationFacility: string; // nurse's facility at registration time
}
```

Notes:
- `name`/`age`/`gestationalAgeWeeks`/`facility`/`obstetricHistory`/`medicalHistory` are removed from `Patient`. Display name is `${firstName} ${lastName}` (computed at the point of use, same pattern already used elsewhere in this codebase — no new derived-field convention needed). Age is computed from `dateOfBirth`. Gestational age comes from the patient's open `Pregnancy`, if any. "Facility" is now the derived Overview value, not a stored field — `registrationFacility` is kept separately to answer "where was this patient first registered," which is a different question from "where is she currently being seen."

```ts
export interface Pregnancy {
  id: string;
  patientId: string;
  pregnancyNumber: number; // 1, 2, 3... sequential per patient
  gravidity: number;
  parity: number;
  previousCS: number;
  previousPPH: boolean;
  previousEclampsia: boolean;
  previousStillbirth: boolean;
  lmpDate: string;
  eddDate: string;
  startDate: string; // "Pregnancy start date" from the spec — defaults to lmpDate, editable
  status: "open" | "closed";
  createdAt: string;
  // Present only once status is "closed":
  delivery?: {
    outcome: "live-birth" | "stillbirth" | "maternal-death";
    date: string;
    method: "vaginal" | "cesarean" | "assisted";
    babyStatus: "alive" | "deceased";
    birthWeightKg: number;
    motherCondition: string;
    summary: string;
  };
}
```

```ts
export type VisitType = "scheduled" | "unscheduled" | "emergency";

export interface Visit {
  id: string;
  pregnancyId: string; // replaces patientId — a visit always belongs to a pregnancy now
  date: string;
  type: VisitType;
  ancNumber?: number; // set for scheduled/unscheduled visits, omitted for emergency
  scheduledWeek?: number; // which of the 10 ANC schedule weeks this fulfills, if any
  hospital: string;
  attendingNurse: string;
  symptomIds: string[];
  riskLevel: RiskLevel;
  notes: string;
  labs?: VisitLabs;
  treatment?: string;
  followUpPlan?: string;
  // Present only for type "emergency":
  emergencySummary?: string;
}
```

`AncVisit` interface: **deleted**. `useAncVisitsForPregnancy`/`recordAncVisit` and their storage-layer equivalents are deleted along with it (Task-level detail in the plan).

New: `src/lib/patients/danger-signs.ts`

```ts
export interface DangerSign {
  id: string;
  label: string;
  autoDetected?: "bp" | "fever"; // absent = plain checkbox
}

export const DANGER_SIGNS: DangerSign[] = [
  { id: "severe-bleeding", label: "Severe vaginal bleeding" },
  { id: "convulsions", label: "Convulsions" },
  { id: "loss-of-consciousness", label: "Loss of consciousness" },
  { id: "severe-abdominal-pain", label: "Severe abdominal pain" },
  { id: "severe-headache-blurred-vision", label: "Severe headache with blurred vision" },
  { id: "difficulty-breathing", label: "Difficulty breathing" },
  { id: "very-high-bp", label: "Very high blood pressure", autoDetected: "bp" },
  { id: "high-fever", label: "High fever", autoDetected: "fever" },
  { id: "reduced-fetal-movement", label: "Reduced fetal movement" },
  { id: "ruptured-uterus", label: "Ruptured uterus" },
];

export const VERY_HIGH_BP_SYSTOLIC = 160; // mmHg — matches existing red-tier threshold conventions
export const VERY_HIGH_BP_DIASTOLIC = 110;
export const HIGH_FEVER_CELSIUS = 38.5;
```

`src/lib/patients/pregnancy.ts`: `ANC_SCHEDULE` constant updated to the 10-week schedule (8/12/16/20/24/28/32/36/38/40); `deriveMilestones` logic unchanged otherwise (still compares against gestational age and visits-of-type-scheduled-or-unscheduled count).

## Storage / hooks

Following the existing localStorage-backed pattern in `storage.ts` + `use-patients.ts`:

- `registerPatient(data)` — updated field set per the new `Patient` shape; `registeredBy`/`registrationFacility` populated from `useAuth()`'s current user at call time, not passed in by the caller.
- `usePregnanciesForPatient(patientId)` — **new**, replaces `usePregnancyForPatient` (singular) since a patient can now have closed pregnancies to look back on. Returns all, caller filters for the open one via `.find(p => p.status === "open")`.
- `createPregnancy(data)` — same guard as today (throws if an open pregnancy already exists), `pregnancyNumber` computed as `existingPregnancies.length + 1`.
- `closePregnancy(pregnancyId, delivery)` — **new**. Sets `status: "closed"` and the `delivery` object.
- `useVisitsForPregnancy(pregnancyId)` — replaces `useAncVisitsForPregnancy`; used by the Pregnancy tab and Visit History dashboard, which are always scoped to one pregnancy.
- `useAllVisitsForPatient(patientId)` — **new**, replaces the old `useVisitsForPatient`. Joins across all of a patient's pregnancies (open and closed) via `useVisitsForPregnancy` under the hood. This is what Overview uses to find the single latest visit regardless of which pregnancy it belongs to, and what the AI prediction panel / activity timeline (both patient-scoped, not pregnancy-scoped, today) continue to use unchanged.
- `recordVisit(data)` — updated to take the merged field set (`type`, `ancNumber?`, plus existing symptom/labs/notes fields). `hospital` and `attendingNurse` are **not passed by the caller** — they're populated from `useAuth()`'s current user (`user.facility`, `user.name`) at the moment the visit is saved, the same way `registerPatient` populates `registrationFacility`/`registeredBy`. This is what makes "current hospital/nurse" meaningful as a derived Overview value: it's a snapshot of whoever actually recorded the visit, not a field the nurse fills in by hand. Still computes `riskLevel` via `classifyRiskLevel` (unchanged) for scheduled/unscheduled visits; emergency visits are always `riskLevel: "red"` by definition.
- `createEmergencyVisit(patientId, dangerSigns, quickVitals)` — **new**. Implements the auto-workflow: finds or creates the open pregnancy, creates a `type: "emergency"` visit with `riskLevel: "red"` and `emergencySummary` built from the triggered danger signs, then calls the existing referral-creation storage function and the existing alert-creation storage function (both already used by the manual "Create Referral" flow — reused, not reimplemented).
- `nextDueVisit(pregnancy, visits)` / `missedVisits(pregnancy, visits)` — **new** helpers in `pregnancy.ts`, used by the Visit History dashboard: compare `ANC_SCHEDULE` weeks against current gestational age and which scheduled-week visits have already been logged.

## UI

### Registration (`RegisterPatientModal`)

Four sections matching the spec exactly: Personal Information, Address, Emergency Contact, Basic Medical Information. Chronic conditions is a multi-select checklist (Hypertension, Diabetes, Heart Disease, HIV, Asthma, Epilepsy, Kidney Disease, Other + free-text when "Other" is checked). No pregnancy/clinical fields anywhere in this form. Submit calls the updated `registerPatient`.

### Overview tab (`profile-overview-tab.tsx`)

Add two new derived rows: **Current hospital** and **Current assigned nurse**, computed from `latestVisit.hospital` / `latestVisit.attendingNurse` (latest across all the patient's visits, any pregnancy, any type) — falls back to "Not yet seen" if the patient has no visits. Existing "Facility" row (currently `patient.facility`) is removed in favor of these two.

### Signs & Symptoms tab → becomes the emergency triage screen

Replaces the current full labs/vitals form. New layout: quick BP (systolic/diastolic) + temperature inputs at the top, auto-highlighting "Very high blood pressure" / "High fever" in the checklist below once thresholds are crossed (visually, not just logically — a highlighted, disabled-but-checked checkbox row, so the nurse sees why it fired). The other 8 danger signs are plain checkboxes. A "Flag Emergency" button is enabled once any sign is checked/auto-detected; submitting it runs the auto-workflow (`createEmergencyVisit`) and navigates to a confirmation view showing what was created (pregnancy/visit/referral/alert), matching the existing `AssessmentWizard`'s post-save result-screen pattern for visual consistency.

### Pregnancy tab

- **No pregnancies yet, or all closed:** existing empty-state + "New Pregnancy" button, `NewPregnancyModal` gains the `startDate` field (defaults to LMP, editable) alongside existing fields.
- **Open pregnancy exists:** summary card (unchanged fields) + a **"Close Pregnancy"** button alongside "Add ANC Visit". Closing opens a new `ClosePregnancyModal` (delivery outcome/date/method/baby status/birth weight/mother condition/summary) → calls `closePregnancy`.
- **Past pregnancies list:** if the patient has any closed pregnancies, a simple list above the current state ("Pregnancy #1 — Closed, delivered 2025-03-12" style rows), clicking one shows that pregnancy's own summary card (read-only) + its own `PregnancyTimeline` below it, reusing the same timeline component against historical data.

### Visit History tab → becomes a dashboard, not just a table

Adds a header strip above the existing table: **Next due visit** (week + date estimate), count of **missed** visits (scheduled weeks already passed with no logged visit), quick counts of unscheduled/emergency visits. The existing table gains a **Type** column (Scheduled/Unscheduled/Emergency badge) and **Hospital**/**Nurse** columns. "Add Visit" becomes a small chooser: "Log Today's Scheduled Visit" (pre-fills `ancNumber`/`scheduledWeek` from the next-due computation) vs. "Log Unscheduled Visit" (nurse enters a reason, `scheduledWeek` omitted) — both lead into the existing `AssessmentWizard`, which is otherwise unchanged (Vitals → Symptoms → Labs → Summary), just now saving through the merged `recordVisit`. "New Assessment" is not reachable without going through one of these two choices first, per the spec's guarantee that every assessment belongs to a visit.

### Pregnancy Timeline

Existing `pregnancy-timeline.tsx` is updated, not rebuilt: drop the `anc-visit` item kind entirely (visits are now one thing), keep `assessment`/`referral`/`milestone`, and give the `assessment` item kind type-aware rendering — an emergency-type visit renders with a distinct marker (red dot instead of teal) and its expanded detail shows the emergency summary + linked referral status, matching the source spec's example output. Milestones now derive from the 10-week schedule instead of 4.

## Out of scope

- Backend integration of any of this (explicitly deferred per the user's direction).
- Multi-hospital referral acceptance/decline routing — this phase creates the referral record; accepting/declining it across facilities is existing/future scope.
- AI prediction changes — the existing AI prediction panel is untouched; it continues to read from whatever visit data exists.
- Editing a `Visit` or `Pregnancy` after creation (beyond closing a pregnancy).
- Multiple simultaneous open pregnancies, or reopening a closed one.
