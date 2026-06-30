# Pregnancy Management UI

GitHub issues: ubuntu-med/antinatal-web#16, #17, #18 (part of epic #5)

## Problem

The app currently has no concept of a "pregnancy" as a distinct record — `Patient`
has a single static `gestationalAgeWeeks` field set at registration, and ANC
visits are folded into the existing clinical `Visit` model (symptoms/labs/risk,
recorded via the "Signs & Symptoms" tab). The product epic (#5) calls for a
real Pregnancy record (LMP/EDD/obstetric history), a lightweight ANC visit log
scoped to that pregnancy, and a timeline view combining both with existing
Assessments and Referrals.

Issue #18 (timeline view) explicitly depends on #16 (create pregnancy record)
and #17 (ANC visit form), so this spec covers all three together as one slice.

## Scope decisions

- The existing clinical `Visit` type (symptoms, labs, risk classification,
  recorded via `recordVisit`) is untouched. The new `AncVisit` type is a
  separate, simpler attendance record (date, ANC number, provider, notes) —
  not a risk assessment.
- A patient can have at most one **active** pregnancy at a time, enforced at
  creation. `Pregnancy.status` exists as a field (`"active"` is the only value
  used) for future extension, but no UI to close/end a pregnancy is built in
  this slice — that's future scope, not covered by #16/#17/#18.
- Because only one active pregnancy can exist per patient, the pregnancy
  timeline can safely show *all* of that patient's existing `Visit` records
  as "Assessments" and *all* their `Referral` records, without needing a
  `pregnancyId` link on either.
- "Follow-up milestones" (an item type called for in #18) are derived, not
  stored: computed from a fixed 4-visit ANC schedule (visit 1 due by 12
  weeks, visit 2 by 26 weeks, visit 3 by 30 weeks, visit 4 by 36 weeks)
  compared against current gestational age and the count of `AncVisit`
  records logged so far.
- No new routes. Both creation flows (`New Pregnancy`, `Add ANC Visit`) are
  modals, consistent with the existing `RegisterPatientModal` pattern. The
  timeline lives in a new "Pregnancy" tab on the existing patient detail page
  (`src/app/dashboard/nurse/patients/[id]/page.tsx`), not a separate route —
  consistent with how "New Assessment" was added as a tab.

## Data model

`src/lib/patients/types.ts` additions:

```ts
export interface Pregnancy {
  id: string;
  patientId: string;
  gravidity: number;
  parity: number;
  previousCS: number;
  previousPPH: boolean;
  previousEclampsia: boolean;
  previousStillbirth: boolean;
  lmpDate: string; // ISO date
  eddDate: string; // ISO date, computed = lmpDate + 280 days
  status: "active";
  createdAt: string; // ISO datetime
}

export interface AncVisit {
  id: string;
  pregnancyId: string;
  date: string; // ISO date
  ancNumber: number; // 1, 2, 3, ...
  provider: string;
  notes: string;
}
```

EDD is computed at creation time as LMP + 280 days (equivalent result to
Naegele's rule) and stored, not recomputed on every render.

A shared helper `gestationalAgeWeeks(lmpDate: string, asOf?: string): number`
(in `src/lib/format.ts` or a new `src/lib/patients/pregnancy.ts`) computes
weeks elapsed since LMP, used both live in the New Pregnancy modal (as LMP is
typed) and wherever gestational age is displayed.

## Storage / hooks

`src/lib/patients/use-patients.ts` additions, following the existing
localStorage-backed pattern (`usePatients`, `useVisits`, etc.):

- `usePregnancyForPatient(patientId: string): Pregnancy | null` — returns the
  patient's active pregnancy, or `null`.
- `createPregnancy(data): Pregnancy` — throws if an active pregnancy already
  exists for `data.patientId` (the modal catches this and shows the warning
  from #16's acceptance criteria; in practice the modal also hides/disables
  the "New Pregnancy" trigger when one already exists, so this is a guard
  rather than the primary UX).
- `useAncVisitsForPregnancy(pregnancyId: string): AncVisit[]`.
- `recordAncVisit(data): AncVisit`.

## Gestational age display

The patient detail header (`src/app/dashboard/nurse/patients/[id]/page.tsx`)
currently shows `patient.gestationalAgeWeeks` (the static field). It changes
to: if an active pregnancy exists, show `gestationalAgeWeeks(pregnancy.lmpDate)`
(computed, live); otherwise fall back to the legacy static
`patient.gestationalAgeWeeks`. This requires no changes to seed data — existing
seeded patients have no `Pregnancy` record, so they keep showing their static
value until/unless a pregnancy is created for them.

## UI

### "Pregnancy" tab (new, on patient detail page)

**No active pregnancy:** empty state with a short explanation + "New
Pregnancy" button.

**Active pregnancy exists:** summary card (Gravidity, Parity, Previous CS
count, Previous PPH/Eclampsia/Stillbirth as badges if true, LMP date, EDD,
live gestational age) + "Add ANC Visit" button + the timeline below it.

### `NewPregnancyModal` (new component)

Fields: Gravidity, Parity, Previous CS (number), Previous PPH (checkbox),
Previous Eclampsia (checkbox), Previous Stillbirth (checkbox), LMP date.
EDD and current gestational age are computed and shown read-only as soon as
LMP is entered. Submit calls `createPregnancy`.

### `AddAncVisitModal` (new component)

Fields: Visit date, ANC number (number input, suggested default =
existing-visit-count + 1), Attending provider (text), Notes (textarea).
Submit calls `recordAncVisit`.

### Timeline

Merges four item kinds, sorted newest-first by date:

1. **ANC visits** — from `AncVisit` records for the active pregnancy.
2. **Assessments** — from the patient's existing `Visit` records (clinical,
   risk-classified), each showing its `RiskBadge`.
3. **Referrals** — from the patient's existing `Referral` records.
4. **Milestones** — derived (not stored): for each of the 4 scheduled visits
   not yet logged (`AncVisit` count < schedule index), show a "Visit N due
   by week W" entry; mark it overdue (visually, e.g. amber) if current
   gestational age has already passed week W.

Clicking any timeline item expands its detail inline (no navigation).

## Out of scope

- Closing/ending a pregnancy, delivery outcomes, multiple/past pregnancies UI.
- Linking existing `Visit`/`Referral` records to a specific pregnancy via a
  `pregnancyId` (deferred — see "Scope decisions" above for why it's safe to
  omit given the active-only constraint).
- Editing/deleting a `Pregnancy` or `AncVisit` once created.
