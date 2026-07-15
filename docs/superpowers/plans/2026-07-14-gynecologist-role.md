# Gynecologist Role (First Slice) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a third role, Gynecologist, hospital-scoped like nurses, who can see/accept/manage/close Red emergency referrals alongside nurses at the same facility, gets notified via the existing alert system, and gets a dashboard home page reusing the existing role-agnostic `DashboardOverview`.

**Architecture:** Widen the existing role/access/data model (already facility-scoped, not role-scoped, for patients/visits/referrals/locks) to a third role rather than building parallel systems. `RoleGuard` moves from a single-path check to an explicit role allow-list so shared pages serve multiple roles without duplication. Notifications extend the existing derived-alert system (`useNotificationAlerts`) rather than adding new persistence.

**Tech Stack:** Next.js App Router, React 19, TypeScript strict, Tailwind v4, pnpm. No test runner — verification is `pnpm exec tsc --noEmit`, `pnpm exec eslint .`, `pnpm build`, plus manual walkthrough.

## Global Constraints

- Never use `git add -A`/`git add .` — stage explicit paths only.
- Do not commit unless the user explicitly asks.
- No new persisted storage for notifications — extend the existing derived `useNotificationAlerts`.
- No new Visit/Referral fields — reuse `treatment`/`followUpPlan`/`outcome`/`outcomeStatement`.
- Verify with `pnpm exec tsc --noEmit` (ignore stale `.next/types/*` errors) and `pnpm exec eslint <changed files>` after every task; run `pnpm build` at the end.

---

### Task 1: Role type, demo user, routing, and copy

**Files:**
- Modify: `src/lib/auth/types.ts`
- Modify: `src/lib/auth/demo-users.ts`
- Modify: `src/lib/auth/role-routes.ts`
- Modify: `src/lib/dashboard/role-copy.ts`
- Modify: `src/app/login/page.tsx`
- Modify: `src/components/dashboard/profile-panel.tsx`

**Interfaces:**
- Produces: `Role = "nurse" | "lab_nurse" | "gynecologist"`, demo user id `"gynecologist-mutesi"`, `ROLE_DASHBOARD_PATH.gynecologist = "/dashboard/gynecologist"`.

- [ ] **Step 1: Widen the `Role` type**

In `src/lib/auth/types.ts`, change:
```ts
export type Role = "nurse" | "lab_nurse";
```
to:
```ts
export type Role = "nurse" | "lab_nurse" | "gynecologist";
```

- [ ] **Step 2: Add the demo Gynecologist user**

In `src/lib/auth/demo-users.ts`, add a new entry to `DEMO_USERS` (after `nurse-kagame`, same facility so co-acceptance is testable):
```ts
  {
    id: "gynecologist-mutesi",
    name: "Dr. Mutesi",
    title: "Gynecologist",
    facility: "Bugesera District Hospital",
    role: "gynecologist",
    facilityLevel: "dh",
    password: "gyn123",
  },
```

- [ ] **Step 3: Add dashboard path and label**

In `src/lib/auth/role-routes.ts`, add to both records:
```ts
export const ROLE_DASHBOARD_PATH: Record<Role, string> = {
  nurse: "/dashboard/nurse",
  lab_nurse: "/dashboard/lab",
  gynecologist: "/dashboard/gynecologist",
};

export const ROLE_LABEL: Record<Role, string> = {
  nurse: "Nurse (ANC)",
  lab_nurse: "Laboratory Nurse",
  gynecologist: "Gynecologist",
};
```

- [ ] **Step 4: Add overview copy**

In `src/lib/dashboard/role-copy.ts`, add to `ROLE_OVERVIEW_COPY`:
```ts
  gynecologist: {
    scope: "Specialist Care",
    description:
      "Emergency referrals and high-risk pregnancies at your facility appear here for specialist review.",
  },
```

- [ ] **Step 5: Add the demo user to the login page tab switcher**

In `src/app/login/page.tsx`:
```ts
const TAB_USER_IDS = ["nurse-uwase", "nurse-kagame", "lab-nurse-mugisha", "gynecologist-mutesi"] as const;
```
Add an icon branch (a simple stethoscope-style glyph is fine, matching the existing inline-SVG pattern) next to the existing `{userId === "lab-nurse-mugisha" && (...)}` block:
```tsx
                {userId === "gynecologist-mutesi" && (
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
                    <path d="M6 3v6a6 6 0 0 0 12 0V3M6 9a3 3 0 1 1-3 3M18 9a3 3 0 1 0 3 3M12 15v4m0 0a3 3 0 1 0 3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
```

- [ ] **Step 6: Add Gynecologist to the profile-panel role switcher**

In `src/components/dashboard/profile-panel.tsx`, change:
```ts
const SWITCHABLE_ROLES: Role[] = ["nurse", "lab_nurse"];
```
to:
```ts
const SWITCHABLE_ROLES: Role[] = ["nurse", "lab_nurse", "gynecologist"];
```

- [ ] **Step 7: Verify**

Run: `pnpm exec tsc --noEmit 2>&1 | grep -v ".next/types"` — expect no errors. (The only three `Record<Role, ...>` maps in the codebase are `ROLE_OVERVIEW_COPY`, `ROLE_DASHBOARD_PATH`, and `ROLE_LABEL`, all completed in Steps 3–4 above — confirmed via `grep -rn "Record<Role" src/`. `RoleGuard` call sites will still error until Task 3; that's expected and unrelated to this task.)

Run: `pnpm exec eslint src/lib/auth/types.ts src/lib/auth/demo-users.ts src/lib/auth/role-routes.ts src/lib/dashboard/role-copy.ts src/app/login/page.tsx src/components/dashboard/profile-panel.tsx`

---

### Task 2: Multi-role `RoleGuard`

**Files:**
- Modify: `src/components/role-guard.tsx`
- Modify: `src/lib/auth/role-routes.ts`

**Interfaces:**
- Consumes: `Role` from Task 1.
- Produces: `RoleGuard` accepts `roles: Role[]` instead of `path: string`. `dashboardPathForRole(role)` unchanged (still used for post-login/redirect purposes). New export `canAccessRoles(userRole, roles)` replaces `canAccessDashboardPath`.

- [ ] **Step 1: Change `RoleGuard`'s prop API**

Replace the full contents of `src/components/role-guard.tsx`:
```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { dashboardPathForRole } from "@/lib/auth/role-routes";
import type { Role } from "@/lib/auth/types";

export function RoleGuard({
  roles,
  children,
}: {
  roles: Role[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isHydrated } = useAuth();

  const isAllowed = !!user && roles.includes(user.role);

  useEffect(() => {
    if (isHydrated && user && !isAllowed) {
      router.replace(dashboardPathForRole(user.role));
    }
  }, [isHydrated, user, isAllowed, router]);

  if (!isAllowed) return null;

  return <>{children}</>;
}
```

- [ ] **Step 2: Remove the now-unused `canAccessDashboardPath` from `role-routes.ts`**

In `src/lib/auth/role-routes.ts`, delete the `canAccessDashboardPath` function (its only caller was the old `RoleGuard`). Keep `dashboardPathForRole` as-is — it's still used by `RoleGuard`'s redirect and `src/app/dashboard/page.tsx`'s index redirect.

- [ ] **Step 3: Verify**

Run: `pnpm exec tsc --noEmit 2>&1 | grep -v ".next/types"` — this will show errors at every `<RoleGuard path="...">` call site (prop no longer exists). That's expected; Task 3 fixes them all. Confirm the error is specifically about the `path` prop / missing `roles` prop, not something else.

---

### Task 3: Update every `RoleGuard` call site

**Files:**
- Modify: `src/app/dashboard/nurse/page.tsx`
- Modify: `src/app/dashboard/nurse/patients/page.tsx`
- Modify: `src/app/dashboard/nurse/patients/[id]/page.tsx`
- Modify: `src/app/dashboard/nurse/referrals/page.tsx`
- Modify: `src/app/dashboard/nurse/risk-classification/page.tsx`
- Modify: `src/app/dashboard/nurse/visits/page.tsx`
- Modify: `src/app/dashboard/nurse/alerts/page.tsx`
- Modify: `src/app/dashboard/lab/page.tsx`
- Modify: `src/app/dashboard/lab/history/page.tsx`
- Modify: `src/app/dashboard/lab/requests/page.tsx`
- Modify: `src/app/dashboard/lab/requests/[id]/page.tsx`

**Interfaces:**
- Consumes: `RoleGuard` from Task 2.

- [ ] **Step 1: Nurse-only pages keep single-role arrays**

In each of these files, replace `<RoleGuard path="/dashboard/nurse">` with `<RoleGuard roles={["nurse"]}>` (and its matching closing tag stays `</RoleGuard>`, unchanged):
- `src/app/dashboard/nurse/page.tsx`
- `src/app/dashboard/nurse/visits/page.tsx`
- `src/app/dashboard/nurse/alerts/page.tsx`

- [ ] **Step 2: Shared clinical-workflow pages become two-role**

In each of these files, replace `<RoleGuard path="/dashboard/nurse">` with `<RoleGuard roles={["nurse", "gynecologist"]}>`:
- `src/app/dashboard/nurse/patients/page.tsx`
- `src/app/dashboard/nurse/patients/[id]/page.tsx`
- `src/app/dashboard/nurse/referrals/page.tsx`
- `src/app/dashboard/nurse/risk-classification/page.tsx`

- [ ] **Step 3: Lab pages keep single-role arrays**

In each of these files, replace `<RoleGuard path="/dashboard/lab">` with `<RoleGuard roles={["lab_nurse"]}>` (confirmed via `grep -rn "RoleGuard path" src/app/dashboard/lab/` — all four files use this exact prop value):
- `src/app/dashboard/lab/page.tsx`
- `src/app/dashboard/lab/history/page.tsx`
- `src/app/dashboard/lab/requests/page.tsx`
- `src/app/dashboard/lab/requests/[id]/page.tsx`

- [ ] **Step 4: Verify**

Run: `pnpm exec tsc --noEmit 2>&1 | grep -v ".next/types"` — expect zero errors now (all `RoleGuard` call sites fixed, `Role` type complete everywhere it's used as a `Record` key — if any `Record<Role, X>` elsewhere in the codebase still errors for a missing `gynecologist` key, fix it inline here since it blocks a clean typecheck).

Run: `pnpm exec eslint src/app/dashboard/ src/components/role-guard.tsx`

---

### Task 4: Sidebar navigation and Topbar search for Gynecologist

**Files:**
- Modify: `src/components/dashboard/sidebar.tsx`
- Modify: `src/components/dashboard/topbar.tsx`

**Interfaces:**
- Consumes: `Role` from Task 1, existing `NAV_ITEMS`/`enabledRoles` pattern.

- [ ] **Step 1: Add a Gynecologist Dashboard nav item and widen shared items**

In `src/components/dashboard/sidebar.tsx`, update `NAV_ITEMS`:
```ts
const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    icon: IconGrid,
    href: "/dashboard",
  },
  {
    label: "Patient Registry",
    icon: IconUsers,
    href: "/dashboard/nurse/patients",
    enabledRoles: ["nurse", "gynecologist"],
  },
  {
    label: "ANC Visits",
    icon: IconCalendar,
    href: "/dashboard/nurse/visits",
    enabledRoles: ["nurse"],
  },
  {
    label: "Risk Classification",
    icon: IconClipboard,
    href: "/dashboard/nurse/risk-classification",
    enabledRoles: ["nurse", "gynecologist"],
  },
  {
    label: "Active Alerts",
    icon: IconAlert,
    href: "/dashboard/nurse/alerts",
    enabledRoles: ["nurse"],
  },
  {
    label: "Referral Log",
    icon: IconReport,
    href: "/dashboard/nurse/referrals",
    enabledRoles: ["nurse", "gynecologist"],
  },
  {
    label: "Lab Requests",
    icon: IconClipboard,
    href: "/dashboard/lab/requests",
    enabledRoles: ["lab_nurse"],
  },
  {
    label: "Lab History",
    icon: IconReport,
    href: "/dashboard/lab/history",
    enabledRoles: ["lab_nurse"],
  },
];
```
(No separate "Gynecologist Dashboard" nav entry is needed — the existing unconditional "Dashboard" item at `/dashboard` already redirects every role to its own home via `dashboardPathForRole`, exactly like it does for nurse/lab_nurse today.)

- [ ] **Step 2: Fix the "Dashboard" nav item's active-state highlight for the new role**

In `src/components/dashboard/sidebar.tsx`, find:
```ts
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard" || pathname === "/dashboard/nurse"
                : pathname.startsWith(item.href || "");
```
Change to also match `/dashboard/gynecologist` and `/dashboard/lab` (the latter was already silently broken the same way for lab nurses — fix both while here):
```ts
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard" ||
                  pathname === "/dashboard/nurse" ||
                  pathname === "/dashboard/gynecologist" ||
                  pathname === "/dashboard/lab"
                : pathname.startsWith(item.href || "");
```

- [ ] **Step 3: Give Gynecologists the real patient search in Topbar**

In `src/components/dashboard/topbar.tsx`, change:
```tsx
      {user.role === "nurse" ? (
        <PatientSearch />
      ) : (
```
to:
```tsx
      {user.role === "nurse" || user.role === "gynecologist" ? (
        <PatientSearch />
      ) : (
```

- [ ] **Step 4: Verify**

Run: `pnpm exec tsc --noEmit 2>&1 | grep -v ".next/types"`
Run: `pnpm exec eslint src/components/dashboard/sidebar.tsx src/components/dashboard/topbar.tsx`

---

### Task 5: Extend the notification alert system for Gynecologists

**Files:**
- Modify: `src/lib/patients/use-patients.ts`
- Modify: `src/components/dashboard/notification-panel.tsx`

**Interfaces:**
- Consumes: `useReferrals()`, `Referral` type (already has `patientId`, `urgency`, `status`, `receivingFacility`, `acceptedByFacility`, `createdAt`) — all existing, no changes.
- Produces: `NotificationAlert.type` widens to include `"referral_pending"` and `"referral_accepted"`. `useNotificationAlerts` emits these for `role === "gynecologist"`.

- [ ] **Step 1: Widen the `NotificationAlert` type**

In `src/lib/patients/use-patients.ts`, find:
```ts
export interface NotificationAlert {
  id: string; // visitId
  type: "lab_request" | "lab_completed";
```
Change the `type` field to:
```ts
  type: "lab_request" | "lab_completed" | "referral_pending" | "referral_accepted";
```

- [ ] **Step 2: Add the two new branches inside `useNotificationAlerts`**

Find `useNotificationAlerts` (around line 750). It currently loops over `visits` and pushes lab-related alerts for `role === "nurse"` / `role === "lab_nurse"`. Add a `useReferrals()` call and a second loop for `role === "gynecologist"`, alongside the existing visit loop (don't remove or restructure the existing loop — add to it):

```ts
export function useNotificationAlerts(role: string): NotificationAlert[] {
  const visits = useVisits();
  const patients = usePatients();
  const pregnancies = usePregnancies();
  const referrals = useReferrals();
  const currentUser = getCurrentUserSnapshot();

  return useMemo(() => {
    const alerts: NotificationAlert[] = [];
    const pregnancyIdMap = new Map(pregnancies.map((p) => [p.id, p]));

    for (const v of visits) {
      // ...existing lab_request / lab_completed logic, unchanged...
    }

    if (role === "gynecologist") {
      for (const referral of referrals) {
        if (referral.urgency !== "emergency") continue;
        const patient = patients.find((p) => p.id === referral.patientId);
        if (!patient) continue;
        const patientName = `${patient.firstName} ${patient.lastName}`;

        if (referral.status === "pending") {
          alerts.push({
            id: `referral-pending-${referral.id}`,
            type: "referral_pending",
            patientId: patient.id,
            patientName,
            title: "New Emergency Referral",
            message: `${referral.referredByFacility} referred ${patientName} — ${referral.reason}`,
            date: referral.createdAt.slice(0, 10),
            priority: "Emergency",
          });
        } else if (
          referral.status === "accepted" &&
          referral.acceptedByFacility === currentUser.facility &&
          referral.acceptedByNurse !== currentUser.name
        ) {
          alerts.push({
            id: `referral-accepted-${referral.id}`,
            type: "referral_accepted",
            patientId: patient.id,
            patientName,
            title: "Emergency Case Accepted",
            message: `${referral.acceptedByNurse} accepted the emergency referral for ${patientName} at your facility.`,
            date: (referral.acceptedAt ?? referral.createdAt).slice(0, 10),
            priority: "Emergency",
          });
        }
      }
    }

    return alerts;
  }, [visits, patients, pregnancies, referrals, role, currentUser.facility, currentUser.name]);
}
```

Note: `getCurrentUserSnapshot` is the existing internal helper in this file (already used elsewhere) — reuse it, don't reimplement. `useReferrals()` already filters to referrals visible to the current facility (including the pending-broadcast rule), so no extra facility filtering is needed for the `pending` branch.

- [ ] **Step 3: Route the two new alert types to the patient page**

In `src/components/dashboard/notification-panel.tsx`, find:
```ts
  const handleAlertClick = (type: "lab_request" | "lab_completed", patientId: string) => {
    onClose();
    if (type === "lab_completed") {
      router.push(`/dashboard/nurse/patients/${patientId}`);
    } else {
      router.push("/dashboard/lab/requests");
    }
  };
```
Replace with:
```ts
  const handleAlertClick = (
    type: "lab_request" | "lab_completed" | "referral_pending" | "referral_accepted",
    patientId: string,
  ) => {
    onClose();
    if (type === "lab_request") {
      router.push("/dashboard/lab/requests");
    } else {
      router.push(`/dashboard/nurse/patients/${patientId}`);
    }
  };
```

- [ ] **Step 4: Verify**

Run: `pnpm exec tsc --noEmit 2>&1 | grep -v ".next/types"`
Run: `pnpm exec eslint src/lib/patients/use-patients.ts src/components/dashboard/notification-panel.tsx`

---

### Task 6: Gynecologist dashboard route

**Files:**
- Create: `src/app/dashboard/gynecologist/page.tsx`

**Interfaces:**
- Consumes: `RoleGuard` (Task 2), `DashboardOverview` (existing, unchanged).

- [ ] **Step 1: Create the route**

```tsx
import { RoleGuard } from "@/components/role-guard";
import { DashboardOverview } from "@/components/dashboard/overview";

export default function GynecologistDashboardPage() {
  return (
    <RoleGuard roles={["gynecologist"]}>
      <DashboardOverview />
    </RoleGuard>
  );
}
```

- [ ] **Step 2: Verify**

Run: `pnpm exec tsc --noEmit 2>&1 | grep -v ".next/types"`
Run: `pnpm exec eslint src/app/dashboard/gynecologist/page.tsx`

---

### Task 7: Full verification and manual walkthrough

**Files:** none (verification only)

- [ ] **Step 1: Full typecheck, lint, build**

Run: `pnpm exec tsc --noEmit 2>&1 | grep -v ".next/types"` — expect no output.
Run: `pnpm exec eslint .` — expect no errors.
Run: `pnpm build` — expect a successful build; confirm `/dashboard/gynecologist` appears in the route list output.

- [ ] **Step 2: Manual walkthrough (dev server)**

Run `pnpm dev`, then in the browser:
1. Log in as `nurse-uwase` (Nyamata). Trigger a Red case on any patient through Signs & Symptoms → labs → Finalize Assessment confirm, so an emergency referral is created (pending, routed toward a capable facility).
2. Log out, log in as `gynecologist-mutesi` (Bugesera). Confirm: the bell shows an unread badge and the panel lists "New Emergency Referral"; `/dashboard/gynecologist` loads and shows the active red case in its stat card / active referrals list; `RedCaseAlertPanel` shows the pending case with an Accept button.
3. Accept the referral as Dr. Mutesi. Confirm the patient page opens, `ActiveReferralBanner` shows "Managed by Bugesera District Hospital · accepted by Dr. Mutesi", and a "Close this case" button is visible.
4. Log back in as `nurse-kagame` (same facility). Confirm they can also open the patient and see "Close this case" (facility-based ownership, not user-based) per the earlier session's fix.
5. Repeat from a fresh red case, but this time accept as `nurse-kagame` first. Log in as `gynecologist-mutesi` and confirm the "Emergency Case Accepted" alert appears in their bell, and they can still open the patient record (facility-scoped visibility, not blocked).
6. Close a case as the Gynecologist via `CloseReferralModal`, confirm the outcome + updated risk color persist and the patient unlocks for a new visit.

- [ ] **Step 3: Report results**

Summarize pass/fail for each walkthrough step. Do not commit unless explicitly asked.
