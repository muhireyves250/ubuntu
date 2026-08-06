# Notification Role Coverage Gap Closure — Design

## Context

`useNotificationAlerts(role)` (`src/lib/patients/use-patients.ts:908-1470`) computes
in-app notifications client-side by cross-referencing already-fetched,
role/facility-scoped React Query data — no backend notification/event
infrastructure, per the established pattern from Slice K
(`docs/superpowers/specs/2026-07-28-notification-expansion-and-chw-home-visits-design.md`
in the Antenatal-api repo). That slice already gave every role a branch:
`nurse`, `gynecologist`, `lab_nurse`, `chw`, `hospital_admin`.

Two roles are left thin:

- **`lab_nurse`** (backend `LAB_TECHNICIAN`) has only 2 notification types:
  `lab_request` and `lab_result_comment`. They get no feedback once a
  critical result they submitted is acted on, and no visibility into
  requests that are stuck unprocessed.
- **`hospital_admin`** (backend `HOSPITAL_DIRECTOR`) has only 1 notification
  type: `facility_full`. They have zero visibility into the severity of
  cases, referral flow, or emergency reports at their own facility.

This closes both gaps, matching the existing computed/client-side pattern
exactly — no schema change, no backend endpoint change, no change to any
existing notification type or trigger.

## Goals

- `lab_nurse` gets closed-loop feedback on critical results they submitted,
  and visibility into requests stuck past a reasonable turnaround window.
- `hospital_admin` gets facility-level visibility into RED-risk cases,
  referral activity, and CHW-flagged emergencies — the same underlying
  events other roles already see, just aggregated at the facility level.
- Every existing notification type, condition, and role branch is
  untouched. This is purely additive.

## Non-Goals

- No backend changes (no new tables, no new endpoints, no `Notification`
  schema change). All new conditions read from React Query data already
  fetched elsewhere in the app for these roles' existing dashboards.
- No change to `NotificationPanel`, `Topbar`, or how the hook is called —
  new conditions slot into the existing `lab_nurse`/`hospital_admin`
  branches of `useNotificationAlerts`.
- No SMS/email/push — in-app only, consistent with the rest of the system.
- No new role-based dashboard surfaces — `hospital_admin` already has a
  dashboard (`src/app/dashboard/hospital-admin`); nothing new is added there
  beyond what these notifications link to.

## New Notification Types

### `lab_nurse` branch

1. **`lab_result_escalated`** — a critical result they submitted
   (`labResult.submittedById === currentUser.id`) has been acknowledged or
   acted on by a nurse/gynecologist. Sourced from the same lab-results query
   already used for `lab_request`/`lab_result_comment`, filtered on
   `status === "acknowledged"` (or equivalent field — confirmed against
   actual `LabResult` shape during implementation) and `submittedById` match.
2. **`lab_request_overdue`** — a pending `LabRequest` at their facility
   whose `createdAt` is more than 24 hours old and still unprocessed.
   24h is a proposed threshold, not a backend-enforced SLA — flag during
   implementation if a different number is wanted.

### `hospital_admin` branch

1. **`red_risk_escalation`** — any patient at their facility with a RED
   risk classification recorded today. Mirrors the condition already used
   for the gynecologist's `risk_pregnancy` alert, but facility-wide rather
   than gated on "no recommendation yet."
2. **`referral_activity`** — any referral sent from or received by their
   facility today (uses the same referrals query already powering the
   nurse's `referral_accepted`/`referral_closed` conditions).
3. **`community_visit_emergency`** — a CHW report flagged as emergency
   (`nurseFlaggedEmergency === true`) for a patient at their facility.
   Mirrors the gynecologist's existing `community_visit_flagged` condition.

## Data Sources

All four new conditions reuse React Query hooks already called elsewhere
in the app for these roles' dashboards (risk assessments/visits, referrals,
lab requests, community visits) — no new hooks, no new fetches beyond what
`useNotificationAlerts` needs to additionally read from data already in the
query cache for that role's session.

## Testing

- `tsc --noEmit` + `pnpm build` + lint (matches the project's existing
  frontend testing discipline — no test suite exists for this hook today).
- Manual verification per new condition: trigger the underlying event
  (submit a critical lab result and acknowledge it; create a RED-risk
  patient at a facility; send a referral; flag a CHW report as emergency)
  and confirm the correct role sees the new notification in the panel,
  and that no existing notification type changes behavior.

## Out of Scope / Explicit Deferrals

- Backend-persisted notifications (rejected in favor of matching the
  established client-side pattern; see conversation history for the
  tradeoff discussion).
- Aggregate/summary notifications for `hospital_admin` beyond the three
  listed (e.g. daily digest, missed-visit counts) — can be a follow-up
  slice if wanted.
- Configurable overdue threshold for `lab_request_overdue` (hardcoded 24h
  for this slice).
