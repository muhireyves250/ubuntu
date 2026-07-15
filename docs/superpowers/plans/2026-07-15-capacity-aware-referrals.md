# Capacity-Aware Referral Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give capacity-tracked facilities (currently just Bugesera District Hospital) a max-active-red-cases limit, derive Available/Nearly Full/Full status from live accepted-referral counts, hide broadcast cases from Full facilities, guard `acceptEmergencyReferral` against accepting past capacity, and replace the fake "68%" readiness placeholder with the real number.

**Architecture:** One new hardcoded config map (`FACILITY_CAPACITY`) next to the existing `REFERRAL_ROUTING` pattern. One new derived hook (`useFacilityCapacity`), built on the already-global `useReferrals()`. No new storage, no new role — pure derivation + two behavior guards + one UI replacement + one new UI pill.

**Tech Stack:** Next.js App Router, React 19, TypeScript strict, Tailwind v4, pnpm. No test runner — verify with `pnpm exec tsc --noEmit`, `pnpm exec eslint .`, `pnpm build`, plus manual walkthrough.

## Global Constraints

- Never use `git add -A`/`git add .` — stage explicit paths only.
- Do not commit unless the user explicitly asks.
- Single-number capacity only (`maxActiveRedCases`) — no ICU/HDU/theatre/blood-bank/NICU fields this slice.
- `getOrCreateEmergencyReferral`'s self-accept path (a facility flagging its own walk-in emergency) is explicitly **not** capacity-gated in this slice — a facility can't turn away a patient already physically present. Only the broadcast/accept-a-referral-from-elsewhere path is capacity-gated. Do not add a capacity check to `getOrCreateEmergencyReferral`.
- Verify with `pnpm exec tsc --noEmit` (ignore stale `.next/types/*`) and `pnpm exec eslint <changed files>` after every task; `pnpm build` at the end.

---

### Task 1: Capacity types and derivation hook

**Files:**
- Modify: `src/lib/patients/types.ts`
- Modify: `src/lib/patients/use-patients.ts`

**Interfaces:**
- Produces: `FacilityCapacityStatus = "available" | "nearly_full" | "full"`, `FacilityCapacity { max, active, remaining, status }`, `useFacilityCapacity(facility: string): FacilityCapacity`, `FACILITY_CAPACITY`, `DEFAULT_CAPACITY`.

- [ ] **Step 1: Add the capacity types**

In `src/lib/patients/types.ts`, add near the other `Referral`-adjacent types (after `ReferralOutcome`/before `Referral`, or anywhere alongside them — exact position doesn't matter, just keep it near the referral types since it's derived from them):
```ts
export type FacilityCapacityStatus = "available" | "nearly_full" | "full";

export interface FacilityCapacity {
  max: number;
  active: number;
  remaining: number;
  status: FacilityCapacityStatus;
}
```

- [ ] **Step 2: Add the capacity config and hook**

In `src/lib/patients/use-patients.ts`, find the existing block:
```ts
const REFERRAL_ROUTING: Record<string, string> = {
  "Nyamata Health Center": "Bugesera District Hospital",
};
const DEFAULT_RECEIVING_FACILITY = "Bugesera District Hospital";
```
Add directly after it:
```ts
// Maximum active (accepted, unclosed) Red emergency cases a facility can
// safely manage at once. Facilities not listed here (including every
// external hospital in RECEIVING_FACILITIES, which have no real accounts)
// default to DEFAULT_CAPACITY — effectively unlimited, since capacity can't
// be tracked for a facility nobody can log into.
export const FACILITY_CAPACITY: Record<string, number> = {
  "Bugesera District Hospital": 3,
};
export const DEFAULT_CAPACITY = 999;

export function useFacilityCapacity(facility: string): FacilityCapacity {
  const referrals = useReferrals();
  return useMemo(() => {
    const max = FACILITY_CAPACITY[facility] ?? DEFAULT_CAPACITY;
    const active = referrals.filter(
      (r) => r.status === "accepted" && r.acceptedByFacility === facility && r.urgency === "emergency",
    ).length;
    const remaining = max - active;
    const status: FacilityCapacityStatus =
      remaining <= 0 ? "full" : remaining <= 2 ? "nearly_full" : "available";
    return { max, active, remaining, status };
  }, [referrals, facility]);
}
```
Add `FacilityCapacity`, `FacilityCapacityStatus` to the existing `import type { ... } from "./types";` block at the top of the file.

- [ ] **Step 3: Verify**

Run: `pnpm exec tsc --noEmit 2>&1 | grep -v ".next/types"`
Run: `pnpm exec eslint src/lib/patients/types.ts src/lib/patients/use-patients.ts`

---

### Task 2: Guard `acceptEmergencyReferral` on capacity

**Files:**
- Modify: `src/lib/patients/use-patients.ts`

**Interfaces:**
- Consumes: `useFacilityCapacity`'s underlying logic (inlined as a plain function call here, not the hook, since this is a non-component mutator — see below).

- [ ] **Step 1: Extract a non-hook capacity getter for use inside mutators**

`useFacilityCapacity` is a hook (calls `useReferrals()`/`useMemo`) and can't be called from `acceptEmergencyReferral`, which is a plain function. Add a small non-hook helper right above `acceptEmergencyReferral`:
```ts
function getFacilityCapacitySnapshot(facility: string): FacilityCapacity {
  const max = FACILITY_CAPACITY[facility] ?? DEFAULT_CAPACITY;
  const active = getReferralsSnapshot().filter(
    (r) => r.status === "accepted" && r.acceptedByFacility === facility && r.urgency === "emergency",
  ).length;
  const remaining = max - active;
  const status: FacilityCapacityStatus =
    remaining <= 0 ? "full" : remaining <= 2 ? "nearly_full" : "available";
  return { max, active, remaining, status };
}
```
(This duplicates the derivation from Task 1's hook rather than sharing code, because the hook depends on `useReferrals()` — a hook — while this needs the raw snapshot. Keep both; do not try to unify them into one function that's sometimes called as a hook and sometimes not.)

- [ ] **Step 2: Guard the accept**

Find:
```ts
export function acceptEmergencyReferral(referralId: string): Referral {
  const referral = getReferralsSnapshot().find((r) => r.id === referralId);
  if (!referral || referral.status !== "pending") {
    throw new Error("Referral is not pending");
  }
  const { name, facility } = getCurrentUserSnapshot();
  storageUpdateReferral(referralId, {
```
Change to:
```ts
export function acceptEmergencyReferral(referralId: string): Referral {
  const referral = getReferralsSnapshot().find((r) => r.id === referralId);
  if (!referral || referral.status !== "pending") {
    throw new Error("Referral is not pending");
  }
  const { name, facility } = getCurrentUserSnapshot();
  if (referral.urgency === "emergency" && getFacilityCapacitySnapshot(facility).status === "full") {
    throw new Error("This facility has reached its emergency capacity. Choose another facility.");
  }
  storageUpdateReferral(referralId, {
```

- [ ] **Step 3: Verify**

Run: `pnpm exec tsc --noEmit 2>&1 | grep -v ".next/types"`
Run: `pnpm exec eslint src/lib/patients/use-patients.ts`

---

### Task 3: Hide broadcast cases from Full facilities, surface accept errors

**Files:**
- Modify: `src/components/dashboard/red-case-alert.tsx`

**Interfaces:**
- Consumes: `useFacilityCapacity` (Task 1), `acceptEmergencyReferral` (Task 2, now throwing).

- [ ] **Step 1: Import and call the capacity hook**

Add `useFacilityCapacity` to the existing import from `@/lib/patients/use-patients`. Inside `RedCaseAlertPanel`, after the existing hook calls (`usePatients()`, `useVisits()`, etc.), add:
```ts
const capacity = useFacilityCapacity(user?.facility ?? "");
```

- [ ] **Step 2: Exclude Full facilities from the broadcast filter**

Find the `for (const referral of referrals)` loop's exclusion condition:
```ts
      if (
        referral.status !== "pending" ||
        referral.urgency !== "emergency" ||
        user.facilityLevel === "hc" ||
        referral.referredByFacility === user.facility
      ) {
        continue;
      }
```
Change to:
```ts
      if (
        referral.status !== "pending" ||
        referral.urgency !== "emergency" ||
        user.facilityLevel === "hc" ||
        referral.referredByFacility === user.facility ||
        capacity.status === "full"
      ) {
        continue;
      }
```
(`capacity` is computed once per render for the current user's own facility, so this correctly hides every pending case, not just some — a full facility sees zero pending cases.)

- [ ] **Step 3: Add accept-error state and surface it**

Add a new state hook alongside the existing ones:
```ts
const [acceptError, setAcceptError] = useState<string | null>(null);
```
Change the `ConfirmModal`'s `onConfirm` handler from:
```tsx
          onConfirm={() => {
            acceptEmergencyReferral(pendingAccept.referral.id);
            router.push(`/dashboard/nurse/patients/${pendingAccept.patient.id}`);
          }}
```
to:
```tsx
          onConfirm={() => {
            try {
              acceptEmergencyReferral(pendingAccept.referral.id);
              setPendingAcceptId(null);
              router.push(`/dashboard/nurse/patients/${pendingAccept.patient.id}`);
            } catch (err) {
              setPendingAcceptId(null);
              setAcceptError(err instanceof Error ? err.message : "Could not accept this referral.");
            }
          }}
```

- [ ] **Step 4: Render the error banner**

Add, right after the opening `<div className="mt-2 text-sm ...">These emergency cases need a facility equipped...</div>` paragraph (i.e. as the next sibling), a dismissible banner:
```tsx
      {acceptError && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-red-300 bg-red-100 px-3 py-2 text-xs font-medium text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300">
          <span>{acceptError}</span>
          <button type="button" onClick={() => setAcceptError(null)} className="shrink-0 font-bold">
            ×
          </button>
        </div>
      )}
```

- [ ] **Step 5: Verify**

Run: `pnpm exec tsc --noEmit 2>&1 | grep -v ".next/types"`
Run: `pnpm exec eslint src/components/dashboard/red-case-alert.tsx`

---

### Task 4: Replace the fake readiness estimate with real capacity

**Files:**
- Modify: `src/components/dashboard/patient-emergency-info-modal.tsx`

**Interfaces:**
- Consumes: `useFacilityCapacity` (Task 1), `useAuth()` (existing, from `@/lib/auth/auth-context`).

- [ ] **Step 1: Add the imports and compute real capacity for the viewer's own facility**

Add to the top of the file:
```ts
import { useAuth } from "@/lib/auth/auth-context";
import { useFacilityCapacity } from "@/lib/patients/use-patients";
```
Inside `PatientEmergencyInfoModal`, replace:
```ts
  // A capability estimate for the demo — not a real clinical score. Weighted
  // toward facilities already staffed for emergencies (district hospital and
  // above); a health center trying to accept would show much lower.
  const readinessPct = 68;
```
with:
```ts
  const { user } = useAuth();
  const capacity = useFacilityCapacity(user?.facility ?? "");
  const readinessPct = Math.max(0, Math.min(100, Math.round((capacity.remaining / capacity.max) * 100)));
  const STATUS_LABEL: Record<typeof capacity.status, string> = {
    available: "Available",
    nearly_full: "Nearly full",
    full: "Full",
  };
```

- [ ] **Step 2: Update the readiness card to show real numbers**

Find:
```tsx
          <div className="rounded-xl border border-red-300 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/30">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-400">
                Facility readiness (demo estimate)
              </p>
              <span className="text-sm font-bold text-red-700 dark:text-red-400">{readinessPct}%</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-red-200 dark:bg-red-900/60">
              <div className="h-full rounded-full bg-red-600" style={{ width: `${readinessPct}%` }} />
            </div>
            <p className="mt-2 flex items-start gap-1.5 text-xs text-red-700/80 dark:text-red-400/80">
              <IconClock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Estimated capacity to manage this emergency at {facility}.
            </p>
          </div>
```
Replace with:
```tsx
          <div className="rounded-xl border border-red-300 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/30">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-400">
                Your Facility Capacity — {STATUS_LABEL[capacity.status]}
              </p>
              <span className="text-sm font-bold text-red-700 dark:text-red-400">
                {capacity.active}/{capacity.max} active
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-red-200 dark:bg-red-900/60">
              <div className="h-full rounded-full bg-red-600" style={{ width: `${readinessPct}%` }} />
            </div>
            <p className="mt-2 flex items-start gap-1.5 text-xs text-red-700/80 dark:text-red-400/80">
              <IconClock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {capacity.status === "full"
                ? `${user?.facility ?? "Your facility"} is at capacity — accepting is blocked until a case closes.`
                : `Estimated remaining emergency capacity at ${user?.facility ?? "your facility"}.`}
            </p>
          </div>
```
Note: this card now describes the *viewer's own* facility's capacity to accept, not the *referring* facility named by `facility` (which remains used elsewhere in this file for the "Facility"/"Receiving facility" info fields — leave those untouched).

- [ ] **Step 3: Verify**

Run: `pnpm exec tsc --noEmit 2>&1 | grep -v ".next/types"`
Run: `pnpm exec eslint src/components/dashboard/patient-emergency-info-modal.tsx`

---

### Task 5: Capacity pill on the dashboard

**Files:**
- Modify: `src/components/dashboard/overview.tsx`

**Interfaces:**
- Consumes: `useFacilityCapacity` (Task 1), `FACILITY_CAPACITY` (Task 1, to decide whether to render at all).

- [ ] **Step 1: Add the pill**

Add to the imports:
```ts
import { useRiskSummary, useFacilityCapacity, FACILITY_CAPACITY } from "@/lib/patients/use-patients";
```
Inside `DashboardOverview`, after `const summary = useRiskSummary(selectedDays);`, add:
```ts
const capacity = useFacilityCapacity(user?.facility ?? "");
const hasCapacityConfig = !!user && user.facility in FACILITY_CAPACITY;
```
In the JSX, right after the `<h1>Overview</h1>` / range-select header row (i.e. as a new block between that header `<div>` and the `<div className="flex flex-col gap-6 lg:flex-row">` that follows), add:
```tsx
      {hasCapacityConfig && (
        <div
          className={`flex items-center gap-2.5 rounded-xl border px-4 py-2.5 text-sm font-medium ${
            capacity.status === "full"
              ? "border-red-300 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
              : capacity.status === "nearly_full"
                ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300"
                : "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
          }`}
        >
          <span>
            {user?.facility}: {capacity.active}/{capacity.max} active emergency cases
          </span>
          <span className="rounded-full bg-white/60 px-2 py-0.5 text-xs font-bold uppercase tracking-wide dark:bg-black/20">
            {capacity.status === "full" ? "Full" : capacity.status === "nearly_full" ? "Nearly Full" : "Available"}
          </span>
        </div>
      )}
```

- [ ] **Step 2: Verify**

Run: `pnpm exec tsc --noEmit 2>&1 | grep -v ".next/types"`
Run: `pnpm exec eslint src/components/dashboard/overview.tsx`

---

### Task 6: Full verification and manual walkthrough

**Files:** none (verification only)

- [ ] **Step 1: Full typecheck, lint, build**

Run: `pnpm exec tsc --noEmit 2>&1 | grep -v ".next/types"` — expect no output.
Run: `pnpm exec eslint .` — expect no errors.
Run: `pnpm build` — expect success.

- [ ] **Step 2: Manual walkthrough**

Against the running dev server, logged in at Bugesera District Hospital (Nurse Kagame or Dr. Mutesi):
1. Confirm the dashboard capacity pill shows `0/3 active — Available`.
2. Trigger and accept 3 separate emergency referrals from Nyamata (or self-flag 3 emergencies directly at Bugesera). With `max = 3`, the remaining-count math means Bugesera moves straight to Nearly Full after just the 1st acceptance (1 active → 2 remaining, which is within the 1–2 "nearly full" band) and stays Nearly Full through the 2nd, then Full after the 3rd (3 active → 0 remaining). Confirm the pill matches this at each step.
3. With Bugesera Full, log in as Nyamata and flag a new emergency — confirm the referral is created but does not appear as an actionable "Accept" case for Bugesera (since Bugesera can't be shown as broadcast target while full) — confirm via Bugesera's own dashboard that no new pending card appears for it.
4. Open the emergency info modal for a pending case while at a Full facility (if reachable via direct patient URL) — confirm it shows "at capacity — accepting is blocked."
5. Close one of Bugesera's 3 accepted cases via `CloseReferralModal` — confirm the pill drops back to `2/3 — Nearly Full` and the facility becomes visible again for new broadcast cases.

- [ ] **Step 3: Report results**

Summarize pass/fail for each walkthrough step, including the actual Nearly-Full threshold behavior observed (since with `max=3`, remaining goes 3→2→1→0, meaning the facility is "Nearly Full" starting from the very first accepted case, never spending time in "Available" beyond zero active cases — flag this to the user as a consequence of choosing `max=3`; a larger number like 5 would give more headroom in "Available" if that's preferred). Do not commit unless explicitly asked.
