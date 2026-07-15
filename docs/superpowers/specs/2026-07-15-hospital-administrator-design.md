# Hospital Administrator — Slice 1 Design

## Goal

Stand up the Hospital Administrator role with real, immediately useful capability: a read-only oversight dashboard, the ability to configure the emergency capacity limit that was hardcoded in the last slice, and read-only patient record access — without accidentally granting any clinical write actions. This is the first of at least three slices from the full pasted spec (Reports, and User Management, are separate later slices).

## Out of scope for this slice

- Reports (Maternal Care / Referral / Laboratory / Staff Performance report pages) — separate slice.
- User Management (register/approve/suspend accounts) — deferred; needs its own design conversation about account lifecycle in a localStorage-only demo.
- Multi-factor capacity (ICU/HDU beds, theatre, blood bank, NICU) — still the single `maxActiveRedCases` number.
- "Rejected referrals" and "hospital occupancy" — no such concepts exist in this app's data model (referrals are pending/accepted/closed only; there's no bed/occupancy tracking anywhere). Not fabricating new data to match spec wording that doesn't fit the existing model.
- Six of the spec's seven notification types (only "hospital at full capacity" ships this slice — the rest need data/analysis this slice doesn't build: referral volume trends, delayed-case detection, critical-lab-activity summaries, staff registration requests, "returned to available" transition detection).

## Role & access

- `Role` widens to include `"hospital_admin"`.
- New demo user: `hospital-admin-niyibizi`, "Dr. Niyibizi", "Hospital Administrator", Bugesera District Hospital, `facilityLevel: "dh"`.
- `RoleGuard` on Patient Registry, patient detail, Referral Log, Risk Classification widens to include `hospital_admin` (same shared-page pattern as Gynecologist).
- New `/dashboard/hospital-admin` route, reusing `DashboardOverview` (same pattern as nurse/gynecologist), plus the two new sections below.

## Enforcing read-only (the part that needs real care)

RoleGuard alone doesn't make a page read-only — several write actions on the shared patient page are gated by *ownership/facility*, not role, so a Hospital Administrator would otherwise be able to trigger them. Specifically, for `role === "hospital_admin"`:

1. **`nurse/patients/[id]/page.tsx`** — drop `"New Assessment"` from the `TABS` array entirely (it's an inherently write-only tab); hide the header's "Edit patient" / "Create referral" actions menu.
2. **`specialist-notes-tab.tsx`** — the "Add Recommendation" button is already gated to `role === "gynecologist"`; no change needed, but confirm a Hospital Administrator viewing this tab sees no button (already true by construction).
3. **`visit-history-tab.tsx`** callbacks — `onLogScheduledVisit`/`onLogUnscheduledVisit` are passed as `undefined` when `role === "hospital_admin"`, same pattern already used for `activeReferral` gating.
4. **`RedCaseAlertPanel`** — currently renders for *any* logged-in user at a `dh+` facility, with an "Accept" button. Add an explicit exclusion: `if (user.role === "hospital_admin") return null;` at the top of the component. This is the one that actually matters most — without it, a Hospital Administrator could accept emergency referrals, directly violating spec section 9 ("cannot accept emergency referrals").

## Dashboard additions

- Reuses `DashboardOverview` (stat cards, risk distribution, today's visits, side panel) — all already read-only in themselves (links to patient pages, no inline actions).
- New **Referral Activity** card: Pending / Accepted / Closed counts for the admin's own facility, derived from `useReferrals()` (already global) filtered to `referredByFacility/receivingFacility/acceptedByFacility === user.facility`.
- The existing capacity pill (from the capacity slice) gains an inline edit affordance — see below.

## Capacity configuration

New persisted store, same pattern as `Referral`/`Recommendation` in `storage.ts`:

```ts
// storage.ts additions
const CAPACITY_OVERRIDES_KEY = "ubuntumed.capacityOverrides";
// Record<facility, number>, loaded/saved/subscribed exactly like other stores
```

`useFacilityCapacity(facility)` (in `use-patients.ts`) changes its `max` lookup order: **override store → `FACILITY_CAPACITY` hardcoded map → `DEFAULT_CAPACITY`**. `getFacilityCapacitySnapshot` (the non-hook variant used inside `acceptEmergencyReferral`) gets the same lookup order.

New mutator `setFacilityMaxCapacity(facility: string, max: number)`. UI: a small inline form on the admin's dashboard capacity pill — a number input (defaulting to the current effective max) + Save button, editing only `user.facility`.

## Notifications

Extend `useNotificationAlerts` with one new branch: `role === "hospital_admin" && useFacilityCapacity(user.facility).status === "full"` → alert "Hospital at Full Emergency Capacity", same derived (no read/unread) pattern as every other alert — persists for as long as the facility stays full, clears automatically once a case closes and capacity frees up.

## File-level summary

- `src/lib/auth/types.ts` — add `"hospital_admin"` to `Role`.
- `src/lib/auth/demo-users.ts` — add the new demo user + username.
- `src/lib/auth/role-routes.ts` — add dashboard path + label.
- `src/lib/dashboard/role-copy.ts` — add overview copy.
- `src/app/login/page.tsx` — add role tab.
- `src/components/dashboard/profile-panel.tsx` — add to `ROLE_PERMISSIONS`/`FACILITY_LEVEL_LABEL` usage (no change needed to the label map itself, just the new permissions list entry).
- `src/components/role-guard.tsx` — no change (already takes `roles: Role[]`).
- `nurse/patients/page.tsx`, `nurse/patients/[id]/page.tsx`, `nurse/referrals/page.tsx`, `nurse/risk-classification/page.tsx` — widen `RoleGuard roles` to include `"hospital_admin"`.
- `nurse/patients/[id]/page.tsx` — conditional `TABS`, hide edit/referral actions menu, pass `undefined` log-visit callbacks for `hospital_admin`.
- `src/components/dashboard/red-case-alert.tsx` — early-return `null` for `hospital_admin`.
- `src/lib/patients/storage.ts` — capacity overrides persistence.
- `src/lib/patients/use-patients.ts` — `useFacilityCapacity`/`getFacilityCapacitySnapshot` override lookup; new `setFacilityMaxCapacity`; new referral-activity-count derivation (inline in the dashboard component, or a small hook); new notification branch.
- `src/components/dashboard/overview.tsx` — Referral Activity card, capacity pill inline-edit form.
- `src/app/dashboard/hospital-admin/page.tsx` (new) — thin route, mirrors `gynecologist/page.tsx`.

## Testing

`pnpm exec tsc --noEmit`, `pnpm exec eslint .`, `pnpm build`, plus manual walkthrough: log in as Dr. Niyibizi → confirm dashboard loads with referral activity + capacity pill; confirm `RedCaseAlertPanel` never appears even with pending emergencies; open a patient → confirm no "New Assessment" tab, no edit/referral menu, no log-visit buttons; edit the capacity number → confirm it persists and the pill/broadcast-filtering from the previous slice respects the new value; fill capacity to Full → confirm the "Hospital at Full Emergency Capacity" alert appears in the bell.
