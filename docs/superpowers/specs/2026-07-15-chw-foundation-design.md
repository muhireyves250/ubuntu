# Community Health Worker (CHW) — Slice 1: Foundation (Design)

## Goal

Establish the minimum end-to-end loop for the Community Health Worker role: a Nurse or
Gynecologist can hand a patient off for community follow-up, and the CHW can see that
assignment and a restricted view of the patient. Nothing about the visit itself
(conducting it, the digital form, danger signs, AI-style tips) is built yet — those are
later slices. This slice exists so those later slices have something to attach to.

## Spec-vs-reality note

The source spec lists "Health Center Managers" among the roles that can create a
follow-up assignment. No such role exists in this app (`Role` is
`"nurse" | "lab_nurse" | "gynecologist" | "hospital_admin"`, soon `+ "chw"`). Assignments
are created by Nurses and Gynecologists only — both are real roles that already interact
with these patients directly. This mirrors how earlier slices this session dropped
spec items that didn't map onto the app's actual roles/data model (e.g., a fabricated
"rejected referral" status) rather than inventing new concepts to satisfy the wording.

## Data model & storage

New `FollowUpAssignment` entity, persisted the same way as `Referral`/`Recommendation`
(own localStorage list in `storage.ts`, `useSyncExternalStore`-compatible
subscribe/getSnapshot/getServerSnapshot, plus mutators) — not a variant of `Referral`,
since a follow-up assignment has no urgency/acceptance/outcome lifecycle, just
pending → completed.

```ts
export type FollowUpReason =
  | "missed_anc"
  | "high_risk_followup"
  | "medication_adherence"
  | "bp_monitoring"
  | "nutrition_counseling"
  | "post_emergency_followup"
  | "general_monitoring";

export type FollowUpPriority = "routine" | "high";

// "completed" is unreachable in this slice — nothing sets it yet, since the
// visit-completion workflow is Slice 2. It's part of the type now so Slice 2
// doesn't need to touch this file again.
export type FollowUpStatus = "pending" | "completed";

export interface FollowUpAssignment {
  id: string;
  patientId: string;
  createdAt: string; // ISO datetime
  assignedByName: string;
  assignedByRole: "nurse" | "gynecologist";
  facility: string; // the CHW's facility, copied at creation time
  assignedToChwId: string; // DirectoryUser id of the CHW
  reason: FollowUpReason;
  priority: FollowUpPriority;
  dueDate: string; // ISO date "YYYY-MM-DD"
  status: FollowUpStatus;
}
```

`FOLLOW_UP_REASON_LABELS: Record<FollowUpReason, string>` maps each reason to its
display label (e.g. `"missed_anc"` → `"Missed ANC appointment"`), used by both the
creation modal's dropdown and the dashboard/patient-view display.

Storage (`src/lib/patients/storage.ts`, extending the existing file rather than a new
one — this is the same kind of list-store as `Referral`):
- `FOLLOWUP_ASSIGNMENTS_KEY = "ubuntumed.followUpAssignments"`
- `subscribeToFollowUpAssignments`, `getFollowUpAssignmentsSnapshot`,
  `getServerFollowUpAssignmentsSnapshot`, `addFollowUpAssignment`

Hooks/mutators (`src/lib/patients/use-patients.ts`):
- `useFollowUpAssignments(): FollowUpAssignment[]` — all assignments (unscoped read,
  consistent with how `usePatients`/`useReferrals` are globally readable; consumers
  filter down as needed, same convention already established this session).
- `useFollowUpAssignmentsForChw(chwId: string): FollowUpAssignment[]` — filtered +
  memoized, used by the dashboard.
- `useFollowUpAssignmentsForPatient(patientId: string): FollowUpAssignment[]` — used by
  the restricted patient view's follow-up history section.
- `createFollowUpAssignment(data: { patientId, reason, priority, dueDate, assignedToChwId, facility }): FollowUpAssignment`
  — reads `assignedByName`/`assignedByRole` from the current session via
  `getCurrentUserSnapshot`-equivalent (reuses the existing pattern already in this file).

## Role & demo user

- `Role` (`src/lib/auth/types.ts`) → `"nurse" | "lab_nurse" | "gynecologist" | "hospital_admin" | "chw"`.
- `DemoUser`, `ManagedStaffAccount`, `DirectoryUser` all gain an optional
  `village?: string` field — CHWs are the only role scoped to a catchment smaller than
  a full facility, so this stays optional/unused for every other role rather than
  forcing a village onto every account.
- New demo user in `demo-users.ts`: `id: "chw-mukamana"`, `username: "mukamana"`,
  `name: "Mukamana"`, `title: "Community Health Worker"`,
  `facility: "Nyamata Health Center"`, `role: "chw"`, `facilityLevel: "hc"`,
  `village: "Rilima"`, `password: "chw123"`.
- `ROLE_DASHBOARD_PATH.chw = "/dashboard/chw"`, `ROLE_LABEL.chw = "Community Health Worker"`
  (`role-routes.ts`).
- `role-copy.ts` gains a `chw` entry in `ROLE_OVERVIEW_COPY`.
- `login/page.tsx`: `ROLE_TABS` gains `{ role: "chw", label: "Community Health Worker" }`;
  `RoleIcon` gains an explicit `chw` branch (a simple person-with-house/community icon,
  consistent style with the existing role icons — currently anything not explicitly
  branched falls through to the gynecologist icon, so this needs its own case same as
  `hospital_admin` did).

## Assignment creation

New `src/components/patients/assign-chw-modal.tsx` (`AssignChwModal`), modeled directly
on `create-referral-modal.tsx`'s structure (portal, backdrop, `max-w-lg` card, Escape
to close):
- Patient summary row (name + facility, same as `CreateReferralModal`).
- Reason `<select>` populated from `FOLLOW_UP_REASON_LABELS`.
- Priority toggle: Routine / High (two buttons, same active-state pattern as the
  urgency toggle in `CreateReferralModal`).
- Due date `<input type="date">`, defaulting to +7 days from today.
- Submit calls `createFollowUpAssignment`, disabled until reason + due date are set.
- No facility/CHW picker — with exactly one demo CHW (at Nyamata Health Center), the
  modal resolves `assignedToChwId` automatically. If no CHW exists for the patient's
  registration facility, the modal shows a disabled state with "No Community Health
  Worker is available at this facility yet" instead of a broken/empty picker.

Entry point: `src/app/dashboard/nurse/patients/[id]/page.tsx`'s existing "Actions"
dropdown gains a third item, "Assign Community Health Worker," alongside "Edit patient"
and "Create referral." Visible when `user?.role === "nurse" || user?.role === "gynecologist"`
(the dropdown itself already only renders for `!isReadOnlyAdmin`, so this is an
additional per-item check, not a new wrapper).

## CHW Dashboard (`/dashboard/chw`)

New page + `ChwDashboardContent` component (not reusing `DashboardOverview`, since the
CHW's sections — Today/Upcoming/Missed/High Priority/Completed — don't correspond to
any of that component's existing widgets and forcing them in would mean threading a lot
of chw-only conditionals through an already multi-role component).

Sections, all derived from `useFollowUpAssignmentsForChw(user.id)`:
- **Today's Visits** — `status === "pending" && dueDate === today`.
- **Upcoming** — `status === "pending" && dueDate > today`.
- **Missed** — `status === "pending" && dueDate < today`.
- **High Priority** — `status === "pending" && priority === "high"` (independent
  cross-cutting view, can overlap with the above).
- **Completed** — `status === "completed"` (always empty this slice — shown as an
  explicit "No completed visits yet" empty state, not hidden, so the section exists
  for Slice 2 to populate without another layout change).

Each row is a compact card: patient name, village, reason label, due date, priority
badge — clicking navigates to `/dashboard/chw/patients/[patientId]`.

## Restricted patient view (`/dashboard/chw/patients/[id]`)

New page + `ChwPatientView` component — deliberately not a reuse of
`nurse/patients/[id]/page.tsx` or its tabs. Renders only:
- Name, patient ID, village (`patient.address.village`), phone.
- Gestational age (`gestationalAgeWeeks(pregnancy.lmpDate)`) and EDD
  (`pregnancy.eddDate`) for the open pregnancy, if one exists; otherwise "No active
  pregnancy on file."
- This patient's follow-up assignment history (`useFollowUpAssignmentsForPatient`),
  each showing reason, priority, due date, status, and who assigned it.

No import of `Visit`, `LabRequest`, `Recommendation`, or `RiskLevel` types/data in this
component — the restriction is structural (the code to render clinical data doesn't
exist on this page), not a conditional hide.

## Access restrictions

- `RoleGuard roles={["chw"]}` on both new routes.
- `sidebar.tsx`: the "Dashboard" item already has no `enabledRoles` (visible to all
  authenticated users) and its active-path check already lists every role's dashboard
  path pattern — add `pathname === "/dashboard/chw"` to that list. No other existing
  nav item gets `"chw"` added to its `enabledRoles` — Patient Registry, ANC Visits, Risk
  Classification, Referral Log, Reports, Staff Management, Lab Requests/History all stay
  exactly as restricted as they are today. A CHW reaches a patient only through an
  assignment link on their own dashboard, never a general list.

## Notifications

`useNotificationAlerts` (`use-patients.ts`) gains a `chw` branch: for each
`FollowUpAssignment` where `assignedToChwId === currentUser.id` (matched by session id,
not name/facility like the other branches — needed here since assignments are
CHW-specific, not facility-wide) and `status === "pending"`, push a
`new_followup_assignment` alert (patient name, reason, due date, priority-derived
urgency: `"high"` → `"Urgent"`, `"routine"` → `"Normal"`). `NotificationAlert["type"]`
gains `"new_followup_assignment"`. `notification-panel.tsx`'s `handleAlertClick` gains a
branch routing to `/dashboard/chw/patients/${patientId}`.

## Explicitly out of scope for this slice

- Conducting the actual home visit or recording visit findings.
- The digital follow-up form (Slice 2).
- Marking an assignment `"completed"` — no code path sets this status yet.
- Danger-sign reporting/escalation to the ANC Nurse (Slice 3).
- AI-style rule-based recommendations after a follow-up submission (Slice 4).
- Any reminder mechanism beyond the dashboard's date-bucketed sections (no push
  notifications, no scheduled digest — this is a localStorage demo with no backend).
- A CHW/facility picker in the assignment modal (deferred until there's more than one
  demo CHW to choose between).
