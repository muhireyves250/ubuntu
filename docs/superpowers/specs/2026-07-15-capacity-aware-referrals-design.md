# Capacity-Aware Referral Management — Design

## Goal

Prevent an accepting facility from being sent (or accepting) more active Red emergency cases than it can safely manage, by giving each capable facility a configured maximum and deriving live Available / Nearly Full / Full status from it. This is the first of two independent slices from the pasted spec — the Hospital Administrator role (reports, user management, capacity *configuration* UI) is a separate, later slice.

## Out of scope for this slice

- Multi-factor capacity (ICU/HDU beds, emergency theatre, blood bank, NICU, gynecologist-on-duty) — single number only (`maxActiveRedCases`), per the spec's own "start simple, expand later without changing the workflow" note.
- Distance / travel-time referral selection criteria — no geo data exists in this app.
- Hospital Administrator role, capacity configuration UI, reports, user management — none of this exists yet; capacity is a hardcoded config for this slice.
- True cross-session race-condition demoing — this is client-side localStorage, one browser tab is one session. The check-then-reserve *logic* is still implemented correctly.

## Data

```ts
// added directly in src/lib/patients/use-patients.ts, next to the existing
// REFERRAL_ROUTING / DEFAULT_RECEIVING_FACILITY constants — same pattern,
// same file, no new module needed for two constants.
export const FACILITY_CAPACITY: Record<string, number> = {
  "Bugesera District Hospital": 3,
};
export const DEFAULT_CAPACITY = 999; // effectively unlimited for unconfigured facilities
```

## Derivation

```ts
export type FacilityCapacityStatus = "available" | "nearly_full" | "full";

export interface FacilityCapacity {
  max: number;
  active: number;
  remaining: number;
  status: FacilityCapacityStatus;
}
```

`active` = count of `Referral`s where `status === "accepted" && acceptedByFacility === facility && urgency === "emergency"`. `remaining = max - active`. `status`: `remaining > 2` → `"available"`; `remaining` 1–2 → `"nearly_full"`; `remaining <= 0` → `"full"`.

New hook `useFacilityCapacity(facility: string): FacilityCapacity` in `use-patients.ts`, built on the existing `useReferrals()` (already global per this session's earlier fix, so it correctly counts every accepted case regardless of who's viewing).

## Behavior changes

1. **`RedCaseAlertPanel` broadcast filter** — add a capacity check: a pending case is hidden from a facility whose `useFacilityCapacity(user.facility).status === "full"`. Nearly-full facilities still see it (matches spec: "can still receive referrals, but staff are warned").
2. **`acceptEmergencyReferral`** — before writing the accept, re-fetch capacity for the accepting facility; if `status === "full"`, throw `Error("This facility has reached its emergency capacity.")` instead of mutating. The `ConfirmModal` accept flow in `RedCaseAlertPanel` catches this and shows the message instead of navigating.
3. **`PatientEmergencyInfoModal`** — the existing hardcoded `readinessPct = 68` placeholder is replaced with the real `useFacilityCapacity` result for the facility the referral is nominally routed to (or the viewer's own facility if broadcast) — shows `{active}/{max} active — {status label}` instead of a fake percentage bar. Percentage bar becomes `(remaining / max) * 100` for the visual fill, clamped 0–100.
4. **Dashboard visibility** — add a small capacity pill to `DashboardOverview`, shown only when the current user's own facility has a configured capacity entry (i.e., meaningful data exists) — `{facility}: {active}/{max} — {status}`.

## File-level summary

- `src/lib/patients/use-patients.ts` — add `FACILITY_CAPACITY`/`DEFAULT_CAPACITY` constants next to `REFERRAL_ROUTING`; add `FacilityCapacityStatus`/`FacilityCapacity` types (in `types.ts` alongside other exported types, imported here); add `useFacilityCapacity(facility)`; modify `acceptEmergencyReferral` to guard on capacity.
- `src/lib/patients/types.ts` — add `FacilityCapacityStatus`, `FacilityCapacity` types.
- `src/components/dashboard/red-case-alert.tsx` — add the full-facility exclusion to `pendingCases`; catch the capacity error from `acceptEmergencyReferral` in the confirm handler and surface it (reuse the existing `error`-display pattern already used elsewhere, or a simple inline message since this component doesn't currently have error state — add one).
- `src/components/dashboard/patient-emergency-info-modal.tsx` — replace the hardcoded `readinessPct` with `useFacilityCapacity`.
- `src/components/dashboard/overview.tsx` — add the capacity pill.

## Testing

`pnpm exec tsc --noEmit`, `pnpm exec eslint .`, `pnpm build`, plus manual walkthrough: as Dr. Mutesi or Nurse Kagame at Bugesera, accept emergency cases one at a time from different test patients and confirm the capacity pill moves Available → Nearly Full → Full, confirm the broadcast panel stops showing new pending cases to Bugesera once full, and confirm attempting to accept a 4th case (if somehow triggered) is blocked with a clear message.
