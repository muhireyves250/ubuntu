# Gynecologist Role — First Slice Design

## Goal

Introduce a third user role, **Gynecologist**, scoped to one hospital, who can see and act on Red emergency referrals alongside nurses at that facility, and who receives notifications when a new one arrives. This is deliberately the *first slice* of a much larger spec (see full spec pasted by the user on 2026-07-14) — the rest (Orange/Yellow interactive specialist review, nurse recommendation/feedback loop, audit log, imaging/procedure/admission/delivery documentation) is out of scope here and will be its own later slice.

## Out of scope for this slice

- Interactive Orange/Yellow case review and specialist recommendations (spec sections 6–8). Dashboard shows read-only counts only.
- "Patients awaiting specialist review" and "Critical laboratory results" dashboard cards — no such concept exists yet.
- New diagnosis/procedure/admission/delivery/imaging documentation fields. Gynecologists reuse the same `treatment`/`followUpPlan` Visit fields and the same close-with-outcome flow nurses already have.
- Audit log.
- A distinct "lead clinician" / "assigned specialist" data field — ownership of an accepted referral is still just `acceptedByNurse`/`acceptedByFacility` regardless of the accepting user's role.

## 1. Role & Access Model

- `Role` (`src/lib/auth/types.ts`) becomes `"nurse" | "lab_nurse" | "gynecologist"`.
- New demo user: `gynecologist-mutesi`, "Dr. Mutesi", **Bugesera District Hospital** (same facility as `nurse-kagame`, so co-acceptance and same-facility collaboration are actually testable), `facilityLevel: "dh"`.
- `ROLE_DASHBOARD_PATH`/`ROLE_LABEL` gain a `gynecologist` entry (`/dashboard/gynecologist`, "Gynecologist").
- **`RoleGuard` becomes multi-role.** Today it takes a single `path` and only the role whose `ROLE_DASHBOARD_PATH` equals that path is let through — meaning `/dashboard/nurse/patients/[id]` is hard-locked to `"nurse"` only. Change its API to `<RoleGuard roles={["nurse", "gynecologist"]}>` (an explicit allow-list), so shared pages (patient list, patient detail, referral log) serve both roles without duplicating pages. Each role still gets its own dashboard "home" for post-login redirect and sidebar nav via `ROLE_DASHBOARD_PATH`.
- All existing facility/referral/lock/visibility logic (`usePatients`, `usePatientLock`, `useReferrals`, `useActiveEmergencyReferral`, the referral broadcast-to-capable-facilities rule) is already keyed on `user.facility`/`user.facilityLevel`, not role — it applies to gynecologists with **no changes**.
- Referral acceptance (`acceptEmergencyReferral`) and closing (`closeReferral`) are already facility-scoped, not nurse-specific — a Gynecologist at the accepting facility can already call them once the RoleGuard change lands. "First to accept owns it" — no change to that function.

## 2. Gynecologist Dashboard (`/dashboard/gynecologist`)

**Correction from the first draft**: `DashboardOverview` (`src/components/dashboard/overview.tsx`), already used by `/dashboard/nurse`, is role-agnostic — it reads `ROLE_OVERVIEW_COPY[user.role]` and renders purely from data hooks, no nurse-specific logic. It already provides:

- Stat cards: patients registered, ANC visits logged, **active red cases**, **pending follow-ups (orange + yellow)** — via `useRiskSummary()`.
- `RiskDistribution` chart (same counts).
- `TodaysVisitsCard` — visits due/logged today (global, not facility-filtered, consistent with this app's "every facility sees every patient" model established earlier).
- `SidePanel` — a "Following Module" list (`useFollowUpPatients`) and an "Active Referrals" list (`useActiveReferrals`), both already link into the shared `/dashboard/nurse/patients/:id` route, which works for a Gynecologist session too since only `RoleGuard` access is widened — the URL segment doesn't imply role ownership.

So `/dashboard/gynecologist/page.tsx` is just `<RoleGuard roles={["gynecologist"]}><DashboardOverview /></RoleGuard>` — no new dashboard component. The one gap against the spec's card list is a distinct "New emergency referrals" card, but that's already covered globally by the existing `RedCaseAlertPanel` pinned above all dashboard content (`dashboard/layout.tsx`), which needs no change since it isn't currently role-gated.

## 3. Notifications (extend the existing derived-alert system)

**Correction from the first draft of this doc**: a notification system already exists — `Topbar` renders a bell icon with an unread-count badge and a `NotificationPanel`, driven by `useNotificationAlerts(role)` in `use-patients.ts`. It returns a `NotificationAlert[]` computed live from current data (e.g. `role === "nurse" && labStatus === "completed" && !assessmentFinalized` → a "Laboratory Results Completed" alert) — there's no persisted store and no read/unread state; an alert simply exists for as long as its underlying condition is true, same as today's `RedCaseAlertPanel`. This is the established pattern, so this slice extends it rather than adding a second, competing notification system.

Add two new `NotificationAlert` variants, both computed from `useReferrals()` filtered to `urgency === "emergency"`:

1. **`referral_pending`** — for `role === "gynecologist"`: any pending referral visible to a capable facility (same broadcast rule as `RedCaseAlertPanel`) becomes an alert until it's accepted.
2. **`referral_accepted_elsewhere`** — for `role === "gynecologist"`: a referral just accepted by a nurse at the gynecologist's own facility (`status === "accepted" && acceptedByFacility === user.facility`) shows as an alert too, so the "still linked" requirement is satisfied — the gynecologist sees it in their panel even though they didn't accept it themselves.

`NotificationAlert.type` widens to include these two; `NotificationPanel`'s `handleAlertClick` gains a case routing both to the patient page. No new storage file, no read/unread field — consistent with how today's lab alerts behave (they disappear once the underlying condition resolves, e.g. once accepted/finalized).

## 4. Emergency Case Management (reused, not new)

Once a Gynecologist accepts (or is present at the accepting facility for) a Red case:

- They see the same patient detail page nurses see (`ActiveReferralBanner`, full tabs, Visit History, etc.) — no new UI.
- They document treatment the same way nurses do today — existing `treatment`/`followUpPlan` Visit fields.
- They close the case the same way — existing `CloseReferralModal` (outcome: recovered/died + updated risk color), already facility-gated not role-gated.

## File-level summary

- `src/lib/auth/types.ts` — add `"gynecologist"` to `Role`.
- `src/lib/auth/demo-users.ts` — add `gynecologist-mutesi`.
- `src/lib/auth/role-routes.ts` — add dashboard path + label.
- `src/lib/dashboard/role-copy.ts` — add overview copy.
- `src/app/login/page.tsx` — add to `MORE_USER_IDS` (established pattern from earlier session bug).
- `src/components/role-guard.tsx` — change `path: string` prop to `roles: Role[]`; update `canAccessDashboardPath`/`dashboardPathForRole` in `role-routes.ts` accordingly.
- `<RoleGuard path="/dashboard/nurse">` call sites, updated to `<RoleGuard roles={[...]}>`:
  - Patient list (`nurse/patients/page.tsx`), patient detail (`nurse/patients/[id]/page.tsx`), referral log (`nurse/referrals/page.tsx`) → `["nurse", "gynecologist"]` (core shared clinical workflow).
  - Risk Classification (`nurse/risk-classification/page.tsx`) → `["nurse", "gynecologist"]` (the dashboard's Orange/Yellow count tiles link here).
  - Today's Visits (`nurse/visits/page.tsx`) and Alerts/follow-up acknowledgment (`nurse/alerts/page.tsx`) → stay `["nurse"]` only; these belong to the nurse's routine ANC workflow and Section 6/7 (interactive Orange/Yellow review) is out of scope this slice.
- `src/app/dashboard/gynecologist/page.tsx` — new dashboard page.
- `src/components/dashboard/sidebar.tsx` — add Gynecologist nav items (`NAV_ITEMS`, `enabledRoles`), and widen `enabledRoles` on Patient Registry / Risk Classification / Referral Log to include `"gynecologist"`.
- `src/lib/patients/use-patients.ts` — widen `NotificationAlert.type`, extend `useNotificationAlerts` with the two new gynecologist branches described above (pure read, no new storage).
- `src/components/dashboard/notification-panel.tsx` — extend `handleAlertClick`'s type union and routing for the two new alert types.
- `src/components/dashboard/topbar.tsx` — swap the `user.role === "nurse" ? <PatientSearch /> : ...` check to include `"gynecologist"` too, since gynecologists also need patient search, not the placeholder search box.

## Testing

No test runner exists in this repo (confirmed in `CLAUDE.md`). Verification is `pnpm exec tsc --noEmit`, `pnpm exec eslint .`, and `pnpm build`, plus manual walkthrough: log in as Nyamata nurse → trigger a Red case → log in as Dr. Mutesi (Bugesera) → see notification + dashboard card → accept → document → close with outcome. Then repeat with Nurse Kagame accepting first → confirm Dr. Mutesi still gets notified and can still open/act on the case.
