# Notification Role Coverage Gap Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the `lab_nurse` and `hospital_admin` roles real notification coverage in `useNotificationAlerts`, matching the depth every other role already has, without touching any existing condition, type, or backend code.

**Architecture:** All five new conditions are added inline to the existing `useMemo` body in `useNotificationAlerts` (`src/lib/patients/use-patients.ts:908-1470`), following the exact pattern every existing condition uses: filter already-fetched React Query data (`labRequests`, `referrals`, `communityVisits`, `visits`, `patients`) by `role` and `currentUser.facility`, push a `NotificationAlert` object. No new hooks, no new backend endpoints, no schema change.

**Tech Stack:** TypeScript (strict), React Query (data already fetched elsewhere in the app), no test framework in this repo (per `CLAUDE.md`) — verification is `pnpm lint` + `tsc --noEmit` + `pnpm build` + manual smoke check per condition.

## Global Constraints

- Do not modify, remove, or change the behavior of any existing condition in `useNotificationAlerts`. Every change is a pure addition.
- No backend changes (no new Prisma fields, no new endpoints) — everything must be derivable from data the frontend already fetches.
- Every new alert must follow the existing `NotificationAlert` shape exactly (`src/lib/patients/use-patients.ts:870-906`).
- Match the existing code style in this file: inline conditions inside the single `useMemo`, comments only where the "why" isn't obvious from the code (this file already does this well — follow its voice).

## Correction vs. the design spec

The spec (`docs/superpowers/specs/2026-08-06-notification-role-coverage-gap-closure-design.md`) proposed a `lab_result_escalated` type for "feedback when a critical result they submitted gets acknowledged." That field doesn't exist — `LabTestResult` has no acknowledgement/review status anywhere (confirmed via `src/lib/patients/types.ts:52-92`), and reusing the comment thread for this would just duplicate the existing `lab_result_comment` condition (`use-patients.ts:1178-1194`), which already fires on every comment regardless of criticality.

This plan substitutes **`lab_result_unacknowledged`**: notifies the lab_nurse when a critical result they completed has received **zero** comments after 2+ hours — the same underlying goal (close the "submitted a critical result, heard nothing back" loop) using data that actually exists, without overlapping the existing comment notification.

---

### Task 1: Extend `NotificationAlert["type"]` union

**Files:**
- Modify: `src/lib/patients/use-patients.ts:872-895`

**Interfaces:**
- Produces: five new string literal members on `NotificationAlert["type"]` — `"lab_request_overdue"`, `"lab_result_unacknowledged"`, `"red_risk_escalation"`, `"referral_activity"`, `"community_visit_emergency"` — that Tasks 2-6 will use as the `type` field of the `NotificationAlert` objects they push.

- [ ] **Step 1: Add the five new literals to the union**

In `src/lib/patients/use-patients.ts`, change:

```ts
    | "chw_new_assignment"
    | "chw_case_accepted";
```

to:

```ts
    | "chw_new_assignment"
    | "chw_case_accepted"
    | "lab_request_overdue"
    | "lab_result_unacknowledged"
    | "red_risk_escalation"
    | "referral_activity"
    | "community_visit_emergency";
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm --dir /home/ebenezer/Projects/ubuntu/ubuntumed tsc --noEmit`
Expected: no new errors (the union change alone is inert until Tasks 2-6 use the new members).

- [ ] **Step 3: Commit**

```bash
cd /home/ebenezer/Projects/ubuntu/ubuntumed
git add src/lib/patients/use-patients.ts
git commit -m "feat(notifications): add types for lab_nurse and hospital_admin coverage gaps"
```

---

### Task 2: `lab_nurse` — `lab_request_overdue`

**Files:**
- Modify: `src/lib/patients/use-patients.ts:921-925` (add a `now` constant) and `:1109-1121` (insert new condition right after the existing `lab_request` condition, inside the same `for (const lr of labRequests)` loop)

**Interfaces:**
- Consumes: `labRequests: LabRequest[]` (already fetched at `use-patients.ts:915`), `currentUser.facility: string`, the existing `today`/patient-resolution setup inside the `for (const lr of labRequests)` loop (`use-patients.ts:1101-1107`).
- Produces: nothing consumed by later tasks — self-contained.

- [ ] **Step 1: Add a `now` timestamp alongside the existing `today` constant**

Find (`use-patients.ts:924`):
```ts
    const today = new Date().toISOString().slice(0, 10);
```

Change to:
```ts
    const today = new Date().toISOString().slice(0, 10);
    const now = Date.now();
```

- [ ] **Step 2: Add the `lab_request_overdue` condition**

Insert immediately after the existing `lab_request` block (right after the closing `}` at `use-patients.ts:1121`, before the `if (role === "nurse" && lr.status === "In Progress" ...` block that follows):

```ts
      // A pending request that's been sitting unworked for a full day is
      // worth surfacing on its own — separate from the initial
      // "new request" alert above, which fades from attention once it's
      // no longer the newest item in the list.
      if (
        role === "lab_nurse" &&
        lr.facility === currentUser.facility &&
        lr.status !== "Completed" &&
        now - new Date(lr.requestDate).getTime() > 24 * 60 * 60 * 1000
      ) {
        alerts.push({
          id: `lab-request-overdue-${lr.id}`,
          type: "lab_request_overdue",
          patientId: patient.id,
          patientName,
          title: "Lab Request Overdue",
          message: `A lab request for ${patientName} has been pending for over 24 hours.`,
          date: lr.requestDate,
          priority: "Urgent",
          targetId: lr.id,
        });
      }
```

- [ ] **Step 3: Verify it compiles**

Run: `pnpm --dir /home/ebenezer/Projects/ubuntu/ubuntumed tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual smoke check**

Run: `pnpm --dir /home/ebenezer/Projects/ubuntu/ubuntumed dev`
Log in as a `lab_nurse` user whose facility has a `LabRequest` with `status: "Pending"` and `requestDate` more than 24 hours in the past (seed or edit test data if needed). Open the notification bell — confirm "Lab Request Overdue" appears. Confirm a lab request created less than 24 hours ago does **not** trigger it, and that the existing "New Lab Request Submitted" alert still fires unchanged for new requests.

- [ ] **Step 5: Commit**

```bash
cd /home/ebenezer/Projects/ubuntu/ubuntumed
git add src/lib/patients/use-patients.ts
git commit -m "feat(notifications): notify lab_nurse of overdue pending lab requests"
```

---

### Task 3: `lab_nurse` — `lab_result_unacknowledged`

**Files:**
- Modify: `src/lib/patients/use-patients.ts` — insert a new block right after the `lab_result_comment` block (after the closing of the loop at `:1178-1194`, before the gynecologist `lab_completed` block that starts at `:1196`)

**Interfaces:**
- Consumes: `lr.results: LabTestResult[]` (each with `interpretation`, `resultComments?`, `completedAt?`, `completedBy?` — `src/lib/patients/types.ts:52-92`), the `now` constant added in Task 2 Step 1.
- Produces: nothing consumed by later tasks — self-contained.

- [ ] **Step 1: Add the `lab_result_unacknowledged` condition**

Insert immediately after the closing `}` of the existing `lab_result_comment` block (`use-patients.ts:1194`), before `if (role === "gynecologist" && lr.requestedById === currentUser.id ...` (the non-critical `lab_completed` block at `:1196`):

```ts
      // A critical result the lab_nurse completed themselves, still with
      // zero comments from anyone a couple of hours later, means nobody
      // has acted on it yet — there's no acknowledgement field to check
      // (LabTestResult tracks no review status), so absence of any comment
      // after a grace period is the closest real signal available.
      if (role === "lab_nurse" && lr.facility === currentUser.facility) {
        for (const result of lr.results) {
          if (result.interpretation !== "Critical") continue;
          if (result.completedBy !== currentUser.name) continue;
          if ((result.resultComments ?? []).length > 0) continue;
          if (!result.completedAt) continue;
          if (now - new Date(result.completedAt).getTime() < 2 * 60 * 60 * 1000) continue;

          alerts.push({
            id: `lab-result-unacknowledged-${result.id}`,
            type: "lab_result_unacknowledged",
            patientId: patient.id,
            patientName,
            title: "Critical Result Awaiting Review",
            message: `Your critical result (${result.testName}) for ${patientName} has had no response yet — consider following up.`,
            date: result.completedAt,
            priority: "Urgent",
            targetId: lr.id,
          });
        }
      }
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm --dir /home/ebenezer/Projects/ubuntu/ubuntumed tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual smoke check**

With the dev server running, as a `lab_nurse`, complete a lab result with `interpretation: "Critical"` where `completedBy` matches the logged-in user's name, and no comment on it. Confirm the alert does **not** appear immediately (grace period), then verify the condition logic against a seeded/backdated `completedAt` (or temporarily lower the threshold locally to confirm behavior, then revert). Confirm adding a comment on that result removes it from future renders, and confirm the existing `lab_result_comment` and `critical_lab_result` alerts are unaffected.

- [ ] **Step 4: Commit**

```bash
cd /home/ebenezer/Projects/ubuntu/ubuntumed
git add src/lib/patients/use-patients.ts
git commit -m "feat(notifications): notify lab_nurse when their own critical result goes unacknowledged"
```

---

### Task 4: `hospital_admin` — `red_risk_escalation`

**Files:**
- Modify: `src/lib/patients/use-patients.ts:934-960` (inside the existing `for (const v of visits)` loop)

**Interfaces:**
- Consumes: `visits` loop's already-resolved `v`, `preg`, `patient`, `patientName` (`use-patients.ts:926-932`), `Visit.riskLevel: RiskLevel` (`"green" | "yellow" | "orange" | "red"`, `types.ts:1,106`).
- Produces: nothing consumed by later tasks — self-contained.

- [ ] **Step 1: Add the `red_risk_escalation` condition**

Insert right after the existing `nurse`/`visit_today` block (after the closing `}` at `use-patients.ts:960`, still inside the `for (const v of visits)` loop, before its closing `}`):

```ts
      // A hospital director doesn't act on individual recommendations the
      // way a gynecologist does — they need oversight of the most severe
      // cases at their own facility, so this fires for every RED
      // classification today rather than gating on "no recommendation yet."
      if (
        role === "hospital_admin" &&
        v.hospital === currentUser.facility &&
        v.riskLevel === "red" &&
        v.date === today
      ) {
        alerts.push({
          id: `red-risk-${v.id}`,
          type: "red_risk_escalation",
          patientId: patient.id,
          patientName,
          title: "RED-Risk Case at Your Facility",
          message: `${patientName} was classified RED risk at your facility today — highest-severity case requiring oversight.`,
          date: v.createdAt ?? v.date,
          priority: "Emergency",
        });
      }
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm --dir /home/ebenezer/Projects/ubuntu/ubuntumed tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual smoke check**

As a `hospital_admin` user, confirm a patient visit classified `riskLevel: "red"` today at their facility produces "RED-Risk Case at Your Facility" in the bell. Confirm a `"red"` visit from a prior day, or at a different facility, does not appear. Confirm the gynecologist's existing `risk_pregnancy` alert (orange/yellow only) is unaffected.

- [ ] **Step 4: Commit**

```bash
cd /home/ebenezer/Projects/ubuntu/ubuntumed
git add src/lib/patients/use-patients.ts
git commit -m "feat(notifications): notify hospital_admin of RED-risk cases at their facility"
```

---

### Task 5: `hospital_admin` — `referral_activity`

**Files:**
- Modify: `src/lib/patients/use-patients.ts` — insert a new `if (role === "hospital_admin") { ... }` block right after the existing `facility_full` block (`:1258-1272`)

**Interfaces:**
- Consumes: `referrals: Referral[]` (`use-patients.ts:912`, shape at `types.ts:121-160`: `referredByFacility`, `receivingFacility`, `urgency`, `createdAt`, `patientId`), `patients`, `today`.
- Produces: nothing consumed by later tasks — self-contained.

- [ ] **Step 1: Add the `referral_activity` condition**

Insert immediately after the closing `}` of the existing `hospital_admin`/`facility_full` block (`use-patients.ts:1272`), before `if (role === "chw") {` (`:1274`):

```ts
    if (role === "hospital_admin") {
      for (const referral of referrals) {
        const isOutgoing = referral.referredByFacility === currentUser.facility;
        const isIncoming = referral.receivingFacility === currentUser.facility;
        if (!isOutgoing && !isIncoming) continue;
        if (referral.createdAt.slice(0, 10) !== today) continue;

        const patient = patients.find((p) => p.id === referral.patientId);
        if (!patient) continue;
        const patientName = `${patient.firstName} ${patient.lastName}`;

        alerts.push({
          id: `referral-activity-${referral.id}`,
          type: "referral_activity",
          patientId: patient.id,
          patientName,
          title: "Referral Activity at Your Facility",
          message: `A ${referral.urgency} referral for ${patientName} was ${isOutgoing ? "sent from" : "received at"} your facility today.`,
          date: referral.createdAt,
          priority: referral.urgency === "emergency" ? "Emergency" : "Normal",
        });
      }
    }
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm --dir /home/ebenezer/Projects/ubuntu/ubuntumed tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual smoke check**

As a `hospital_admin`, create a referral from their facility today — confirm "Referral Activity at Your Facility" appears with "sent from" wording. Create one addressed to their facility (`receivingFacility`) — confirm it appears with "received at" wording. Confirm a referral from/to a different facility, or from a prior day, does not appear. Confirm the existing `facility_full` alert still fires unchanged.

- [ ] **Step 4: Commit**

```bash
cd /home/ebenezer/Projects/ubuntu/ubuntumed
git add src/lib/patients/use-patients.ts
git commit -m "feat(notifications): notify hospital_admin of referral activity at their facility"
```

---

### Task 6: `hospital_admin` — `community_visit_emergency`

**Files:**
- Modify: `src/lib/patients/use-patients.ts` — insert a new `if (role === "hospital_admin") { ... }` block right after the existing gynecologist `community_visit_flagged` block (`:1449-1463` per the design spec's line reference; confirm exact lines before editing since prior tasks shift line numbers)

**Interfaces:**
- Consumes: `communityVisits` (via `useAllCommunityVisits()`, `use-patients.ts:918`, shape at `types.ts:229-252`: `patientId`, `patientName`, `chwName`, `visitDate`, `nurseFlaggedEmergency`), `patients` (for `registrationFacility` — `CommunityVisit` has no facility field of its own, so the join is required).
- Produces: nothing consumed by later tasks — self-contained.

- [ ] **Step 1: Add the `community_visit_emergency` condition**

Insert immediately after the closing `}` of the existing gynecologist `community_visit_flagged` block, before the final `return alerts.sort(...)`:

```ts
    if (role === "hospital_admin") {
      for (const cv of communityVisits) {
        if (!cv.nurseFlaggedEmergency) continue;
        const patient = patients.find((p) => p.id === cv.patientId);
        if (!patient || patient.registrationFacility !== currentUser.facility) continue;

        alerts.push({
          id: `community-visit-emergency-admin-${cv.id}`,
          type: "community_visit_emergency",
          patientId: cv.patientId,
          patientName: cv.patientName,
          title: "CHW Report Flagged as Emergency",
          message: `A nurse flagged ${cv.chwName}'s home-visit report for ${cv.patientName} at your facility as an emergency.`,
          date: cv.visitDate,
          priority: "Emergency",
        });
      }
    }
```

Note: unlike the gynecologist's existing `community_visit_flagged` (which is deliberately facility-unscoped — gynecologists there see every flagged visit system-wide, confirmed intentional-looking but unconfirmed with the user), this new `hospital_admin` condition IS facility-scoped, since a director overseeing "their facility" system-wide would be a much bigger, different feature. Do not change the gynecologist condition.

- [ ] **Step 2: Verify it compiles**

Run: `pnpm --dir /home/ebenezer/Projects/ubuntu/ubuntumed tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual smoke check**

As a `hospital_admin`, flag a CHW community-visit report as an emergency for a patient registered at their facility — confirm the alert appears. Flag one for a patient at a different facility — confirm it does not appear for this admin. Confirm the gynecologist's existing (unscoped) `community_visit_flagged` alert is unaffected by this change.

- [ ] **Step 4: Commit**

```bash
cd /home/ebenezer/Projects/ubuntu/ubuntumed
git add src/lib/patients/use-patients.ts
git commit -m "feat(notifications): notify hospital_admin of CHW emergency flags at their facility"
```

---

### Task 7: Full verification pass and spec reconciliation

**Files:**
- Modify: `docs/superpowers/specs/2026-08-06-notification-role-coverage-gap-closure-design.md` (update the `lab_result_escalated` section to describe the actually-implemented `lab_result_unacknowledged`, matching the "Correction vs. the design spec" note at the top of this plan)

**Interfaces:**
- Consumes: nothing new — this is a verification and documentation-sync task.

- [ ] **Step 1: Run full verification**

```bash
cd /home/ebenezer/Projects/ubuntu/ubuntumed
pnpm lint
pnpm tsc --noEmit
pnpm build
```

Expected: all three pass clean. If lint or build fails, fix inline before proceeding — do not commit a broken build.

- [ ] **Step 2: Regression smoke test on unaffected roles**

With the dev server running, log in as `nurse`, `gynecologist`, and `chw` in turn and confirm their existing notification lists look exactly as they did before this plan (same alerts, same wording, same count for a given data state) — this plan must not have changed any existing condition's output.

- [ ] **Step 3: Update the spec doc to match reality**

In `docs/superpowers/specs/2026-08-06-notification-role-coverage-gap-closure-design.md`, under "### `lab_nurse` branch", replace the `lab_result_escalated` bullet with:

```markdown
1. **`lab_result_unacknowledged`** — a critical result they personally
   completed (`result.completedBy === currentUser.name`) with zero comments
   after a 2-hour grace period. Substituted for the originally-proposed
   "acknowledged" feedback loop, which turned out to require a field
   (`LabTestResult` has no review/acknowledgement status) that doesn't
   exist and can't be added without a backend change — this achieves the
   same "close the loop" goal using data that's actually available.
```

- [ ] **Step 4: Commit**

```bash
cd /home/ebenezer/Projects/ubuntu/ubuntumed
git add docs/superpowers/specs/2026-08-06-notification-role-coverage-gap-closure-design.md
git commit -m "docs: reconcile notification gap-closure spec with implementation"
```
