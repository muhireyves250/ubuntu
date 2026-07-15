# Nurse Workflow Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the nurse-facing patient workflow around a real registration form, an Open/Closed pregnancy lifecycle, a merged Visit model (attendance + clinical data as one record), an emergency danger-sign triage screen that auto-creates referrals, and a scheduling-aware Visit History dashboard + Pregnancy Timeline.

**Architecture:** All changes stay within the existing localStorage-backed pattern (`src/lib/patients/storage.ts` + `use-patients.ts`) — no backend involved in this plan. The data model realignment (`types.ts`) happens first and deliberately breaks every consumer at once; subsequent tasks fix consumers file by file, same proven approach as prior phases of this codebase's evolution.

**Tech Stack:** Next.js App Router, React, TypeScript strict, Tailwind CSS v4, localStorage via the existing `storage.ts` subscribe/snapshot pattern, pnpm.

## Global Constraints

- Design spec: `docs/superpowers/specs/2026-07-11-nurse-workflow-redesign-design.md` — read it before starting; every task below implements a piece of it.
- No backend integration in this plan — everything is localStorage-backed, matching the existing pattern in `storage.ts`.
- Package manager is **pnpm**. Never npm/yarn/bun.
- No test runner is configured in this repo — verification is `pnpm exec tsc --noEmit` (type-check) and `pnpm exec eslint .`, same as every prior phase of this project.
- Path alias `@/*` → `src/*`.
- `Visit` absorbs `AncVisit` — there is no separate attendance-record type. `AncVisit`, `useAncVisitsForPregnancy`, `recordAncVisit`, and `AddAncVisitModal` are all deleted, not deprecated.
- `Pregnancy.status` is `"open" | "closed"` — never `"active"`. Only one `"open"` pregnancy per patient at a time.
- `hospital`/`attendingNurse` on a `Visit`, and `registrationFacility`/`registeredBy` on a `Patient`, are always populated from `useAuth()`'s current user at the moment of the call — never passed in by a form/caller.
- The danger-sign triage list (`src/lib/patients/danger-signs.ts`) is separate from the existing 20-item `SYMPTOM_CHECKLIST` (`src/lib/patients/symptom-checklist.ts`), which stays untouched — it's still used inside "New Assessment."

---

### Task 1: Realign `Patient`, `Pregnancy`, `Visit` types; delete `AncVisit`

**Files:**
- Modify: `src/lib/patients/types.ts`

**Interfaces:**
- Produces: the `Patient`, `Pregnancy`, `Visit`, `VisitType` shapes every later task depends on.

- [ ] **Step 1: Replace `Patient`, `Pregnancy`, `Visit` and add `VisitType`; delete `AncVisit`**

```ts
export type RiskLevel = "green" | "yellow" | "orange" | "red";

export interface Patient {
  id: string;
  nationalId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // ISO date "YYYY-MM-DD"
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
  chronicConditions?: string[];
  registeredAt: string; // ISO date
  registeredBy: string;
  registrationFacility: string;
}

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

export type VisitType = "scheduled" | "unscheduled" | "emergency";

export interface Visit {
  id: string;
  pregnancyId: string;
  date: string;
  type: VisitType;
  ancNumber?: number;
  scheduledWeek?: number;
  hospital: string;
  attendingNurse: string;
  symptomIds: string[];
  riskLevel: RiskLevel;
  notes: string;
  labs?: VisitLabs;
  treatment?: string;
  followUpPlan?: string;
  emergencySummary?: string;
}

export interface Referral {
  id: string;
  patientId: string;
  acceptedAt: string;
  status: "active";
  receivingFacility?: string;
  reason?: string;
  urgency?: "routine" | "urgent" | "emergency";
}

export interface Pregnancy {
  id: string;
  patientId: string;
  pregnancyNumber: number;
  gravidity: number;
  parity: number;
  previousCS: number;
  previousPPH: boolean;
  previousEclampsia: boolean;
  previousStillbirth: boolean;
  lmpDate: string;
  eddDate: string;
  startDate: string;
  status: "open" | "closed";
  createdAt: string;
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

Delete the `AncVisit` interface entirely — do not leave it commented out or aliased.

- [ ] **Step 2: Type-check (expected to fail — every consumer of the old shapes breaks)**

Run: `pnpm exec tsc --noEmit`
Expected: FAIL with many errors across `storage.ts`, `use-patients.ts`, `seed-data.ts`, and every component under `src/components/patients/` and `src/app/dashboard/`. Record the full file list in your report — later tasks fix these one by one, and Task 20's final sweep checks none were missed.

- [ ] **Step 3: Commit**

```bash
git add src/lib/patients/types.ts
git commit -m "refactor(patients): realign Patient/Pregnancy/Visit types, delete AncVisit"
```

---

### Task 2: Danger-sign triage checklist

**Files:**
- Create: `src/lib/patients/danger-signs.ts`

**Interfaces:**
- Produces: `DangerSign`, `DANGER_SIGNS`, `VERY_HIGH_BP_SYSTOLIC`, `VERY_HIGH_BP_DIASTOLIC`, `HIGH_FEVER_CELSIUS` — consumed by Task 10 (triage screen rewrite).

- [ ] **Step 1: Write the file**

```ts
export interface DangerSign {
  id: string;
  label: string;
  autoDetected?: "bp" | "fever";
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

export const VERY_HIGH_BP_SYSTOLIC = 160;
export const VERY_HIGH_BP_DIASTOLIC = 110;
export const HIGH_FEVER_CELSIUS = 38.5;
```

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no new errors from this file (project-wide failures from Task 1 are still expected and not this task's concern).

- [ ] **Step 3: Commit**

```bash
git add src/lib/patients/danger-signs.ts
git commit -m "feat(patients): add emergency danger-sign triage checklist"
```

---

### Task 3: Age/name helpers and the 10-week ANC schedule

**Files:**
- Modify: `src/lib/format.ts`
- Modify: `src/lib/patients/pregnancy.ts`

**Interfaces:**
- Produces: `computeAge(dateOfBirth: string): number`, `fullName(patient: Pick<Patient, "firstName" | "lastName">): string` (in `format.ts`); updated `ANC_SCHEDULE` (10 entries), `nextDueVisit(pregnancy: Pregnancy, visits: Visit[]): { week: number; overdue: boolean } | null`, `missedVisits(pregnancy: Pregnancy, visits: Visit[]): number[]` (in `pregnancy.ts`).

- [ ] **Step 1: Add `computeAge` and `fullName` to `format.ts`**

```ts
import type { Patient } from "./patients/types";

export function computeAge(dateOfBirth: string): number {
  const dob = new Date(`${dateOfBirth}T00:00:00`);
  const diffMs = Date.now() - dob.getTime();
  return Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
}

export function fullName(patient: Pick<Patient, "firstName" | "lastName">): string {
  return `${patient.firstName} ${patient.lastName}`.trim();
}
```

Add these alongside the existing exports in `format.ts` (don't remove `shortId`/`getInitials`/`formatLabs`/`relativeTime` — `formatLabs`'s `Visit` import stays valid since `VisitLabs` is unchanged). Add the `Patient` import to this file's existing import line if a `Patient` type import doesn't already exist there.

- [ ] **Step 2: Replace `ANC_SCHEDULE` and add `nextDueVisit`/`missedVisits` in `pregnancy.ts`**

Read the current file first (it has `computeEdd`, `gestationalAgeWeeks`, `ANC_SCHEDULE`, `Milestone`, `deriveMilestones` — keep `computeEdd`/`gestationalAgeWeeks` unchanged, replace `ANC_SCHEDULE` and add the two new functions; `deriveMilestones` stays as-is since it already iterates `ANC_SCHEDULE` generically):

```ts
export const ANC_SCHEDULE: { visitNumber: number; dueByWeek: number }[] = [
  { visitNumber: 1, dueByWeek: 8 },
  { visitNumber: 2, dueByWeek: 12 },
  { visitNumber: 3, dueByWeek: 16 },
  { visitNumber: 4, dueByWeek: 20 },
  { visitNumber: 5, dueByWeek: 24 },
  { visitNumber: 6, dueByWeek: 28 },
  { visitNumber: 7, dueByWeek: 32 },
  { visitNumber: 8, dueByWeek: 36 },
  { visitNumber: 9, dueByWeek: 38 },
  { visitNumber: 10, dueByWeek: 40 },
];
```

```ts
import type { Pregnancy, Visit } from "./types";

export function nextDueVisit(
  pregnancy: Pregnancy,
  visits: Visit[],
): { week: number; overdue: boolean } | null {
  const currentWeeks = gestationalAgeWeeks(pregnancy.lmpDate);
  const loggedWeeks = new Set(
    visits
      .filter((v) => v.type !== "emergency" && v.scheduledWeek != null)
      .map((v) => v.scheduledWeek as number),
  );
  const next = ANC_SCHEDULE.find((s) => !loggedWeeks.has(s.dueByWeek));
  if (!next) return null;
  return { week: next.dueByWeek, overdue: currentWeeks > next.dueByWeek };
}

export function missedVisits(pregnancy: Pregnancy, visits: Visit[]): number[] {
  const currentWeeks = gestationalAgeWeeks(pregnancy.lmpDate);
  const loggedWeeks = new Set(
    visits
      .filter((v) => v.type !== "emergency" && v.scheduledWeek != null)
      .map((v) => v.scheduledWeek as number),
  );
  return ANC_SCHEDULE.filter(
    (s) => s.dueByWeek < currentWeeks && !loggedWeeks.has(s.dueByWeek),
  ).map((s) => s.dueByWeek);
}
```

(Add the `Pregnancy, Visit` type import to this file's existing import line — it likely doesn't import from `./types` yet since it only dealt with primitives before.)

- [ ] **Step 3: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no new errors from these two files themselves (project-wide Task-1 failures still expected).

- [ ] **Step 4: Commit**

```bash
git add src/lib/format.ts src/lib/patients/pregnancy.ts
git commit -m "feat(patients): add age/name helpers and 10-week ANC schedule with due/missed helpers"
```

---

### Task 4: Rewrite `storage.ts` for the merged Visit model and pregnancy lifecycle

**Files:**
- Modify: `src/lib/patients/storage.ts`

**Interfaces:**
- Consumes: `Patient`, `Pregnancy`, `Visit` (Task 1).
- Produces: `updatePregnancy(pregnancyId: string, updates: Partial<Pregnancy>): void` (new — needed for closing a pregnancy), all existing patient/visit/referral/pregnancy storage functions kept but with `AncVisit` machinery fully removed.

- [ ] **Step 1: Read the current file in full**, then remove every `AncVisit`-related piece: `ANC_VISITS_KEY`, `ancVisitsCache`, `ancVisitListeners`, `loadAncVisits`, `subscribeToAncVisits`, `getAncVisitsSnapshot`, `getServerAncVisitsSnapshot`, `addAncVisit`, and the `AncVisit` import.

- [ ] **Step 2: Add `updatePregnancy`**, following the exact pattern of the existing `updatePatient`:

```ts
export function updatePregnancy(pregnancyId: string, updates: Partial<Pregnancy>) {
  pregnanciesCache = loadPregnancies().map((p) =>
    p.id === pregnancyId ? { ...p, ...updates } : p,
  );
  writeList(PREGNANCIES_KEY, pregnanciesCache);
  pregnancyListeners.forEach((listener) => listener());
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors originating from `storage.ts` itself (it only deals with generic `Patient`/`Pregnancy`/`Visit`/`Referral` arrays and doesn't reference any removed field by name, so it should compile clean against the new types once `AncVisit` is gone).

- [ ] **Step 4: Commit**

```bash
git add src/lib/patients/storage.ts
git commit -m "refactor(patients): remove AncVisit storage, add updatePregnancy"
```

---

### Task 5: Rewrite `use-patients.ts` hooks for the new model

**Files:**
- Modify: `src/lib/patients/use-patients.ts`

**Interfaces:**
- Consumes: `updatePregnancy` (Task 4), `useAuth` (`@/lib/auth/auth-context`), `computeAge`/`fullName` (Task 3, not used directly in this file but establishes the pattern other tasks will follow), `ANC_SCHEDULE` (Task 3).
- Produces (the exact names every later UI task depends on):
  - `registerPatient(data: Omit<Patient, "id" | "registeredAt" | "registeredBy" | "registrationFacility">): Patient` — populates `registeredBy`/`registrationFacility` from the current auth user internally (this file already has access to auth via other hooks in the codebase — import `useAuth` is not usable inside a plain function; instead have `registerPatient` accept the current user's `name`/`facility` as part of its call site's responsibility is WRONG per the spec's "not passed in by the caller" rule — resolve this by having `registerPatient` read from a small non-hook accessor). **Concretely:** add a tiny helper at the top of this file:
    ```ts
    import { findDemoUserById } from "../auth/demo-users";
    function getCurrentUserSnapshot(): { name: string; facility: string } {
      const sessionUserId =
        typeof window !== "undefined"
          ? window.localStorage.getItem("ubuntumed.session")
          : null;
      const user = sessionUserId ? findDemoUserById(sessionUserId) : null;
      return { name: user?.name ?? "Unknown", facility: user?.facility ?? "Unknown facility" };
    }
    ```
    This reads the same `localStorage` session key `auth-context.tsx` already uses (read that file to confirm the exact key name and `findDemoUserById` signature before writing this — match it exactly, don't guess). `registerPatient` calls `getCurrentUserSnapshot()` internally rather than requiring a hook, since `registerPatient` is a plain function, not a component/hook, and is called from event handlers (not render).
  - `usePregnanciesForPatient(patientId: string): Pregnancy[]` — all of a patient's pregnancies, sorted newest-first by `createdAt`.
  - `createPregnancy(data: Omit<Pregnancy, "id" | "pregnancyNumber" | "eddDate" | "status" | "createdAt" | "delivery">): Pregnancy` — throws if an open pregnancy already exists for `data.patientId`; `pregnancyNumber` computed as existing-count + 1.
  - `closePregnancy(pregnancyId: string, delivery: NonNullable<Pregnancy["delivery"]>): void` — calls `updatePregnancy` with `{ status: "closed", delivery }`.
  - `useVisitsForPregnancy(pregnancyId: string): Visit[]` — sorted newest-first by `date`.
  - `useAllVisitsForPatient(patientId: string): Visit[]` — joins across all the patient's pregnancies (open and closed), sorted newest-first.
  - `recordVisit(data: { pregnancyId: string; type: VisitType; ancNumber?: number; scheduledWeek?: number; symptomIds: string[]; notes: string; labs?: VisitLabs }): Visit` — populates `hospital`/`attendingNurse` from `getCurrentUserSnapshot()`, computes `riskLevel` via `classifyRiskLevel(data.symptomIds)` for `type !== "emergency"`, or hardcodes `"red"` for `type === "emergency"`.
  - `createEmergencyVisit(patientId: string, dangerSignIds: string[], summary: string): { pregnancy: Pregnancy; visit: Visit; referral: Referral }` — finds the patient's open pregnancy or creates one with placeholder gravidity/parity of `1`/`0` and `lmpDate`/`eddDate` both set to today's date (a real LMP isn't known in an emergency — this is a deliberate placeholder the nurse can correct later, not a data-quality concern for this plan), then calls `recordVisit` with `type: "emergency"`, `emergencySummary: summary`, then calls the existing `addReferral`-backed helper (`acceptReferral`, already in this file — read its current implementation and reuse its pattern to create a `Referral` linked to `patientId`) with `urgency: "emergency"`.

Read the ENTIRE current `use-patients.ts` file before starting — every function listed above that isn't brand-new (`usePregnancyForPatient` → `usePregnanciesForPatient`, `useVisitsForPatient` → `useAllVisitsForPatient`, `useAncVisitsForPregnancy`/`recordAncVisit` → deleted, `recordVisit`, `registerPatient`) has an existing implementation you're replacing, not adding fresh — match the existing file's conventions (the `useSyncExternalStore` pattern, `crypto.randomUUID()` id generation, `getReferralsSnapshot()`/`getPregnanciesSnapshot()` usage) exactly.

- [ ] **Step 1: Read `src/lib/auth/auth-context.tsx` and `src/lib/auth/demo-users.ts`** to confirm the exact session-storage key and `findDemoUserById` signature before writing `getCurrentUserSnapshot`.

- [ ] **Step 2: Read the full current `use-patients.ts`** to see every existing hook/function you're touching or must leave alone (`useVisits`, `useReferrals`, `useActiveReferrals`, `acceptReferral`, `useFollowUpPatients`, `useTodaysVisits`, `useRiskSummary` if present — check what actually exists in this file; only change what's listed in this task's Interfaces section, leave everything else that still compiles against the new types untouched).

- [ ] **Step 3: Implement every function/hook listed in this task's Interfaces section**, deleting `usePregnancyForPatient`, `useVisitsForPatient`, `useAncVisitsForPregnancy`, `recordAncVisit` and their old implementations.

- [ ] **Step 4: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: this file itself compiles clean; remaining project-wide errors are now scoped to component files, which is expected at this checkpoint. Record the current file list — this is what Tasks 7–19 work through.

- [ ] **Step 5: Commit**

```bash
git add src/lib/patients/use-patients.ts
git commit -m "refactor(patients): rewrite hooks for merged Visit model and pregnancy lifecycle"
```

---

### Task 6: Update seed data

**Files:**
- Modify: `src/lib/patients/seed-data.ts`

**Interfaces:**
- Consumes: `Patient`, `Pregnancy`, `Visit` (Task 1).

- [ ] **Step 1: Replace `SEED_PATIENTS`** with 4 patients matching the new `Patient` shape (keep the same 4 names/registration dates for continuity, fill in plausible values for the new required fields):

```ts
import type { Patient, Pregnancy, Visit } from "./types";
import { classifyRiskLevel } from "./symptom-checklist";

export const SEED_PATIENTS: Patient[] = [
  {
    id: "patient-uwimana",
    nationalId: "1198780012345678",
    firstName: "Aline",
    lastName: "Uwimana",
    dateOfBirth: "1998-03-14",
    phone: "+250788111222",
    address: { district: "Bugesera", sector: "Nyamata", cell: "Kanazi", village: "Kanazi I" },
    emergencyContact: { name: "Jean Uwimana", relationship: "Husband", phone: "+250788111223" },
    bloodGroup: "O",
    rhFactor: "positive",
    chronicConditions: [],
    registeredAt: "2026-04-12",
    registeredBy: "Nurse Uwase",
    registrationFacility: "Nyamata Health Center",
  },
  {
    id: "patient-mukeshimana",
    nationalId: "1207780023456789",
    firstName: "Claudine",
    lastName: "Mukeshimana",
    dateOfBirth: "2007-08-02",
    phone: "+250788222333",
    address: { district: "Bugesera", sector: "Nyamata", cell: "Rilima", village: "Rilima II" },
    emergencyContact: { name: "Agnes Mukeshimana", relationship: "Mother", phone: "+250788222334" },
    chronicConditions: ["Hypertension"],
    registeredAt: "2026-05-02",
    registeredBy: "Nurse Uwase",
    registrationFacility: "Nyamata Health Center",
  },
  {
    id: "patient-ingabire",
    nationalId: "1191780034567890",
    firstName: "Solange",
    lastName: "Ingabire",
    dateOfBirth: "1991-11-20",
    phone: "+250788333444",
    address: { district: "Bugesera", sector: "Nyamata", cell: "Kanazi", village: "Kanazi II" },
    emergencyContact: { name: "Eric Ingabire", relationship: "Husband", phone: "+250788333445" },
    bloodGroup: "A",
    rhFactor: "negative",
    chronicConditions: [],
    registeredAt: "2026-05-20",
    registeredBy: "Nurse Uwase",
    registrationFacility: "Nyamata Health Center",
  },
  {
    id: "patient-nyiraneza",
    nationalId: "1195780045678901",
    firstName: "Beatrice",
    lastName: "Nyiraneza",
    dateOfBirth: "1995-06-09",
    phone: "+250788444555",
    address: { district: "Bugesera", sector: "Nyamata", cell: "Rilima", village: "Rilima I" },
    emergencyContact: { name: "Marie Nyiraneza", relationship: "Sister", phone: "+250788444556" },
    allergies: "Penicillin",
    chronicConditions: [],
    registeredAt: "2026-05-28",
    registeredBy: "Nurse Uwase",
    registrationFacility: "Nyamata Health Center",
  },
];
```

- [ ] **Step 2: Replace the visit-seeding logic with pregnancy + visit seeding.** Each seeded patient gets one open `Pregnancy` and one `Visit` referencing it (matching the gestational ages the old data implied — 32/28/22/36 weeks — via an LMP date backdated the right number of weeks from a fixed reference "today" isn't reliable across time, so instead set `lmpDate` far enough in the past that gestational age reads as roughly correct at any seed time is not required by this plan; simplest correct approach: pick fixed LMP dates in the past relative to the registration dates already used, consistent within the seed file itself, not relative to `Date.now()`):

```ts
export const SEED_PREGNANCIES: Pregnancy[] = [
  {
    id: "pregnancy-uwimana-1",
    patientId: "patient-uwimana",
    pregnancyNumber: 1,
    gravidity: 2,
    parity: 1,
    previousCS: 0,
    previousPPH: true,
    previousEclampsia: false,
    previousStillbirth: false,
    lmpDate: "2025-11-10",
    eddDate: "2026-08-17",
    startDate: "2025-11-10",
    status: "open",
    createdAt: "2026-04-12T09:00:00.000Z",
  },
  {
    id: "pregnancy-mukeshimana-1",
    patientId: "patient-mukeshimana",
    pregnancyNumber: 1,
    gravidity: 1,
    parity: 0,
    previousCS: 0,
    previousPPH: false,
    previousEclampsia: false,
    previousStillbirth: false,
    lmpDate: "2025-12-15",
    eddDate: "2026-09-21",
    startDate: "2025-12-15",
    status: "open",
    createdAt: "2026-05-02T09:00:00.000Z",
  },
  {
    id: "pregnancy-ingabire-1",
    patientId: "patient-ingabire",
    pregnancyNumber: 3,
    gravidity: 3,
    parity: 2,
    previousCS: 0,
    previousPPH: false,
    previousEclampsia: false,
    previousStillbirth: false,
    lmpDate: "2026-01-05",
    eddDate: "2026-10-12",
    startDate: "2026-01-05",
    status: "open",
    createdAt: "2026-05-20T09:00:00.000Z",
  },
  {
    id: "pregnancy-nyiraneza-1",
    patientId: "patient-nyiraneza",
    pregnancyNumber: 4,
    gravidity: 4,
    parity: 3,
    previousCS: 0,
    previousPPH: true,
    previousEclampsia: false,
    previousStillbirth: false,
    lmpDate: "2025-10-20",
    eddDate: "2026-07-27",
    startDate: "2025-10-20",
    status: "open",
    createdAt: "2026-05-28T09:00:00.000Z",
  },
];

function buildVisit(
  id: string,
  pregnancyId: string,
  date: string,
  symptomIds: string[],
  notes: string,
): Visit {
  return {
    id,
    pregnancyId,
    date,
    type: "scheduled",
    hospital: "Nyamata Health Center",
    attendingNurse: "Nurse Uwase",
    symptomIds,
    riskLevel: classifyRiskLevel(symptomIds),
    notes,
  };
}

export const SEED_VISITS: Visit[] = [
  buildVisit("visit-uwimana-1", "pregnancy-uwimana-1", "2026-06-10", ["prev-pph"], "Routine ANC visit, monitoring for recurrence given history."),
  buildVisit("visit-mukeshimana-1", "pregnancy-mukeshimana-1", "2026-06-15", ["teenage", "controlled-htn"], "Blood pressure stable on current medication."),
  buildVisit("visit-ingabire-1", "pregnancy-ingabire-1", "2026-06-20", ["multiple-gestation"], "Twin pregnancy confirmed on ultrasound, growth tracking normally."),
  buildVisit("visit-nyiraneza-1", "pregnancy-nyiraneza-1", "2026-06-05", ["prev-pph"], "Routine ANC visit, flagged for history of postpartum hemorrhage."),
  buildVisit("visit-nyiraneza-2", "pregnancy-nyiraneza-1", "2026-06-29", ["severe-anemia", "prev-pph"], "Hb dropped to 6.4 g/dl, referred for urgent management."),
];
```

- [ ] **Step 2: Wire `SEED_PREGNANCIES` into `storage.ts`'s `loadPregnancies`** — this task only defines the constant; check whether `loadPregnancies()` in `storage.ts` (Task 4) currently defaults to `[]` or a seed constant. If it defaults to `[]` (per the pre-Task-4 file you read), update `storage.ts` in this task to import `SEED_PREGNANCIES` and use it as `loadPregnancies`'s fallback, matching the exact pattern `loadPatients`/`loadVisits` already use (`stored ?? SEED_PREGNANCIES`, write-through if not already stored). This is a small addition to `storage.ts`, in this task, not Task 4 — Task 4 didn't have seed data to wire in yet.

- [ ] **Step 3: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: `seed-data.ts` and `storage.ts` compile clean; remaining errors are in components, expected at this checkpoint.

- [ ] **Step 4: Commit**

```bash
git add src/lib/patients/seed-data.ts src/lib/patients/storage.ts
git commit -m "feat(patients): update seed data for new Patient/Pregnancy/Visit shapes"
```

---

### Task 7: Rewrite `RegisterPatientModal`

**Files:**
- Modify: `src/components/patients/register-patient-modal.tsx`

**Interfaces:**
- Consumes: `registerPatient` (Task 5, now `(data: Omit<Patient, "id"|"registeredAt"|"registeredBy"|"registrationFacility">) => Patient`).

- [ ] **Step 1: Read the current file** for its modal shell/styling conventions (overlay, close button, `IconClose`, form wrapper classes) — reuse them exactly, only the fields change.

- [ ] **Step 2: Replace the form body with four sections**, each a `<fieldset>` with a `<legend>`, matching the styling already used for grouped fields elsewhere in this file (e.g. the existing "Risk history" fieldset pattern in `new-pregnancy-modal.tsx` if this file doesn't already have one):

  1. **Personal Information** — National ID Number (text, required), First Name (text, required), Last Name (text, required), Date of Birth (`type="date"`, required), Phone Number (text, required), Alternative Phone Number (text, optional), Marital Status (text, optional).
  2. **Address** — District, Sector, Cell, Village (all text, all required).
  3. **Emergency Contact** — Contact Name (required), Relationship (required), Phone Number (required).
  4. **Basic Medical Information** — Blood Group (text, optional, placeholder "e.g. O"), Rh Factor (`<select>`: blank/"positive"/"negative", optional), Known Allergies (textarea, optional), Chronic Medical Conditions (checkbox group: Hypertension, Diabetes, Heart Disease, HIV, Asthma, Epilepsy, Kidney Disease, Other — checking "Other" reveals a text input appended to the array as a free-text string alongside the checked labels).

- [ ] **Step 3: Update `handleSubmit`** to build the new `Patient`-shaped payload (nested `address`/`emergencyContact` objects) and call `registerPatient(payload)`.

- [ ] **Step 4: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: this file's errors resolved; remaining errors in other not-yet-fixed files.

- [ ] **Step 5: Commit**

```bash
git add src/components/patients/register-patient-modal.tsx
git commit -m "feat(patients): rewrite registration form for personal/address/emergency-contact/medical sections"
```

---

### Task 8: Update `EditPatientModal` and `PatientDetailsTab`

**Files:**
- Modify: `src/components/patients/edit-patient-modal.tsx`
- Modify: `src/components/patients/patient-details-tab.tsx`

**Interfaces:**
- Consumes: `Patient` (Task 1), `updatePatient` (existing, from `use-patients.ts` — its `Partial<Omit<Patient,...>>` signature already accepts any subset of the new fields since it's generic).

- [ ] **Step 1: `edit-patient-modal.tsx`** — same four sections as Task 7's registration form (this modal edits everything except `nationalId`, which stays immutable/not editable — omit it from this form entirely, or show it read-only if the current file already has a read-only-field convention). Pre-fill every field from the `patient` prop, including nested `address`/`emergencyContact` (spread into local state at the top: `const [district, setDistrict] = useState(patient.address.district)`, etc. — one piece of local state per leaf field, following this file's existing flat-`useState`-per-field convention, do not introduce a single nested-object `useState` since that's not this codebase's pattern).

- [ ] **Step 2: `patient-details-tab.tsx`** — replace the current field list with: National ID, Full name (`fullName(patient)` from Task 3), Date of birth, Age (`computeAge(patient.dateOfBirth)`), Phone, Alternative phone, Marital status, Address (join district/sector/cell/village with " / "), Emergency contact (name — relationship — phone, one line), Blood group, Rh factor, Allergies, Chronic conditions (comma-joined), Registered on, Registered by, Registration facility. Every optional field falls back to "—" when absent — this file already has that convention (`patient.obstetricHistory || "—"` today), keep it.

- [ ] **Step 3: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: both files' errors resolved.

- [ ] **Step 4: Commit**

```bash
git add src/components/patients/edit-patient-modal.tsx src/components/patients/patient-details-tab.tsx
git commit -m "feat(patients): update edit form and details tab for new Patient fields"
```

---

### Task 9: Rewrite Signs & Symptoms as the emergency triage screen

**Files:**
- Modify: `src/components/patients/signs-symptoms-tab.tsx`

**Interfaces:**
- Consumes: `DANGER_SIGNS`, `VERY_HIGH_BP_SYSTOLIC`, `VERY_HIGH_BP_DIASTOLIC`, `HIGH_FEVER_CELSIUS` (Task 2); `createEmergencyVisit` (Task 5).
- Produces: this component now takes `patientId` (unchanged prop) and calls `onFlagged: (result: { pregnancy: Pregnancy; visit: Visit; referral: Referral }) => void` (new prop — the parent, Task 17, renders a confirmation view from this).

- [ ] **Step 1: Replace the form** with: a BP systolic/diastolic quick-entry pair and a temperature quick-entry at the top, then the 10 `DANGER_SIGNS` as checkboxes below (the two `autoDetected` ones — `very-high-bp`, `high-fever` — render as a **disabled, visually-highlighted** checkbox row whose `checked` state is computed from the entered BP/temperature against the thresholds, not user-toggleable; the other 8 are normal interactive checkboxes).

```tsx
const isVeryHighBp =
  Number(bpSystolic) >= VERY_HIGH_BP_SYSTOLIC || Number(bpDiastolic) >= VERY_HIGH_BP_DIASTOLIC;
const isHighFever = Number(temperature) >= HIGH_FEVER_CELSIUS;

const activeDangerSignIds = [
  ...manualCheckedIds,
  ...(isVeryHighBp ? ["very-high-bp"] : []),
  ...(isHighFever ? ["high-fever"] : []),
];
```

- [ ] **Step 2: "Flag Emergency" button** — `disabled={activeDangerSignIds.length === 0}`. On click, build a plain-text `summary` from the triggered signs' labels (e.g. `"Convulsions; Very high blood pressure (182/118)"` — include the actual BP/temp reading in the summary text for the two auto-detected ones, plain labels for the rest), call `createEmergencyVisit(patientId, activeDangerSignIds, summary)`, then call `onFlagged(result)`.

- [ ] **Step 3: Remove the routine labs/vitals form entirely** from this file — that's now exclusively inside "New Assessment" (Task 15/16 territory). This tab is triage-only going forward.

- [ ] **Step 4: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: errors specific to this file resolved (its caller in `[id]/page.tsx` will still error until Task 17 — that's expected, not this task's job to fix).

- [ ] **Step 5: Commit**

```bash
git add src/components/patients/signs-symptoms-tab.tsx
git commit -m "feat(patients): rewrite Signs & Symptoms as emergency danger-sign triage"
```

---

### Task 10: `NewPregnancyModal` startDate field, `ClosePregnancyModal`, `PregnancyTab` wiring

**Files:**
- Modify: `src/components/patients/pregnancy/new-pregnancy-modal.tsx`
- Create: `src/components/patients/pregnancy/close-pregnancy-modal.tsx`
- Modify: `src/components/patients/pregnancy-tab.tsx`

**Interfaces:**
- Consumes: `createPregnancy`, `closePregnancy`, `usePregnanciesForPatient` (Task 5).

- [ ] **Step 1: `new-pregnancy-modal.tsx`** — add a `startDate` field (`type="date"`, defaults to whatever `lmpDate` currently holds via `useEffect`/`onChange` sync, but remains independently editable — a plain extra `useState` initialized to `lmpDate` and NOT auto-synced after the user touches it directly, simplest correct behavior: two independent `useState`s, `startDate` initialized lazily to `lmpDate`'s value only if `startDate` is still empty when `lmpDate` changes). Include `startDate` in the `createPregnancy` call payload.

- [ ] **Step 2: Create `close-pregnancy-modal.tsx`**, following `new-pregnancy-modal.tsx`'s exact structural pattern (same overlay/shell, same form-in-a-white-card layout):

Fields: Delivery Outcome (`<select>`: "live-birth"/"stillbirth"/"maternal-death", required), Delivery Date (`type="date"`, required), Delivery Method (`<select>`: "vaginal"/"cesarean"/"assisted", required), Baby Status (`<select>`: "alive"/"deceased", required), Birth Weight in kg (number, required), Mother's Condition (text, required), Pregnancy Summary (textarea, required). Submit calls `closePregnancy(pregnancy.id, { outcome, date, method, babyStatus, birthWeightKg: Number(birthWeightKg), motherCondition, summary })`.

```tsx
"use client";

import { useEffect, useState } from "react";
import { closePregnancy } from "@/lib/patients/use-patients";
import { IconClose } from "@/components/dashboard/icons";
import type { Pregnancy } from "@/lib/patients/types";

export function ClosePregnancyModal({
  pregnancy,
  onClose,
  onClosed,
}: {
  pregnancy: Pregnancy;
  onClose: () => void;
  onClosed: () => void;
}) {
  const [outcome, setOutcome] = useState<"live-birth" | "stillbirth" | "maternal-death">("live-birth");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<"vaginal" | "cesarean" | "assisted">("vaginal");
  const [babyStatus, setBabyStatus] = useState<"alive" | "deceased">("alive");
  const [birthWeightKg, setBirthWeightKg] = useState("");
  const [motherCondition, setMotherCondition] = useState("");
  const [summary, setSummary] = useState("");

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    closePregnancy(pregnancy.id, {
      outcome,
      date,
      method,
      babyStatus,
      birthWeightKg: Number(birthWeightKg),
      motherCondition,
      summary,
    });
    onClosed();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-300 bg-[#ffeedb] p-6 shadow-2xl dark:border-zinc-700 dark:bg-orange-950/40">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Close Pregnancy</h2>
          <button type="button" onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800">
            <IconClose className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4 rounded-xl border border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Delivery outcome
            <select value={outcome} onChange={(e) => setOutcome(e.target.value as typeof outcome)} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50">
              <option value="live-birth">Live birth</option>
              <option value="stillbirth">Stillbirth</option>
              <option value="maternal-death">Maternal death</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Delivery date
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Delivery method
            <select value={method} onChange={(e) => setMethod(e.target.value as typeof method)} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50">
              <option value="vaginal">Vaginal</option>
              <option value="cesarean">Cesarean</option>
              <option value="assisted">Assisted</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Baby status
            <select value={babyStatus} onChange={(e) => setBabyStatus(e.target.value as typeof babyStatus)} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50">
              <option value="alive">Alive</option>
              <option value="deceased">Deceased</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Birth weight (kg)
            <input type="number" required min={0} step="0.1" value={birthWeightKg} onChange={(e) => setBirthWeightKg(e.target.value)} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Mother's condition
            <input type="text" required value={motherCondition} onChange={(e) => setMotherCondition(e.target.value)} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Pregnancy summary
            <textarea required rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50" />
          </label>
          <div className="mt-2 grid grid-cols-2 gap-2.5">
            <button type="button" onClick={onClose} className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800">Cancel</button>
            <button type="submit" className="rounded-xl bg-[#0f766e] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-800">Close Pregnancy</button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update `pregnancy-tab.tsx`**: use `usePregnanciesForPatient(patientId)` instead of the old singular hook; find the open one (`.find(p => p.status === "open")`); if found, render the existing summary card + a new "Close Pregnancy" button next to "Add ANC Visit" (opens `ClosePregnancyModal`); if there are any closed pregnancies, render a simple list above the current-pregnancy section ("Pregnancy #N — Closed, delivered {delivery.date}"), clicking one shows that pregnancy's summary card read-only + its own `PregnancyTimeline` below (reuse the same rendering code path, just fed a different pregnancy + its own visits via `useVisitsForPregnancy`).

- [ ] **Step 4: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: these three files' errors resolved.

- [ ] **Step 5: Commit**

```bash
git add src/components/patients/pregnancy/new-pregnancy-modal.tsx src/components/patients/pregnancy/close-pregnancy-modal.tsx src/components/patients/pregnancy-tab.tsx
git commit -m "feat(patients): add pregnancy closing flow and past-pregnancies list"
```

---

### Task 11: Delete `AddAncVisitModal`, update `PregnancyTimeline`

**Files:**
- Delete: `src/components/patients/pregnancy/add-anc-visit-modal.tsx`
- Modify: `src/components/patients/pregnancy/pregnancy-timeline.tsx`

**Interfaces:**
- Consumes: `Visit`, `Referral`, `Pregnancy` (Task 1); `deriveMilestones` (Task 3, unchanged signature, now iterates the 10-week schedule).

- [ ] **Step 1: Delete `add-anc-visit-modal.tsx`** — confirm via `grep -rn "AddAncVisitModal" src` that its only importer was `pregnancy-tab.tsx`, already updated in Task 10 to no longer reference it. If grep shows any other importer, STOP and report NEEDS_CONTEXT.

- [ ] **Step 2: Update `pregnancy-timeline.tsx`**: remove the `anc-visit` `TimelineItem` kind and its rendering branch entirely (visits are the only thing now — no separate attendance record). In the `assessment` kind's rendering, make the marker dot color type-aware: `item.data.type === "emergency" ? "bg-red-600" : "bg-teal-700"` (currently it's always `bg-teal-700` except for overdue milestones). In the expanded detail for an `assessment` item, when `item.data.type === "emergency"`, show `item.data.emergencySummary` above the existing labs line. Update `itemLabel` for the `assessment` case to read the visit type: `"Emergency visit — classified RED"` / `"Scheduled ANC visit — classified {riskLevel}"` / `"Unscheduled visit — classified {riskLevel}"` instead of the current generic `"Assessment recorded — classified {riskLevel}"`.

- [ ] **Step 3: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: this file's errors resolved.

- [ ] **Step 4: Commit**

```bash
git add -u src/components/patients/pregnancy/add-anc-visit-modal.tsx src/components/patients/pregnancy/pregnancy-timeline.tsx
git commit -m "refactor(patients): drop separate ANC-visit timeline kind, add type-aware visit markers"
```

---

### Task 12: `VisitHistoryTab` becomes a scheduling dashboard

**Files:**
- Modify: `src/components/patients/visit-history-tab.tsx`

**Interfaces:**
- Consumes: `nextDueVisit`, `missedVisits` (Task 3); `Visit`, `Pregnancy` (Task 1).
- Produces: this component now takes `pregnancy: Pregnancy` (new prop, alongside existing `visits`) and two new callback props `onLogScheduledVisit: (week: number) => void`, `onLogUnscheduledVisit: () => void` (replacing the old single `onAddVisit`).

- [ ] **Step 1: Add a header strip above the existing table**: "Next due: Week {nextDueVisit(...).week}" (or "All scheduled visits logged" if `null`), a missed-visits count/badge if `missedVisits(...)` is non-empty, and counts of unscheduled/emergency visits (`visits.filter(v => v.type === "...")`).

- [ ] **Step 2: Add a Type column** to the existing table (Scheduled/Unscheduled/Emergency badge — reuse `RiskBadge`'s color conventions loosely or a simple colored `<span>`, this file doesn't need a new shared component for a 3-value badge) and a **Hospital**/**Nurse** column pair (`visit.hospital`, `visit.attendingNurse`).

- [ ] **Step 3: Replace the "+ Add Row" button** with two buttons: "Log Scheduled Visit" (calls `onLogScheduledVisit(nextDueVisit(...)?.week ?? 0)`, disabled if `nextDueVisit` returns `null`) and "Log Unscheduled Visit" (calls `onLogUnscheduledVisit()`).

- [ ] **Step 4: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: this file's own errors resolved (its caller breaks until Task 17 fixes it — expected).

- [ ] **Step 5: Commit**

```bash
git add src/components/patients/visit-history-tab.tsx
git commit -m "feat(patients): turn Visit History into a scheduling dashboard"
```

---

### Task 13: `AssessmentWizard` takes a visit context, saves via the merged model

**Files:**
- Modify: `src/components/patients/assessment-wizard.tsx`
- Modify: `src/components/patients/assessment/summary-step.tsx`

**Interfaces:**
- Consumes: `recordVisit` (Task 5).
- Produces: `AssessmentWizard` now takes `pregnancyId: string`, `type: "scheduled" | "unscheduled"`, `scheduledWeek?: number`, `ancNumber?: number` instead of just `patientId` (emergency visits never go through this wizard — they're created directly by `createEmergencyVisit` in Task 9).

- [ ] **Step 1: Read both files in full first** — `assessment-wizard.tsx` currently takes `{ patientId }` and passes it through to `SummaryStep`, which is presumably where `recordVisit`/`recordAncVisit`-equivalent saving happens; confirm this by reading `summary-step.tsx`.

- [ ] **Step 2: Update `AssessmentWizard`'s props** to `{ pregnancyId, type, scheduledWeek, ancNumber }`, threading them down to `SummaryStep` alongside the existing `vitals`/`symptoms`/`labs`/`referToLab` props.

- [ ] **Step 3: Update `SummaryStep`'s save call** to `recordVisit({ pregnancyId, type, ancNumber, scheduledWeek, symptomIds: symptoms, notes: <whatever this step currently collects as notes, if anything — check the existing implementation>, labs: <mapped from the wizard's LabValues to VisitLabs, following whatever mapping already exists there today> })`.

- [ ] **Step 4: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: these two files' errors resolved.

- [ ] **Step 5: Commit**

```bash
git add src/components/patients/assessment-wizard.tsx src/components/patients/assessment/summary-step.tsx
git commit -m "feat(patients): thread visit type/schedule context through the assessment wizard"
```

---

### Task 14: `ProfileOverviewTab` derived hospital/nurse

**Files:**
- Modify: `src/components/patients/profile-overview-tab.tsx`

**Interfaces:**
- Consumes: `Visit`, `Patient` (Task 1); `fullName`, `computeAge` (Task 3).

- [ ] **Step 1: Read the current file in full.**

- [ ] **Step 2: Add "Current hospital" / "Current assigned nurse" rows**, derived from the single most-recent `Visit` (by `date`) passed into this component — confirm what visits data this component currently receives as a prop (it's called from `[id]/page.tsx`, Task 15 wires it to `useAllVisitsForPatient`); read `latestVisit.hospital`/`latestVisit.attendingNurse`, fallback to `"Not yet seen"` if there are no visits at all. Remove any existing row that read a static `patient.facility` (no longer exists on `Patient`).

- [ ] **Step 3: Update any `patient.name`/`patient.age`/`patient.gestationalAgeWeeks` reads** in this file to `fullName(patient)` / `computeAge(patient.dateOfBirth)` / the pregnancy-derived gestational age (already partially handled if this file already has a `pregnancy ? gestationalAgeWeeks(...) : ...` pattern — check and keep it, just drop the `patient.gestationalAgeWeeks` fallback branch since that field no longer exists; show "—" instead when there's no open pregnancy).

- [ ] **Step 4: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: this file's errors resolved.

- [ ] **Step 5: Commit**

```bash
git add src/components/patients/profile-overview-tab.tsx
git commit -m "feat(patients): derive current hospital/nurse from latest visit on Overview"
```

---

### Task 15: Patient detail page wiring

**Files:**
- Modify: `src/app/dashboard/nurse/patients/[id]/page.tsx`

**Interfaces:**
- Consumes: `usePregnanciesForPatient`, `useAllVisitsForPatient`, `useVisitsForPregnancy` (Task 5); updated prop signatures of `ProfileOverviewTab` (Task 14), `SignsSymptomsTab` (Task 9), `VisitHistoryTab` (Task 12), `AssessmentWizard` (Task 13), `PregnancyTab` (Task 10); `fullName` (Task 3).

- [ ] **Step 1: Read the current file in full.**

- [ ] **Step 2: Replace `patient.name` header/avatar reads** with `fullName(patient)`.

- [ ] **Step 3: Replace `usePatient`+old visit/pregnancy hooks** with: `usePregnanciesForPatient(patientId)` (find the open one), `useAllVisitsForPatient(patientId)` (for Overview/timeline-wide views), `useVisitsForPregnancy(openPregnancy.id)` (for the Visit History tab, scoped to the current pregnancy).

- [ ] **Step 4: Add local state for the visit-creation flow**: `showEmergencyResult: { pregnancy, visit, referral } | null` (set by `SignsSymptomsTab`'s `onFlagged`, rendered as a confirmation banner/section per the design spec's "confirmation view" requirement — reuse `AssessmentWizard`'s existing post-save result-screen JSX pattern for visual consistency, read that pattern from `assessment-wizard.tsx` before writing this); `assessmentContext: { type: "scheduled" | "unscheduled"; scheduledWeek?: number; ancNumber?: number } | null` (set by `VisitHistoryTab`'s `onLogScheduledVisit`/`onLogUnscheduledVisit` callbacks, gates whether the "New Assessment" tab is reachable — if `null`, that tab shows a message like "Select or create a visit from Visit History first" instead of the wizard).

- [ ] **Step 5: Wire every updated child component's new props** per their Interfaces sections in Tasks 9/10/12/13/14.

- [ ] **Step 6: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: PASS or very close to it — this is the last file expected to still be broken from Task 1's original breakage; if anything else still errors, that's Task 19's job (final sweep), not this task's.

- [ ] **Step 7: Commit**

```bash
git add "src/app/dashboard/nurse/patients/[id]/page.tsx"
git commit -m "feat(patients): wire patient detail page to the new pregnancy/visit hooks and gated assessment flow"
```

---

### Task 16: Patients list page columns

**Files:**
- Modify: `src/app/dashboard/nurse/patients/page.tsx`

**Interfaces:**
- Consumes: `fullName`, `computeAge` (Task 3); `usePatients` (unchanged signature); `useAllVisitsForPatient`-equivalent aggregate (this page likely reads `useVisits()` directly today across all patients — check and adapt to however visits are now organized per-pregnancy; simplest correct approach: this list page's risk-level column needs "this patient's most recent visit across any pregnancy," which means it needs the same per-patient latest-visit lookup as Overview — read the current file to see its exact join logic before changing it).

- [ ] **Step 1: Read the current file in full.**

- [ ] **Step 2: Replace `patient.name`/`patient.age`/`patient.facility` reads** in the table with `fullName(patient)` / `computeAge(patient.dateOfBirth)` / (drop the Facility column, or replace it with the same derived "current hospital" value Task 14 computes for Overview — pick whichever this file's existing join logic makes cheaper; if it already loads all visits and groups by patient, reuse that grouping to also read `.hospital` off the latest one, don't fetch it a second way).

- [ ] **Step 3: Update the ID column** to show `patient.nationalId` instead of `shortId(patient.id)` (a synthetic ID scheme that no longer makes sense given a real National ID now exists).

- [ ] **Step 4: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: this file's errors resolved.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/nurse/patients/page.tsx
git commit -m "feat(patients): update patients list columns for new Patient fields"
```

---

### Task 17: Fix remaining consumers

**Files:**
- Modify: `src/components/dashboard/patient-search.tsx`
- Modify: `src/components/dashboard/patient-emergency-info-modal.tsx`
- Modify: `src/components/dashboard/red-case-alert.tsx`
- Modify: `src/components/dashboard/side-panel.tsx`
- Modify: `src/components/patients/create-referral-modal.tsx`
- Modify: `src/app/dashboard/central/page.tsx`
- Modify: `src/app/dashboard/dh/page.tsx`
- Modify: `src/app/dashboard/nurse/alerts/page.tsx`
- Modify: `src/app/dashboard/nurse/risk-classification/page.tsx`

**Interfaces:**
- Consumes: `fullName`, `computeAge` (Task 3); whatever this task's own investigation finds each file actually needs (see Step 1).

- [ ] **Step 1: Run `pnpm exec tsc --noEmit` first** and get the full current error list — by this point in the plan it should be scoped to exactly these 9 files (confirm; if it's a different set, that's fine, work the actual list, not this hardcoded one — note any discrepancy in your report).

- [ ] **Step 2: Fix each file's errors**, following the same pattern used throughout this plan: `patient.name` → `fullName(patient)`, `patient.age` → `computeAge(patient.dateOfBirth)`, `patient.gestationalAgeWeeks` → derive from that patient's open pregnancy where one is in scope, `"—"` fallback otherwise, `patient.facility` → the nearest available derived-hospital value in scope (a prop already threaded in, or "—" if genuinely unavailable in that component's data). For any reference to `AncVisit` or the old singular `usePregnancyForPatient`/`useVisitsForPatient`, swap to the Task 5 replacements.

- [ ] **Step 3: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: PASS, zero errors project-wide.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/patient-search.tsx src/components/dashboard/patient-emergency-info-modal.tsx src/components/dashboard/red-case-alert.tsx src/components/dashboard/side-panel.tsx src/components/patients/create-referral-modal.tsx src/app/dashboard/central/page.tsx src/app/dashboard/dh/page.tsx src/app/dashboard/nurse/alerts/page.tsx src/app/dashboard/nurse/risk-classification/page.tsx
git commit -m "fix(patients): update remaining consumers for the new Patient/Pregnancy/Visit model"
```

---

### Task 18: Final sweep and manual verification

**Files:** none (verification only)

- [ ] **Step 1: Full project type-check**

Run: `pnpm exec tsc --noEmit`
Expected: PASS, zero errors project-wide.

- [ ] **Step 2: Full project lint**

Run: `pnpm exec eslint .`
Expected: zero new errors (any pre-existing unrelated warning is not this plan's concern).

- [ ] **Step 3: Grep sweep for dead references**

Run: `grep -rn "AncVisit\|patient\.name\b\|patient\.age\b\|patient\.gestationalAgeWeeks\|patient\.facility\b\|patient\.obstetricHistory\|patient\.medicalHistory\|useVisitsForPatient\b\|usePregnancyForPatient\b" src`
Expected: zero matches (or only matches inside comments — inspect any hit).

- [ ] **Step 4: Manual browser verification.** Start the dev server (`pnpm dev`) and, as the nurse role:
  1. Register a new patient through the 4-section form — confirm it appears in the patients list with the National ID shown.
  2. Open the patient, create a new pregnancy (with the new `startDate` field), confirm the Pregnancy tab shows it.
  3. Log a scheduled visit through Visit History → New Assessment — confirm it appears in the timeline and the Visit History dashboard's "next due" updates.
  4. On a different patient, go to Signs & Symptoms, enter a BP of 170/120, confirm "Very high blood pressure" auto-highlights, click "Flag Emergency," confirm an emergency visit + referral + RED classification are created and a confirmation view is shown.
  5. Close a pregnancy via the new Close Pregnancy flow, confirm it moves to the "past pregnancies" list and its timeline is still viewable.
  6. Check Overview shows "Current hospital"/"Current assigned nurse" reflecting the most recent visit.

Report the outcome of each check explicitly. If any fails, do not mark this task complete — escalate with specifics.

---

## Self-Review Notes

- **Spec coverage:** Every numbered section of the design spec (Registration, Overview, Signs & Symptoms/emergency workflow, Pregnancy open/close, Pregnancy Timeline, Visit History dashboard, Assessment wizard integration) maps to at least one task above (7→Registration, 14→Overview, 9→Signs&Symptoms, 10→Pregnancy lifecycle, 11→Timeline, 12→Visit History, 13→Assessment wizard, 15→wiring it all together, 16→list page, 17→remaining consumers).
- **Placeholder scan:** no TBD/TODO markers; every step has literal code, or (for the handful of "read the current file and match its existing pattern" steps in the UI tasks) an explicit description of what to look for and why guessing isn't acceptable there.
- **Type consistency:** `Patient`/`Pregnancy`/`Visit`/`VisitType` (Task 1) are the single source every later task's function signatures reference verbatim — `registerPatient`, `createPregnancy`, `closePregnancy`, `recordVisit`, `createEmergencyVisit` (Task 5) all match the field names Task 1 defines, and every UI task's prop-threading (`onFlagged`, `onLogScheduledVisit`, etc.) is named consistently between the component that produces the callback (Tasks 9/12) and the page that consumes it (Task 15).
