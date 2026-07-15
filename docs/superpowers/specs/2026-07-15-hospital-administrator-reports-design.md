# Hospital Administrator — Reports Slice Design

## Goal

Add the four report categories from spec section 2 (Maternal Care, Referral, Laboratory, Staff Performance) as a new tabbed Reports page under the Hospital Administrator role. All four are pure derivations over data that already exists — no new storage.

## Out of scope

- User Management — still deferred, separate design conversation needed.
- "Rejected referrals" — no such status exists in this app's `ReferralStatus` (`pending | accepted | closed`); dropped rather than fabricated.
- True laboratory "turnaround time" (request → result completion) — no completion timestamp exists on `LabRequest`, only `requestDate` and `acceptedAt`. Substituted with request-to-**acceptance** latency, labeled honestly.
- Charts/graphs — stat tiles and simple tables only, consistent with the rest of the app's dashboard style (no charting library in this project beyond the existing hand-built `RiskDistribution` conic-gradient donut).

## Route & access

- `src/app/dashboard/hospital-admin/reports/page.tsx`, `RoleGuard roles={["hospital_admin"]}`.
- Sidebar: new "Reports" nav item, `enabledRoles: ["hospital_admin"]` only.

## Layout

Tab switcher (same visual pattern as `ARCHIVE_TABS` in `pregnancy-tab.tsx`): **Maternal Care | Referral | Laboratory | Staff Performance**. A shared `RANGE_OPTIONS` day-window picker (7/30/90/all, same as `DashboardOverview`) scopes all four sections by date where a date field exists to filter on.

## Section 1: Maternal Care

Scoped to patients whose latest visit's `hospital === user.facility` (matching how `latestVisitFor` already determines "whose patient this effectively is" elsewhere in the app) and pregnancies at that facility.

- Total ANC visits (type `scheduled`/`unscheduled`) in window.
- Current high-risk count: patients with latest `riskLevel` orange or red (reuses `useRiskSummary`-style logic, facility-filtered).
- Emergency pregnancies: distinct patients with an emergency-type visit in window.
- Delivery outcomes: for closed pregnancies with `pregnancy.delivery` set, tally `outcome` (live-birth/stillbirth/maternal-death), `method` (vaginal/cesarean/assisted), `babyStatus` (alive/deceased).
- Maternal mortality: count of `delivery.outcome === "maternal-death"`.

## Section 2: Referral

Scoped via the now-global `useReferrals()`, filtered per-metric:

- Incoming: `receivingFacility === facility || acceptedByFacility === facility`.
- Outgoing: `referredByFacility === facility`.
- Accepted: `status === "accepted" && acceptedByFacility === facility`.
- Average time-to-accept: mean of `acceptedAt - createdAt` (ms → hours) over referrals with both timestamps, accepted by this facility.
- Emergency referral count in window (by `createdAt`).

## Section 3: Laboratory

Reuses `getLabRequests(user.facility)` + `subscribeToLabRequests` from `lib/patients/lab-requests.ts` (already reactive, already used by the lab nurse dashboard — same `useState(() => ...)` + `useEffect` subscription pattern, not a new hook).

- Total requests, Completed count, Pending/In-Progress count.
- Critical results: requests where any `results[].interpretation === "Critical"`.
- Average request-to-acceptance latency: mean of `acceptedAt - requestDate` over requests with `acceptedAt` set.

## Section 4: Staff Performance

Name-keyed tallies (no new per-staff tracking — these names already exist on each record):

- ANC visits per `attendingNurse`, facility-scoped, in window.
- Lab requests per `acceptedBy`, facility-scoped.
- Emergency referrals accepted per `acceptedByNurse`, facility-scoped.
- Recommendations authored per `createdByGynecologist`, facility-scoped.

## File-level summary

- `src/app/dashboard/hospital-admin/reports/page.tsx` (new) — route + `RoleGuard`.
- `src/components/dashboard/reports/reports-content.tsx` (new) — tab switcher + range picker, delegates to 4 section components.
- `src/components/dashboard/reports/maternal-care-report.tsx` (new).
- `src/components/dashboard/reports/referral-report.tsx` (new).
- `src/components/dashboard/reports/laboratory-report.tsx` (new).
- `src/components/dashboard/reports/staff-performance-report.tsx` (new).
- `src/components/dashboard/sidebar.tsx` — add "Reports" nav item.

## Testing

`pnpm exec tsc --noEmit`, `pnpm exec eslint .`, `pnpm build`, plus manual walkthrough: log in as Dr. Niyibizi → open Reports → click through all 4 tabs → confirm numbers are non-garbage and change when the date-range picker changes → confirm Laboratory tab numbers match what's shown on `/dashboard/lab` for the same facility.
