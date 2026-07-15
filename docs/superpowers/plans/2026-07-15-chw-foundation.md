# CHW Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the minimum end-to-end loop for the Community Health Worker (CHW) role — a Nurse or Gynecologist can create a follow-up assignment for a patient, and the CHW can see it on their dashboard and view a restricted patient record. No visit-conducting workflow yet (that's Slice 2).

**Architecture:** New `FollowUpAssignment` entity persisted the same way as `Referral` (list-store in `storage.ts`, `useSyncExternalStore` hooks in `use-patients.ts`). New `chw` role added to the existing `Role` union and threaded through `DemoUser`/`ManagedStaffAccount`/`DirectoryUser` (gains an optional `village` field, unique to this role). Two new dedicated CHW-only pages (dashboard + restricted patient view) rather than reusing existing nurse-facing components, so the data restriction is structural.

**Tech Stack:** Next.js App Router, React 19, TypeScript strict, Tailwind CSS v4, `useSyncExternalStore` over `window.localStorage`. No backend, no test runner (confirmed via `CLAUDE.md`) — verification is `pnpm exec tsc --noEmit` (ignore stale `.next/types/*`) + `pnpm exec eslint <files>` after each task, `pnpm build` at the end.

## Global Constraints

- Never `pnpm add`/`npm`/`yarn`/`bun` — pnpm exclusively.
- Assignments are created by `nurse` and `gynecologist` roles only — never fabricate a "Health Center Manager" role (doesn't exist in this app; see the design doc's spec-vs-reality note).
- `FollowUpStatus` includes `"completed"` in the type now, but no code in this slice ever sets it — that's Slice 2's job. Don't build a "mark complete" action.
- CHW dashboard/patient-view code must never import `Visit`, `LabRequest`, `Recommendation`, or `RiskLevel` — the data restriction is structural, not a conditional hide.
- Exactly one demo CHW exists (`chw-mukamana` at Nyamata Health Center). No CHW/facility picker UI — resolve automatically, and show an explicit "no CHW available" state if none exists for a facility.

---

### Task 1: `chw` role + `village` field threaded through the user directory

**Files:**
- Modify: `src/lib/auth/types.ts`
- Modify: `src/lib/auth/managed-staff-storage.ts`
- Modify: `src/lib/auth/user-directory.ts`

**Interfaces:**
- Produces: `Role` includes `"chw"`; `DemoUser.village?`, `ManagedStaffAccount.village?`, `DirectoryUser.village?`; new `findChwForFacility(facility: string): DirectoryUser | undefined` in `user-directory.ts` — consumed by Task 6 (`assign-chw-modal.tsx`).

- [ ] **Step 1: Widen `Role` and add `village` to `DemoUser`**

In `src/lib/auth/types.ts`, replace:
```ts
export type Role = "nurse" | "lab_nurse" | "gynecologist" | "hospital_admin";
```
with:
```ts
export type Role = "nurse" | "lab_nurse" | "gynecologist" | "hospital_admin" | "chw";
```

In the same file, add `village?: string;` to `DemoUser`, immediately after `facility: string;`:
```ts
export interface DemoUser {
  id: string;
  username: string;
  name: string;
  title: string;
  facility: string;
  village?: string; // only meaningful for chw — the sub-facility catchment they serve
  role: Role;
  facilityLevel: FacilityLevel;
  password: string;
}
```

- [ ] **Step 2: Add `village` to `ManagedStaffAccount`**

In `src/lib/auth/managed-staff-storage.ts`, add `village?: string;` to the interface, after `facility: string;`:
```ts
export interface ManagedStaffAccount {
  id: string;
  username: string;
  name: string;
  title: string;
  facility: string;
  village?: string;
  role: Extract<Role, "nurse" | "lab_nurse" | "gynecologist">;
  facilityLevel: FacilityLevel;
  password: string;
  status: "active" | "suspended";
  createdByAdminId: string;
  createdAt: string;
}
```
(No CHW accounts can be created via Staff Management in this slice — `role` there stays restricted to the three clinical roles, per the existing design. This field only ever gets populated for the hardcoded demo CHW added in Task 2.)

- [ ] **Step 3: Add `village` to `DirectoryUser` and thread it through both mapping functions**

In `src/lib/auth/user-directory.ts`, add `village?: string;` to the `DirectoryUser` interface, after `facility: string;`.

Update `demoUserToDirectoryUser`:
```ts
function demoUserToDirectoryUser(
  user: DemoUser,
  overrides: Record<string, StaffOverride>,
): DirectoryUser {
  const override = overrides[user.id];
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    title: user.title,
    facility: user.facility,
    village: user.village,
    role: user.role,
    facilityLevel: user.facilityLevel,
    status: override?.status === "suspended" ? "suspended" : "active",
    password: override?.password ?? user.password,
    source: "demo",
  };
}
```

Update `managedStaffToDirectoryUser`:
```ts
function managedStaffToDirectoryUser(account: ManagedStaffAccount): DirectoryUser {
  return {
    id: account.id,
    username: account.username,
    name: account.name,
    title: account.title,
    facility: account.facility,
    village: account.village,
    role: account.role,
    facilityLevel: account.facilityLevel,
    status: account.status,
    password: account.password,
    source: "managed",
  };
}
```

- [ ] **Step 4: Add `findChwForFacility`**

At the end of `src/lib/auth/user-directory.ts`, add:
```ts
export function findChwForFacility(facility: string): DirectoryUser | undefined {
  return getAllDirectoryUsers().find((u) => u.role === "chw" && u.facility === facility);
}
```

- [ ] **Step 5: Type-check + lint**

Run:
```bash
pnpm exec tsc --noEmit
pnpm exec eslint src/lib/auth/types.ts src/lib/auth/managed-staff-storage.ts src/lib/auth/user-directory.ts
```
Expected: errors will surface anywhere `Record<Role, ...>` exists without a `chw` key (Task 2 fixes these — expected at this point) and nowhere else. If any other file errors, stop and report before continuing.

---

### Task 2: Demo CHW account, role routing, login page

**Files:**
- Modify: `src/lib/auth/demo-users.ts`
- Modify: `src/lib/auth/role-routes.ts`
- Modify: `src/lib/dashboard/role-copy.ts`
- Modify: `src/components/dashboard/profile-panel.tsx`
- Modify: `src/app/login/page.tsx`

- [ ] **Step 1: Add the demo CHW user**

In `src/lib/auth/demo-users.ts`, add to the end of `DEMO_USERS` (before the closing `];`):
```ts
  {
    id: "chw-mukamana",
    username: "mukamana",
    name: "Mukamana",
    title: "Community Health Worker",
    facility: "Nyamata Health Center",
    village: "Rilima",
    role: "chw",
    facilityLevel: "hc",
    password: "chw123",
  },
```

- [ ] **Step 2: Role routing + label**

In `src/lib/auth/role-routes.ts`, add to `ROLE_DASHBOARD_PATH`:
```ts
  chw: "/dashboard/chw",
```
and to `ROLE_LABEL`:
```ts
  chw: "Community Health Worker",
```

- [ ] **Step 2.5: Profile panel permissions list**

`src/components/dashboard/profile-panel.tsx` has its own `ROLE_PERMISSIONS: Record<Role, string[]>` (a 4th `Record<Role, ...>` beyond the three named above — found via `grep -rn "Record<Role" src`). Add a `chw` entry after `hospital_admin`:
```ts
  chw: [
    "Receive community follow-up assignments from ANC nurses and gynecologists",
    "View a restricted record (name, ID, village, phone, gestational age, EDD) for assigned patients only",
    "Cannot register patients, perform assessments, or view lab/clinical records",
    "Cannot accept emergency referrals or modify patient records",
  ],
```

- [ ] **Step 3: Overview copy**

In `src/lib/dashboard/role-copy.ts`, add to `ROLE_OVERVIEW_COPY`:
```ts
  chw: {
    scope: "Community Follow-up",
    description:
      "Home-visit assignments from ANC nurses and gynecologists for your catchment appear here.",
  },
```

- [ ] **Step 4: Login page tab + icon**

In `src/app/login/page.tsx`, add to `ROLE_TABS`:
```ts
  { role: "chw", label: "Community Health Worker" },
```

In `RoleIcon`, add a `chw` branch before the final fallback `return`:
```tsx
  if (role === "chw") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M4 11.5 12 4l8 7.5M6 10v9a1 1 0 0 0 1 1h3v-5h4v5h3a1 1 0 0 0 1-1v-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
```

- [ ] **Step 5: Type-check + lint**

Run:
```bash
pnpm exec tsc --noEmit
pnpm exec eslint src/lib/auth/demo-users.ts src/lib/auth/role-routes.ts src/lib/dashboard/role-copy.ts src/components/dashboard/profile-panel.tsx src/app/login/page.tsx
```
Expected: clean — this resolves the `Record<Role, ...>` errors expected at the end of Task 1 (all four: `ROLE_DASHBOARD_PATH`, `ROLE_LABEL`, `ROLE_OVERVIEW_COPY`, `ROLE_PERMISSIONS`).

- [ ] **Step 6: Manual smoke test**

With the dev server running on port 3001, log in as `mukamana` / `chw123` on the "Community Health Worker" tab. Login will succeed (auth doesn't care that `/dashboard/chw` doesn't exist yet) but redirect to a 404 — expected until Task 8. This just confirms the account/routing wiring is correct in isolation.

---

### Task 3: `FollowUpAssignment` types

**Files:**
- Modify: `src/lib/patients/types.ts`

**Interfaces:**
- Produces: `FollowUpReason`, `FollowUpPriority`, `FollowUpStatus`, `FollowUpAssignment`, `FOLLOW_UP_REASON_LABELS` — consumed by Task 4, 5, 6, 8, 9.

- [ ] **Step 1: Add the types**

Append to `src/lib/patients/types.ts`:
```ts
export type FollowUpReason =
  | "missed_anc"
  | "high_risk_followup"
  | "medication_adherence"
  | "bp_monitoring"
  | "nutrition_counseling"
  | "post_emergency_followup"
  | "general_monitoring";

export const FOLLOW_UP_REASON_LABELS: Record<FollowUpReason, string> = {
  missed_anc: "Missed ANC appointment",
  high_risk_followup: "High-risk pregnancy follow-up",
  medication_adherence: "Medication adherence",
  bp_monitoring: "Blood pressure monitoring",
  nutrition_counseling: "Nutrition counseling",
  post_emergency_followup: "Post-emergency follow-up",
  general_monitoring: "General pregnancy monitoring",
};

export type FollowUpPriority = "routine" | "high";

// "completed" is unreachable in this slice — nothing sets it yet, since the
// visit-completion workflow is a later slice. It's part of the type now so
// that slice doesn't need to touch this file again.
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

- [ ] **Step 2: Type-check + lint**

Run: `pnpm exec tsc --noEmit && pnpm exec eslint src/lib/patients/types.ts`
Expected: clean

---

### Task 4: `FollowUpAssignment` storage

**Files:**
- Modify: `src/lib/patients/storage.ts`

**Interfaces:**
- Consumes: `FollowUpAssignment` (Task 3)
- Produces: `subscribeToFollowUpAssignments`, `getFollowUpAssignmentsSnapshot`, `getServerFollowUpAssignmentsSnapshot`, `addFollowUpAssignment` — consumed by Task 5.

- [ ] **Step 1: Add the import**

In `src/lib/patients/storage.ts`, update the top import line:
```ts
import type { Patient, Visit, Referral, Pregnancy, Recommendation, FollowUpAssignment } from "./types";
```

- [ ] **Step 2: Add the store**

Add near the other `_KEY` constants (after `RECOMMENDATIONS_KEY`):
```ts
const FOLLOWUP_ASSIGNMENTS_KEY = "ubuntumed.followUpAssignments";
```

Add near the other caches:
```ts
let followUpAssignmentsCache: FollowUpAssignment[] | null = null;
```

Add near the other listener sets:
```ts
const followUpAssignmentListeners = new Set<() => void>();
```

Add near the other `isCurrentShape*` guards (after `isCurrentShapeRecommendation`):
```ts
function isCurrentShapeFollowUpAssignment(assignment: FollowUpAssignment): boolean {
  return (
    typeof assignment.createdAt === "string" &&
    typeof assignment.assignedToChwId === "string" &&
    typeof assignment.dueDate === "string"
  );
}
```

Add near the other `load*` functions (after `loadRecommendations`):
```ts
function loadFollowUpAssignments(): FollowUpAssignment[] {
  if (followUpAssignmentsCache) return followUpAssignmentsCache;
  const stored = readList<FollowUpAssignment>(FOLLOWUP_ASSIGNMENTS_KEY);
  const usable = stored && stored.every(isCurrentShapeFollowUpAssignment) ? stored : null;
  followUpAssignmentsCache = usable ?? [];
  if (!usable) writeList(FOLLOWUP_ASSIGNMENTS_KEY, followUpAssignmentsCache);
  return followUpAssignmentsCache;
}
```

Add near the other `subscribeTo*` exports:
```ts
export function subscribeToFollowUpAssignments(onChange: () => void) {
  followUpAssignmentListeners.add(onChange);
  return () => followUpAssignmentListeners.delete(onChange);
}
```

Add near the other `get*Snapshot` exports:
```ts
export function getFollowUpAssignmentsSnapshot(): FollowUpAssignment[] {
  return loadFollowUpAssignments();
}
```

Add near the other `getServer*Snapshot` exports:
```ts
export function getServerFollowUpAssignmentsSnapshot(): FollowUpAssignment[] {
  return [];
}
```

Add near the other `add*` mutators (after `addRecommendation`):
```ts
export function addFollowUpAssignment(assignment: FollowUpAssignment) {
  followUpAssignmentsCache = [...loadFollowUpAssignments(), assignment];
  writeList(FOLLOWUP_ASSIGNMENTS_KEY, followUpAssignmentsCache);
  followUpAssignmentListeners.forEach((listener) => listener());
}
```

- [ ] **Step 3: Type-check + lint**

Run: `pnpm exec tsc --noEmit && pnpm exec eslint src/lib/patients/storage.ts`
Expected: clean

---

### Task 5: Hooks, mutator, and notification alerts

**Files:**
- Modify: `src/lib/patients/use-patients.ts`

**Interfaces:**
- Consumes: everything from Task 4; `FollowUpAssignment`, `FollowUpReason`, `FollowUpPriority` (Task 3); `findUserById` (already imported)
- Produces: `useFollowUpAssignments`, `useFollowUpAssignmentsForChw`, `useFollowUpAssignmentsForPatient`, `createFollowUpAssignment` — consumed by Task 6, 8, 9. `NotificationAlert["type"]` gains `"new_followup_assignment"` — consumed by Task 10.

- [ ] **Step 1: Update imports**

Update the `from "./storage"` import block to add:
```ts
  subscribeToFollowUpAssignments,
  getFollowUpAssignmentsSnapshot,
  getServerFollowUpAssignmentsSnapshot,
  addFollowUpAssignment,
```

Update the `from "./types"` import block to add:
```ts
  FollowUpAssignment,
  FollowUpReason,
  FollowUpPriority,
```

- [ ] **Step 2: Widen `getCurrentUserSnapshot`**

Replace:
```ts
function getCurrentUserSnapshot(): { name: string; facility: string; facilityLevel: string } {
  const sessionUserId =
    typeof window !== "undefined"
      ? window.localStorage.getItem(SESSION_STORAGE_KEY)
      : null;
  const user = sessionUserId ? findUserById(sessionUserId) : null;
  return {
    name: user?.name ?? "Unknown",
    facility: user?.facility ?? "Unknown facility",
    facilityLevel: user?.facilityLevel ?? "hc",
  };
}
```
with:
```ts
function getCurrentUserSnapshot(): { id: string; name: string; facility: string; facilityLevel: string; role: string } {
  const sessionUserId =
    typeof window !== "undefined"
      ? window.localStorage.getItem(SESSION_STORAGE_KEY)
      : null;
  const user = sessionUserId ? findUserById(sessionUserId) : null;
  return {
    id: user?.id ?? "",
    name: user?.name ?? "Unknown",
    facility: user?.facility ?? "Unknown facility",
    facilityLevel: user?.facilityLevel ?? "hc",
    role: user?.role ?? "nurse",
  };
}
```
(Existing call sites destructure a subset of these fields — e.g. `const { name, facility } = getCurrentUserSnapshot();` — and are unaffected by the two new fields.)

- [ ] **Step 3: Add hooks and mutator**

Add after `useAllRecommendations` (and its `createRecommendation`/`respondToRecommendation`/`acknowledgeRecommendation` block), before `useActiveEmergencyReferral`:
```ts
export function useFollowUpAssignments(): FollowUpAssignment[] {
  return useSyncExternalStore(
    subscribeToFollowUpAssignments,
    getFollowUpAssignmentsSnapshot,
    getServerFollowUpAssignmentsSnapshot,
  );
}

export function useFollowUpAssignmentsForChw(chwId: string): FollowUpAssignment[] {
  const assignments = useFollowUpAssignments();
  return useMemo(
    () => assignments.filter((a) => a.assignedToChwId === chwId),
    [assignments, chwId],
  );
}

export function useFollowUpAssignmentsForPatient(patientId: string): FollowUpAssignment[] {
  const assignments = useFollowUpAssignments();
  return useMemo(
    () =>
      assignments
        .filter((a) => a.patientId === patientId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [assignments, patientId],
  );
}

export function createFollowUpAssignment(data: {
  patientId: string;
  reason: FollowUpReason;
  priority: FollowUpPriority;
  dueDate: string;
  assignedToChwId: string;
  facility: string;
}): FollowUpAssignment {
  const currentUser = getCurrentUserSnapshot();
  const assignment: FollowUpAssignment = {
    id: `followup-${crypto.randomUUID()}`,
    patientId: data.patientId,
    createdAt: new Date().toISOString(),
    assignedByName: currentUser.name,
    assignedByRole: currentUser.role as "nurse" | "gynecologist",
    facility: data.facility,
    assignedToChwId: data.assignedToChwId,
    reason: data.reason,
    priority: data.priority,
    dueDate: data.dueDate,
    status: "pending",
  };
  addFollowUpAssignment(assignment);
  return assignment;
}
```

- [ ] **Step 4: Notification alerts**

In the `NotificationAlert` interface, add `"new_followup_assignment"` to the `type` union:
```ts
  type:
    | "lab_request"
    | "lab_completed"
    | "referral_pending"
    | "referral_accepted"
    | "recommendation_open"
    | "recommendation_responded"
    | "risk_pregnancy"
    | "critical_lab_result"
    | "emergency_arrival"
    | "facility_full"
    | "new_followup_assignment";
```

Inside `useNotificationAlerts`, add a `followUpAssignments` read via the hook already added in Step 3, and a `chw` branch. First, add the hook call alongside the other hooks at the top of `useNotificationAlerts` (after `const currentUser = getCurrentUserSnapshot();`):
```ts
  const followUpAssignments = useFollowUpAssignments();
```

Then, inside the `useMemo` body, after the existing `if (role === "hospital_admin" && ...)` block and before the final `return alerts.sort(...)`, add:
```ts
    if (role === "chw") {
      for (const assignment of followUpAssignments) {
        if (assignment.assignedToChwId !== currentUser.id || assignment.status !== "pending") continue;
        const patient = patients.find((p) => p.id === assignment.patientId);
        if (!patient) continue;
        const patientName = `${patient.firstName} ${patient.lastName}`;
        alerts.push({
          id: `followup-assignment-${assignment.id}`,
          type: "new_followup_assignment",
          patientId: patient.id,
          patientName,
          title: "New Follow-up Assignment",
          message: `${assignment.assignedByName} assigned ${patientName} for ${FOLLOW_UP_REASON_LABELS[assignment.reason]} — due ${assignment.dueDate}.`,
          date: assignment.createdAt.slice(0, 10),
          priority: assignment.priority === "high" ? "Urgent" : "Normal",
        });
      }
    }
```

Update the `useMemo` dependency array to include `followUpAssignments`:
```ts
  }, [visits, patients, pregnancies, referrals, recommendations, followUpAssignments, role, currentUser.facility, currentUser.name, currentUser.id]);
```

Add `FOLLOW_UP_REASON_LABELS` to the `from "./types"` import block added in Step 1 (it's a value, not a type-only import, so it needs its own or a merged non-type import — add a separate import line since the existing block is `import type {...}`):
```ts
import { FOLLOW_UP_REASON_LABELS } from "./types";
```

- [ ] **Step 5: Type-check + lint**

Run: `pnpm exec tsc --noEmit && pnpm exec eslint src/lib/patients/use-patients.ts`
Expected: clean

---

### Task 6: `AssignChwModal`

**Files:**
- Create: `src/components/patients/assign-chw-modal.tsx`

**Interfaces:**
- Consumes: `createFollowUpAssignment` (Task 5); `findChwForFacility` (Task 1); `FOLLOW_UP_REASON_LABELS`, `FollowUpReason`, `FollowUpPriority` (Task 3)

- [ ] **Step 1: Write the modal**

```tsx
"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { createFollowUpAssignment } from "@/lib/patients/use-patients";
import { findChwForFacility } from "@/lib/auth/user-directory";
import { IconClose } from "@/components/dashboard/icons";
import { fullName } from "@/lib/format";
import { FOLLOW_UP_REASON_LABELS } from "@/lib/patients/types";
import type { Patient, FollowUpReason, FollowUpPriority } from "@/lib/patients/types";

const REASON_OPTIONS = Object.keys(FOLLOW_UP_REASON_LABELS) as FollowUpReason[];

function defaultDueDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

export function AssignChwModal({
  patient,
  onClose,
  onCreated,
}: {
  patient: Patient;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [reason, setReason] = useState<FollowUpReason>(REASON_OPTIONS[0]);
  const [priority, setPriority] = useState<FollowUpPriority>("routine");
  const [dueDate, setDueDate] = useState(defaultDueDate());

  const chw = findChwForFacility(patient.registrationFacility);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function handleSubmit() {
    if (!chw) return;
    createFollowUpAssignment({
      patientId: patient.id,
      reason,
      priority,
      dueDate,
      assignedToChwId: chw.id,
      facility: chw.facility,
    });
    onCreated();
    onClose();
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
      />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-300 bg-[#ffeedb] p-6 shadow-2xl dark:border-zinc-700 dark:bg-orange-950/40">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            Assign Community Health Worker
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-xl border border-zinc-300 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-zinc-900 dark:text-zinc-50">{fullName(patient)}</p>
            <p className="text-xs text-zinc-500">{patient.registrationFacility}</p>
          </div>
        </div>

        {!chw ? (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            No Community Health Worker is available at this facility yet.
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-4 rounded-xl border border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
            <p className="text-xs text-zinc-400">
              Will be assigned to <span className="font-medium text-zinc-600 dark:text-zinc-300">{chw.name}</span>
              {chw.village ? ` (${chw.village})` : ""}
            </p>

            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Reason
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as FollowUpReason)}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              >
                {REASON_OPTIONS.map((r) => (
                  <option key={r} value={r}>{FOLLOW_UP_REASON_LABELS[r]}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Priority
              <div className="flex gap-2">
                {(["routine", "high"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      priority === p
                        ? p === "high"
                          ? "border-red-500 bg-red-50 text-red-700"
                          : "border-teal-500 bg-teal-50 text-teal-700"
                        : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                    }`}
                  >
                    {p === "high" ? "High" : "Routine"}
                  </button>
                ))}
              </div>
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Due date
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </label>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!dueDate}
                onClick={handleSubmit}
                className="rounded-xl bg-[#0f766e] px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Assign
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
```

- [ ] **Step 2: Type-check + lint**

Run: `pnpm exec tsc --noEmit && pnpm exec eslint src/components/patients/assign-chw-modal.tsx`
Expected: clean

---

### Task 7: Wire "Assign Community Health Worker" into the patient detail page

**Files:**
- Modify: `src/app/dashboard/nurse/patients/[id]/page.tsx`

**Interfaces:**
- Consumes: `AssignChwModal` (Task 6)

- [ ] **Step 1: Import the modal**

Add alongside the other modal imports:
```ts
import { AssignChwModal } from "@/components/patients/assign-chw-modal";
```

- [ ] **Step 2: Add modal state**

Add alongside `showReferralModal`:
```ts
  const [showAssignChwModal, setShowAssignChwModal] = useState(false);
```

- [ ] **Step 3: Render the modal**

Add alongside the existing `{showReferralModal && (...)}` block:
```tsx
      {showAssignChwModal && (
        <AssignChwModal
          patient={patient}
          onClose={() => setShowAssignChwModal(false)}
          onCreated={() => {}}
        />
      )}
```

- [ ] **Step 4: Add the Actions menu item**

Add a third item to the Actions dropdown, after "Create referral," gated to `nurse`/`gynecologist`:
```tsx
                  {(user?.role === "nurse" || user?.role === "gynecologist") && (
                    <button
                      type="button"
                      onClick={() => { setActionsOpen(false); setShowAssignChwModal(true); }}
                      className="block w-full px-4 py-2.5 text-left text-sm text-zinc-700 hover:bg-teal-50 hover:text-teal-900 dark:text-zinc-300 dark:hover:bg-teal-950"
                    >
                      Assign Community Health Worker
                    </button>
                  )}
```
This goes immediately after the existing "Create referral" `<button>` and before the closing `</div>` of the dropdown.

- [ ] **Step 5: Type-check + lint**

Run: `pnpm exec tsc --noEmit && pnpm exec eslint "src/app/dashboard/nurse/patients/[id]/page.tsx"`
Expected: clean

---

### Task 8: CHW Dashboard

**Files:**
- Create: `src/components/dashboard/chw/chw-dashboard-content.tsx`
- Create: `src/app/dashboard/chw/page.tsx`

**Interfaces:**
- Consumes: `useFollowUpAssignmentsForChw` (Task 5); `useAuth`; `usePatients` (existing, for name/village lookup); `FOLLOW_UP_REASON_LABELS` (Task 3); `StatCard` (existing)

- [ ] **Step 1: Write the dashboard content**

```tsx
"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { useFollowUpAssignmentsForChw, usePatients } from "@/lib/patients/use-patients";
import { FOLLOW_UP_REASON_LABELS } from "@/lib/patients/types";
import type { FollowUpAssignment } from "@/lib/patients/types";
import { StatCard } from "@/components/dashboard/stat-card";
import { IconClipboard, IconClock, IconAlert, IconCheckCircle, IconUsers } from "@/components/dashboard/icons";

function AssignmentRow({ assignment, patientName, village }: { assignment: FollowUpAssignment; patientName: string; village: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.push(`/dashboard/chw/patients/${assignment.patientId}`)}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
    >
      <div className="min-w-0">
        <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">{patientName}</p>
        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
          {village} • {FOLLOW_UP_REASON_LABELS[assignment.reason]}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            assignment.priority === "high"
              ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
          }`}
        >
          {assignment.priority === "high" ? "High priority" : "Routine"}
        </span>
        <span className="text-xs text-zinc-400">Due {assignment.dueDate}</span>
      </div>
    </button>
  );
}

function AssignmentSection({
  title,
  assignments,
  patientNameOf,
  villageOf,
  emptyText,
}: {
  title: string;
  assignments: FollowUpAssignment[];
  patientNameOf: (patientId: string) => string;
  villageOf: (patientId: string) => string;
  emptyText: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{title}</h3>
      {assignments.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-4 text-center text-sm text-zinc-400 dark:border-zinc-800">
          {emptyText}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {assignments.map((a) => (
            <AssignmentRow key={a.id} assignment={a} patientName={patientNameOf(a.patientId)} village={villageOf(a.patientId)} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ChwDashboardContent() {
  const { user } = useAuth();
  const patients = usePatients();
  const assignments = useFollowUpAssignmentsForChw(user?.id ?? "");

  const patientNameOf = (patientId: string) => {
    const p = patients.find((pt) => pt.id === patientId);
    return p ? `${p.firstName} ${p.lastName}` : "Unknown patient";
  };
  const villageOf = (patientId: string) => {
    const p = patients.find((pt) => pt.id === patientId);
    return p?.address.village ?? "—";
  };

  const { today, upcoming, missed, highPriority, completed } = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const pending = assignments.filter((a) => a.status === "pending");
    return {
      today: pending.filter((a) => a.dueDate === todayStr),
      upcoming: pending.filter((a) => a.dueDate > todayStr),
      missed: pending.filter((a) => a.dueDate < todayStr),
      highPriority: pending.filter((a) => a.priority === "high"),
      completed: assignments.filter((a) => a.status === "completed"),
    };
  }, [assignments]);

  if (!user) return null;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Community Follow-up — {user.village ?? user.facility}
      </h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <StatCard icon={IconUsers} value={String(assignments.filter((a) => a.status === "pending").length)} label="Assigned" accentClass="bg-teal-100 text-teal-700" />
        <StatCard icon={IconClipboard} value={String(today.length)} label="Today" accentClass="bg-sky-100 text-sky-700" />
        <StatCard icon={IconClock} value={String(upcoming.length)} label="Upcoming" accentClass="bg-violet-100 text-violet-700" />
        <StatCard icon={IconAlert} value={String(missed.length)} label="Missed" accentClass="bg-red-100 text-red-700" />
        <StatCard icon={IconCheckCircle} value={String(completed.length)} label="Completed" accentClass="bg-zinc-100 text-zinc-600" />
      </div>

      <AssignmentSection title="Today's Visits" assignments={today} patientNameOf={patientNameOf} villageOf={villageOf} emptyText="No visits due today." />
      <AssignmentSection title="High Priority" assignments={highPriority} patientNameOf={patientNameOf} villageOf={villageOf} emptyText="No high-priority cases." />
      <AssignmentSection title="Missed" assignments={missed} patientNameOf={patientNameOf} villageOf={villageOf} emptyText="Nothing overdue." />
      <AssignmentSection title="Upcoming" assignments={upcoming} patientNameOf={patientNameOf} villageOf={villageOf} emptyText="No upcoming visits." />
      <AssignmentSection title="Completed" assignments={completed} patientNameOf={patientNameOf} villageOf={villageOf} emptyText="No completed visits yet." />
    </div>
  );
}
```

- [ ] **Step 2: Write the route**

Create `src/app/dashboard/chw/page.tsx`:
```tsx
import { RoleGuard } from "@/components/role-guard";
import { ChwDashboardContent } from "@/components/dashboard/chw/chw-dashboard-content";

export default function ChwDashboardPage() {
  return (
    <RoleGuard roles={["chw"]}>
      <ChwDashboardContent />
    </RoleGuard>
  );
}
```

- [ ] **Step 3: Type-check + lint**

Run:
```bash
pnpm exec tsc --noEmit
pnpm exec eslint src/components/dashboard/chw/chw-dashboard-content.tsx src/app/dashboard/chw/page.tsx
```
Expected: clean

---

### Task 9: Restricted CHW patient view

**Files:**
- Create: `src/components/dashboard/chw/chw-patient-view.tsx`
- Create: `src/app/dashboard/chw/patients/[id]/page.tsx`

**Interfaces:**
- Consumes: `usePatient`, `usePregnanciesForPatient` (existing); `useFollowUpAssignmentsForPatient` (Task 5); `gestationalAgeWeeks` (existing, `@/lib/patients/pregnancy`); `FOLLOW_UP_REASON_LABELS` (Task 3)

- [ ] **Step 1: Write the view**

```tsx
"use client";

import { notFound } from "next/navigation";
import { usePatient, usePregnanciesForPatient, useFollowUpAssignmentsForPatient } from "@/lib/patients/use-patients";
import { gestationalAgeWeeks } from "@/lib/patients/pregnancy";
import { fullName, getInitials } from "@/lib/format";
import { FOLLOW_UP_REASON_LABELS } from "@/lib/patients/types";

export function ChwPatientView({ patientId }: { patientId: string }) {
  const patient = usePatient(patientId);
  const pregnancies = usePregnanciesForPatient(patientId);
  const openPregnancy = pregnancies.find((p) => p.status === "open") ?? null;
  const assignments = useFollowUpAssignmentsForPatient(patientId);

  if (!patient) return notFound();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-zinc-300 bg-[#ffeedb] p-5 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xl font-semibold text-teal-800 dark:bg-teal-950 dark:text-teal-300">
          {getInitials(fullName(patient))}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{fullName(patient)}</h2>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            {patient.id} • {patient.address.village}
          </p>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{patient.phone}</p>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Pregnancy</p>
        {openPregnancy ? (
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            {gestationalAgeWeeks(openPregnancy.lmpDate)} weeks gestation • EDD {openPregnancy.eddDate}
          </p>
        ) : (
          <p className="text-sm text-zinc-400">No active pregnancy on file.</p>
        )}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">Follow-up History</p>
        {assignments.length === 0 ? (
          <p className="text-sm text-zinc-400">No follow-up assignments yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {assignments.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">{FOLLOW_UP_REASON_LABELS[a.reason]}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Assigned by {a.assignedByName} • Due {a.dueDate}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    a.status === "completed"
                      ? "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                  }`}
                >
                  {a.status === "completed" ? "Completed" : "Pending"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write the route**

Create `src/app/dashboard/chw/patients/[id]/page.tsx`:
```tsx
"use client";

import { use } from "react";
import { RoleGuard } from "@/components/role-guard";
import { ChwPatientView } from "@/components/dashboard/chw/chw-patient-view";

export default function ChwPatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RoleGuard roles={["chw"]}>
      <ChwPatientView patientId={id} />
    </RoleGuard>
  );
}
```
(Match whatever param-unwrapping convention `src/app/dashboard/nurse/patients/[id]/page.tsx` already uses — it imports `use` from `react` for this exact purpose, confirmed in that file's existing imports.)

- [ ] **Step 3: Type-check + lint**

Run:
```bash
pnpm exec tsc --noEmit
pnpm exec eslint src/components/dashboard/chw/chw-patient-view.tsx "src/app/dashboard/chw/patients/[id]/page.tsx"
```
Expected: clean

---

### Task 10: Access restrictions — sidebar, red-case alert, notification routing

**Files:**
- Modify: `src/components/dashboard/sidebar.tsx`
- Modify: `src/components/dashboard/red-case-alert.tsx`
- Modify: `src/components/dashboard/notification-panel.tsx`

- [ ] **Step 1: Sidebar active-path check**

In `src/components/dashboard/sidebar.tsx`, update the "Dashboard" active-path check:
```ts
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard" ||
                  pathname === "/dashboard/nurse" ||
                  pathname === "/dashboard/gynecologist" ||
                  pathname === "/dashboard/lab" ||
                  pathname === "/dashboard/hospital-admin" ||
                  pathname === "/dashboard/chw"
                : pathname.startsWith(item.href || "");
```
No other `NAV_ITEMS` entry gets `"chw"` added to `enabledRoles` — every existing item (Patient Registry, ANC Visits, Risk Classification, Referral Log, Reports, Staff Management, Lab Requests, Lab History) stays exactly as restricted as it is today, per the design's access-restriction section.

- [ ] **Step 2: Red case alert panel guard**

In `src/components/dashboard/red-case-alert.tsx`, replace:
```ts
  if (user?.role === "hospital_admin") return null;
```
with:
```ts
  if (user?.role === "hospital_admin" || user?.role === "chw") return null;
```
(A CHW cannot accept emergency referrals per the source spec's access-restrictions section — this is the same broadcast/accept panel already gated for `hospital_admin`.)

- [ ] **Step 3: Notification panel routing**

In `src/components/dashboard/notification-panel.tsx`, update `handleAlertClick`:
```ts
  const handleAlertClick = (type: NotificationAlert["type"], patientId: string) => {
    onClose();
    if (type === "lab_request") {
      router.push("/dashboard/lab/requests");
    } else if (type === "facility_full") {
      router.push("/dashboard/hospital-admin");
    } else if (type === "new_followup_assignment") {
      router.push(`/dashboard/chw/patients/${patientId}`);
    } else {
      router.push(`/dashboard/nurse/patients/${patientId}`);
    }
  };
```

- [ ] **Step 4: Type-check + lint**

Run:
```bash
pnpm exec tsc --noEmit
pnpm exec eslint src/components/dashboard/sidebar.tsx src/components/dashboard/red-case-alert.tsx src/components/dashboard/notification-panel.tsx
```
Expected: clean

---

### Task 11: Full build + manual verification

**Files:** none (verification only)

- [ ] **Step 1: Route smoke tests**

With the user's dev server running on port 3001:
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/dashboard/chw
```
Expected: `200`

- [ ] **Step 2: Manual end-to-end flow**

In the browser:
1. Log in as `uwase` / `nurse123` (nurse at Nyamata Health Center). Open any patient at that facility. Click Actions → "Assign Community Health Worker." Confirm the modal shows "Will be assigned to Mukamana (Rilima)," pick a reason and priority, submit.
2. Log out, log in as `mukamana` / `chw123`. Confirm the dashboard shows the new assignment under "Today's Visits," "Upcoming," or "Missed" depending on the due date chosen, and under "High Priority" if that was selected.
3. Click the assignment row. Confirm it navigates to the restricted patient view and shows only name/ID/village/phone/gestational age/EDD/follow-up history — no labs, risk badges, or visit history.
4. Confirm the sidebar shows only "Dashboard" for this account (no Patient Registry, ANC Visits, Risk Classification, Referral Log, Reports, Staff Management, Lab Requests/History).
5. Open the notification bell as `mukamana` — confirm the "New Follow-up Assignment" alert appears and clicking it navigates to the same restricted patient view.
6. Confirm no emergency/red-case broadcast panel ever appears for the `mukamana` session, even if there's a pending emergency referral elsewhere in the demo data.
7. Log in as `karenzi` / `gyn123` (gynecologist at Nyanza District Hospital) and confirm "Assign Community Health Worker" is available on a patient there too — but since Nyanza has no demo CHW, the modal should show "No Community Health Worker is available at this facility yet" instead of a broken form.

- [ ] **Step 3: Full build**

Run: `pnpm build`
Expected: clean build, no type or lint errors

---

## Self-Review Notes

- **Spec coverage:** role/login (Task 2), assignment entity + creation UI (Tasks 3, 4, 5, 6, 7), CHW dashboard with all five sections (Task 8), restricted patient view (Task 9), access restrictions including the red-case-alert gap not explicitly named in the design doc's "Access restrictions" section but required by the spec's section 10 ("cannot accept emergency referrals") — added to Task 10 with its rationale — notifications (Task 5 + 10) — all covered.
- **Explicitly deferred, matching the design doc:** conducting the visit, the digital follow-up form, marking `"completed"`, danger-sign escalation, AI-style recommendations, any picker UI for multiple CHWs.
- **Type consistency checked:** `FollowUpReason`/`FollowUpPriority`/`FollowUpStatus` defined once in `types.ts` (Task 3) and referenced by name everywhere else (Tasks 4–9) — no redefinition drift. `getCurrentUserSnapshot`'s widened return type checked against all 11 existing call sites (Task 5) — all destructure a subset, none break.
- **Blast radius of `Role` widening:** grepped `Record<Role` across `src/` directly (not just relying on compiler surfacing) and found all four sites: `ROLE_DASHBOARD_PATH`, `ROLE_LABEL`, `ROLE_OVERVIEW_COPY`, and `ROLE_PERMISSIONS` in `profile-panel.tsx` — all four are fixed in Task 2, and Task 1/2's ordering intentionally lets the compiler confirm nothing was missed at Task 2 Step 5.
