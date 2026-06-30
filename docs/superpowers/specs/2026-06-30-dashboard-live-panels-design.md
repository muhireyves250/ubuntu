# Dashboard Live Panels — Design

## Context

Follows [2026-06-28-nurse-patient-records-design.md](2026-06-28-nurse-patient-records-design.md),
which built the patient list, patient detail tabs, visit recording, and risk
classification. That slice left four dashboard side-panel sections as
hardcoded placeholders:

- **Accept button** on the Emergency Referrals panel → `alert()` only
- **Following Module** → always "No active follow-ups."
- **Active Referrals** → always "No active referrals."
- **Today's ANC Visits** → always "No visits scheduled for today."

This slice wires all four to real localStorage-backed data using the same
patterns already established.

## Goals

- Accept button creates a persisted referral and navigates to the patient record.
- Active Referrals panel lists real accepted referrals from localStorage.
- Following Module lists patients who are yellow/orange risk or overdue for a visit (no visit in 14+ days).
- Today's ANC Visits lists visits recorded for today's date.

## Non-goals

- No backend, API, or real database.
- No editing or cancelling referrals.
- No "View Weekly" calendar view — the button links to the patient list page.
- No push notifications or SMS on referral acceptance.

## Data model addition

Add `Referral` to `src/lib/patients/types.ts`:

```ts
interface Referral {
  id: string;
  patientId: string;
  acceptedAt: string; // ISO datetime string
  status: "active";   // extensible later
}
```

## Storage (`src/lib/patients/storage.ts`)

Add a third localStorage key `ubuntumed.referrals` following the identical
cache + listener pattern used for patients and visits:

- `addReferral(referral: Referral)` — append + notify listeners
- `getReferralsSnapshot(): Referral[]`
- `getServerReferralsSnapshot(): Referral[]` — returns `[]`
- `subscribeToReferrals(onChange: () => void): () => void`

## Hooks & actions (`src/lib/patients/use-patients.ts`)

**`useReferrals(): Referral[]`** — `useSyncExternalStore` over the referral store.

**`useActiveReferrals(): Referral[]`** — filters `useReferrals()` to `status === "active"`.

**`acceptReferral(patientId: string): Referral`** — creates and persists a new
`Referral` with `status: "active"` and `acceptedAt: new Date().toISOString()`.

**`useFollowUpPatients()`** — computed from `usePatients()` + `useVisits()`.
Returns patients matching either condition:
1. Their latest visit's `riskLevel` is `"yellow"` or `"orange"`.
2. They have at least one visit, but the most recent visit date is more than
   14 days before today.

Each entry carries: `patient`, `latestRiskLevel`, `reason` (`"high-risk"` |
`"overdue"`).

**`useTodaysVisits()`** — filters `useVisits()` to entries where
`visit.date === new Date().toISOString().slice(0, 10)`. Returns visits
enriched with the associated patient (looked up from `usePatients()`).

## Accept button flow (`src/components/dashboard/red-case-alert.tsx`)

Replace the `alert()` handler with:

1. Call `acceptReferral(patientId)` — writes to localStorage.
2. Call `router.push(`/dashboard/nurse/patients/${patientId}`)` via
   `useRouter()` from `next/navigation`.

A patient with an active referral is filtered out of the emergency panel.
The filter: exclude any patient whose `id` appears in `useActiveReferrals()`.
This means accepting a referral removes the card immediately on the next
render and the card does not re-appear on refresh.

No confirmation dialog — accept is intentionally immediate in an emergency
context.

`RedCaseAlertPanel` also calls `useActiveReferrals()` to exclude already-accepted
patients from the red-case list. A patient whose id is in active referrals is
not shown even if their latest visit is still red.

## Side panel (`src/components/dashboard/side-panel.tsx`)

`SidePanel` becomes a `"use client"` component and calls hooks directly
(like `RedCaseAlertPanel` already does), dropping the `user`/`copy` prop
dependency for the three data-driven cards. The greeting card at the top
still receives `user` and `copy` as props.

### Active Referrals card

- Calls `useActiveReferrals()` + `usePatients()`.
- Each referral row: patient name (links to `/dashboard/nurse/patients/[id]`),
  gestational age, relative time since `acceptedAt` (e.g. "Accepted 3 hours ago").
  Relative time is computed with a small inline helper (no external library):
  < 60 min → "X minutes ago", < 24 h → "X hours ago", else → "X days ago".
- "View all" button navigates to `/dashboard/nurse/patients`.
- Empty state: "No active referrals." (unchanged text).

### Following Module card

- Calls `useFollowUpPatients()`.
- Each row: patient name (links to detail page), risk badge, reason line
  ("High risk — close follow-up" or "No visit in 14 days").
- Empty state: "No active follow-ups." (unchanged text).

### Today's ANC Visits card

- Calls `useTodaysVisits()`.
- Each row: patient name (links to detail page), risk badge.
- "View Weekly" button navigates to `/dashboard/nurse/patients`.
- Empty state: "No visits recorded today." (replaces "No visits scheduled for today.").

## Files changed

| File | Change |
|---|---|
| `src/lib/patients/types.ts` | Add `Referral` type |
| `src/lib/patients/storage.ts` | Add referral store (key, cache, listeners, CRUD) |
| `src/lib/patients/use-patients.ts` | Add `useReferrals`, `useActiveReferrals`, `acceptReferral`, `useFollowUpPatients`, `useTodaysVisits` |
| `src/components/dashboard/red-case-alert.tsx` | Wire Accept button; filter out accepted patients |
| `src/components/dashboard/side-panel.tsx` | Make client component; wire all three cards to live hooks |
