# Hospital Administrator — User Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a Hospital Administrator register clinical staff accounts, suspend/activate them, and reset passwords — scoped to their own facility, with accounts that actually work end-to-end (login + every app write attributes correctly).

**Architecture:** Two new localStorage-backed stores (`managed-staff-storage.ts` for admin-registered accounts, `staff-overrides-storage.ts` for status/password overrides on the hardcoded `DEMO_USERS`) merged behind a single `user-directory.ts` lookup layer. `auth-context.tsx`, `login/page.tsx`, and `use-patients.ts`'s `getCurrentUserSnapshot` are repointed at the unified lookup so both account sources behave identically everywhere in the app.

**Tech Stack:** Next.js App Router, React 19, TypeScript strict, Tailwind CSS v4, `useSyncExternalStore` over `window.localStorage` (no backend, no test runner — this repo has none per `CLAUDE.md`).

## Global Constraints

- Never `pnpm add`/`npm`/`yarn`/`bun` — this repo uses pnpm exclusively.
- No test suite exists. Verification is `pnpm exec tsc --noEmit` (ignore stale `.next/types/*` errors) + `pnpm exec eslint <changed files>` after every task, `pnpm build` at the end, and manual route/flow smoke tests via the user's own dev server on port 3001 — never start a competing dev server.
- Never mutate `DEMO_USERS` in `demo-users.ts` — hardcoded-account suspension/password-reset goes through the override store only.
- A Hospital Administrator can never see, suspend, or reset another `hospital_admin` account (including their own) — `useFacilityStaff` excludes the role entirely, by design, per the approved spec.
- Assignable roles on registration are exactly `"nurse" | "lab_nurse" | "gynecologist"` — never `"hospital_admin"`.

---

### Task 1: Managed staff store

**Files:**
- Create: `src/lib/auth/managed-staff-storage.ts`

**Interfaces:**
- Consumes: `FacilityLevel`, `Role` from `src/lib/auth/types.ts`
- Produces: `ManagedStaffAccount` type, `subscribeToManagedStaff`, `getManagedStaffSnapshot`, `getServerManagedStaffSnapshot`, `registerStaffAccount`, `setManagedStaffStatus`, `resetManagedStaffPassword` — consumed by Task 3 (`user-directory.ts`) and Task 9 (staff UI).

- [ ] **Step 1: Write the store**

```ts
import type { FacilityLevel, Role } from "./types";

export interface ManagedStaffAccount {
  id: string;
  username: string;
  name: string;
  title: string;
  facility: string;
  role: Extract<Role, "nurse" | "lab_nurse" | "gynecologist">;
  facilityLevel: FacilityLevel;
  password: string;
  status: "active" | "suspended";
  createdByAdminId: string;
  createdAt: string;
}

const MANAGED_STAFF_KEY = "ubuntumed.managedStaff";

let managedStaffCache: ManagedStaffAccount[] | null = null;
const managedStaffListeners = new Set<() => void>();

function readManagedStaffList(): ManagedStaffAccount[] {
  const raw = window.localStorage.getItem(MANAGED_STAFF_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ManagedStaffAccount[];
  } catch {
    return [];
  }
}

function writeManagedStaffList(items: ManagedStaffAccount[]) {
  window.localStorage.setItem(MANAGED_STAFF_KEY, JSON.stringify(items));
}

function loadManagedStaff(): ManagedStaffAccount[] {
  if (managedStaffCache) return managedStaffCache;
  managedStaffCache = readManagedStaffList();
  return managedStaffCache;
}

export function subscribeToManagedStaff(onChange: () => void) {
  managedStaffListeners.add(onChange);
  return () => managedStaffListeners.delete(onChange);
}

export function getManagedStaffSnapshot(): ManagedStaffAccount[] {
  return loadManagedStaff();
}

export function getServerManagedStaffSnapshot(): ManagedStaffAccount[] {
  return [];
}

export function registerStaffAccount(
  input: Omit<ManagedStaffAccount, "id" | "status" | "createdAt">,
): ManagedStaffAccount {
  const account: ManagedStaffAccount = {
    ...input,
    id: `staff-${crypto.randomUUID()}`,
    status: "active",
    createdAt: new Date().toISOString(),
  };
  managedStaffCache = [...loadManagedStaff(), account];
  writeManagedStaffList(managedStaffCache);
  managedStaffListeners.forEach((listener) => listener());
  return account;
}

export function setManagedStaffStatus(id: string, status: "active" | "suspended") {
  managedStaffCache = loadManagedStaff().map((s) =>
    s.id === id ? { ...s, status } : s,
  );
  writeManagedStaffList(managedStaffCache);
  managedStaffListeners.forEach((listener) => listener());
}

export function resetManagedStaffPassword(id: string, newPassword: string) {
  managedStaffCache = loadManagedStaff().map((s) =>
    s.id === id ? { ...s, password: newPassword } : s,
  );
  writeManagedStaffList(managedStaffCache);
  managedStaffListeners.forEach((listener) => listener());
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit` (ignore any pre-existing stale `.next/types/*` errors)
Expected: no new errors from `managed-staff-storage.ts`

- [ ] **Step 3: Lint**

Run: `pnpm exec eslint src/lib/auth/managed-staff-storage.ts`
Expected: clean

---

### Task 2: Staff override store (for hardcoded `DEMO_USERS`)

**Files:**
- Create: `src/lib/auth/staff-overrides-storage.ts`

**Interfaces:**
- Consumes: nothing beyond `window.localStorage`
- Produces: `StaffOverride` type, `subscribeToStaffOverrides`, `getStaffOverridesSnapshot`, `getServerStaffOverridesSnapshot`, `setStaffOverrideStatus`, `setStaffOverridePassword` — consumed by Task 3 and Task 9.

- [ ] **Step 1: Write the store**

```ts
export interface StaffOverride {
  status?: "suspended";
  password?: string;
}

const STAFF_OVERRIDES_KEY = "ubuntumed.staffOverrides";

let staffOverridesCache: Record<string, StaffOverride> | null = null;
const staffOverrideListeners = new Set<() => void>();

function loadStaffOverrides(): Record<string, StaffOverride> {
  if (staffOverridesCache) return staffOverridesCache;
  const raw = window.localStorage.getItem(STAFF_OVERRIDES_KEY);
  try {
    staffOverridesCache = raw ? (JSON.parse(raw) as Record<string, StaffOverride>) : {};
  } catch {
    staffOverridesCache = {};
  }
  return staffOverridesCache;
}

export function subscribeToStaffOverrides(onChange: () => void) {
  staffOverrideListeners.add(onChange);
  return () => staffOverrideListeners.delete(onChange);
}

export function getStaffOverridesSnapshot(): Record<string, StaffOverride> {
  return loadStaffOverrides();
}

export function getServerStaffOverridesSnapshot(): Record<string, StaffOverride> {
  return {};
}

export function setStaffOverrideStatus(userId: string, status: "active" | "suspended") {
  const current = loadStaffOverrides();
  const existing = current[userId] ?? {};
  const nextEntry: StaffOverride = { ...existing };
  if (status === "suspended") {
    nextEntry.status = "suspended";
  } else {
    delete nextEntry.status;
  }
  staffOverridesCache = { ...current, [userId]: nextEntry };
  window.localStorage.setItem(STAFF_OVERRIDES_KEY, JSON.stringify(staffOverridesCache));
  staffOverrideListeners.forEach((listener) => listener());
}

export function setStaffOverridePassword(userId: string, password: string) {
  const current = loadStaffOverrides();
  const existing = current[userId] ?? {};
  staffOverridesCache = { ...current, [userId]: { ...existing, password } };
  window.localStorage.setItem(STAFF_OVERRIDES_KEY, JSON.stringify(staffOverridesCache));
  staffOverrideListeners.forEach((listener) => listener());
}
```

- [ ] **Step 2: Type-check + lint**

Run: `pnpm exec tsc --noEmit && pnpm exec eslint src/lib/auth/staff-overrides-storage.ts`
Expected: clean

---

### Task 3: Unified user directory

**Files:**
- Create: `src/lib/auth/user-directory.ts`

**Interfaces:**
- Consumes: `DEMO_USERS` from `./demo-users`; `DemoUser`, `Role`, `FacilityLevel` from `./types`; everything exported by Task 1 and Task 2.
- Produces: `DirectoryUser` type, `getAllDirectoryUsers`, `findUserById`, `findUserByUsername`, `isUsernameTaken`, `useFacilityStaff(facility)` — consumed by Task 4 (`auth-context.tsx`), Task 5 (`login/page.tsx`), Task 6 (`use-patients.ts`), Task 9 (staff UI).

- [ ] **Step 1: Write the directory**

```ts
"use client";

import { useMemo, useSyncExternalStore } from "react";
import { DEMO_USERS } from "./demo-users";
import type { DemoUser, Role, FacilityLevel } from "./types";
import {
  subscribeToManagedStaff,
  getManagedStaffSnapshot,
  getServerManagedStaffSnapshot,
  type ManagedStaffAccount,
} from "./managed-staff-storage";
import {
  subscribeToStaffOverrides,
  getStaffOverridesSnapshot,
  getServerStaffOverridesSnapshot,
  type StaffOverride,
} from "./staff-overrides-storage";

export interface DirectoryUser {
  id: string;
  username: string;
  name: string;
  title: string;
  facility: string;
  role: Role;
  facilityLevel: FacilityLevel;
  status: "active" | "suspended";
  password: string;
  source: "demo" | "managed";
}

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
    role: user.role,
    facilityLevel: user.facilityLevel,
    status: override?.status === "suspended" ? "suspended" : "active",
    password: override?.password ?? user.password,
    source: "demo",
  };
}

function managedStaffToDirectoryUser(account: ManagedStaffAccount): DirectoryUser {
  return {
    id: account.id,
    username: account.username,
    name: account.name,
    title: account.title,
    facility: account.facility,
    role: account.role,
    facilityLevel: account.facilityLevel,
    status: account.status,
    password: account.password,
    source: "managed",
  };
}

export function getAllDirectoryUsers(): DirectoryUser[] {
  const overrides = getStaffOverridesSnapshot();
  const demoUsers = DEMO_USERS.map((u) => demoUserToDirectoryUser(u, overrides));
  const managedUsers = getManagedStaffSnapshot().map(managedStaffToDirectoryUser);
  return [...demoUsers, ...managedUsers];
}

export function findUserById(id: string): DirectoryUser | undefined {
  return getAllDirectoryUsers().find((u) => u.id === id);
}

export function findUserByUsername(username: string): DirectoryUser | undefined {
  const normalized = username.trim().toLowerCase();
  return getAllDirectoryUsers().find((u) => u.username.toLowerCase() === normalized);
}

export function isUsernameTaken(username: string): boolean {
  return findUserByUsername(username) !== undefined;
}

// Excludes hospital_admin entirely — an admin can never see, suspend, or
// reset another admin account (including their own) through this view.
export function useFacilityStaff(facility: string): DirectoryUser[] {
  const overrides = useSyncExternalStore(
    subscribeToStaffOverrides,
    getStaffOverridesSnapshot,
    getServerStaffOverridesSnapshot,
  );
  const managedStaff = useSyncExternalStore(
    subscribeToManagedStaff,
    getManagedStaffSnapshot,
    getServerManagedStaffSnapshot,
  );
  return useMemo(() => {
    const demoUsers = DEMO_USERS.map((u) => demoUserToDirectoryUser(u, overrides));
    const managedUsers = managedStaff.map(managedStaffToDirectoryUser);
    return [...demoUsers, ...managedUsers].filter(
      (u) => u.facility === facility && u.role !== "hospital_admin",
    );
  }, [overrides, managedStaff, facility]);
}
```

- [ ] **Step 2: Type-check + lint**

Run: `pnpm exec tsc --noEmit && pnpm exec eslint src/lib/auth/user-directory.ts`
Expected: clean

---

### Task 4: Repoint `auth-context.tsx` at the unified directory

**Files:**
- Modify: `src/lib/auth/auth-context.tsx`

**Interfaces:**
- Consumes: `findUserById`, `DirectoryUser` from `./user-directory` (Task 3)
- Produces: `AuthContextValue.user: DirectoryUser | null`, `AuthContextValue.login: (userId: string, password: string) => "ok" | "invalid" | "suspended"` — consumed by every component calling `useAuth()` (structurally compatible with existing `DemoUser`-shaped usages, no other files need changes for this alone) and directly by Task 5.

- [ ] **Step 1: Update imports and types**

In `src/lib/auth/auth-context.tsx`, replace:

```ts
import { DEMO_USERS, findDemoUserById, findDemoUserByRole } from "./demo-users";
import type { DemoUser, Role } from "./types";
```

with:

```ts
import { DEMO_USERS, findDemoUserByRole } from "./demo-users";
import { findUserById, type DirectoryUser } from "./user-directory";
import type { Role } from "./types";
```

- [ ] **Step 2: Update `AuthContextValue` and `user` derivation**

Replace:

```ts
interface AuthContextValue {
  user: DemoUser | null;
  isHydrated: boolean;
  login: (userId: string, password: string) => boolean;
  logout: () => void;
  switchRole: (role: Role) => void;
}
```

with:

```ts
interface AuthContextValue {
  user: DirectoryUser | null;
  isHydrated: boolean;
  login: (userId: string, password: string) => "ok" | "invalid" | "suspended";
  logout: () => void;
  switchRole: (role: Role) => void;
}
```

Replace:

```ts
  const user = useMemo(
    () => (sessionUserId ? findDemoUserById(sessionUserId) ?? null : null),
    [sessionUserId],
  );
```

with:

```ts
  const user = useMemo(() => {
    if (!sessionUserId) return null;
    const candidate = findUserById(sessionUserId);
    if (!candidate || candidate.status === "suspended") return null;
    return candidate;
  }, [sessionUserId]);
```

- [ ] **Step 3: Update `login`**

Replace:

```ts
  const login = useCallback((userId: string, password: string) => {
    const candidate = findDemoUserById(userId);
    if (!candidate || candidate.password !== password) return false;
    window.localStorage.setItem(SESSION_STORAGE_KEY, candidate.id);
    emitSessionChange();
    return true;
  }, []);
```

with:

```ts
  const login = useCallback((userId: string, password: string): "ok" | "invalid" | "suspended" => {
    const candidate = findUserById(userId);
    if (!candidate) return "invalid";
    if (candidate.status === "suspended") return "suspended";
    if (candidate.password !== password) return "invalid";
    window.localStorage.setItem(SESSION_STORAGE_KEY, candidate.id);
    emitSessionChange();
    return "ok";
  }, []);
```

- [ ] **Step 4: Type-check + lint**

Run: `pnpm exec tsc --noEmit && pnpm exec eslint src/lib/auth/auth-context.tsx`
Expected: errors will surface in `login/page.tsx` (Task 5 fixes it — expected at this point) and nowhere else. If any other file errors, stop and report before continuing.

---

### Task 5: Update the login page for the new `login()` contract

**Files:**
- Modify: `src/app/login/page.tsx`

**Interfaces:**
- Consumes: `findUserByUsername` from `@/lib/auth/user-directory` (Task 3), `login()`'s new three-way return (Task 4)

- [ ] **Step 1: Swap the lookup import**

Replace:

```ts
import { DEMO_USERS, findDemoUserByUsername } from "@/lib/auth/demo-users";
```

with:

```ts
import { DEMO_USERS } from "@/lib/auth/demo-users";
import { findUserByUsername } from "@/lib/auth/user-directory";
```

- [ ] **Step 2: Update `handleSubmit`**

Replace:

```ts
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const candidate = findDemoUserByUsername(username);
    if (!candidate || candidate.role !== selectedRole) {
      setError(`No ${ROLE_TABS.find((t) => t.role === selectedRole)?.label} account found for that username.`);
      return;
    }
    const success = login(candidate.id, password);
    if (!success) {
      setError("Incorrect password.");
      return;
    }
    router.replace(dashboardPathForRole(candidate.role));
  }
```

with:

```ts
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const candidate = findUserByUsername(username);
    if (!candidate || candidate.role !== selectedRole) {
      setError(`No ${ROLE_TABS.find((t) => t.role === selectedRole)?.label} account found for that username.`);
      return;
    }
    const result = login(candidate.id, password);
    if (result === "invalid") {
      setError("Incorrect password.");
      return;
    }
    if (result === "suspended") {
      setError("This account has been suspended. Contact your hospital administrator.");
      return;
    }
    router.replace(dashboardPathForRole(candidate.role));
  }
```

- [ ] **Step 3: Type-check + lint**

Run: `pnpm exec tsc --noEmit && pnpm exec eslint src/app/login/page.tsx`
Expected: clean (this resolves the errors expected at the end of Task 4)

- [ ] **Step 4: Manual smoke test — existing demo logins still work**

With the user's dev server running on port 3001: log in as `niyibizi` / `admin123`
(Hospital Administrator) in the browser. Confirm it lands on
`/dashboard/hospital-admin`. This confirms the hardcoded-account path through the new
directory still works before building anything new on top of it.

---

### Task 6: Repoint mutator attribution at the unified directory

**Files:**
- Modify: `src/lib/patients/use-patients.ts`

**Interfaces:**
- Consumes: `findUserById` from `@/lib/auth/user-directory` (Task 3)

This is the change that makes admin-registered accounts actually functional beyond
the login screen — every mutator (`registerPatient`, `recordVisit`, `createReferral`,
`getOrCreateEmergencyReferral`, etc.) reads `getCurrentUserSnapshot()` to attribute
`name`/`facility`/`facilityLevel`. Today it only resolves hardcoded `DEMO_USERS`.

- [ ] **Step 1: Swap the import**

Replace:

```ts
import { findDemoUserById } from "../auth/demo-users";
```

with:

```ts
import { findUserById } from "../auth/user-directory";
```

- [ ] **Step 2: Update `getCurrentUserSnapshot`**

Replace:

```ts
function getCurrentUserSnapshot(): { name: string; facility: string; facilityLevel: string } {
  const sessionUserId =
    typeof window !== "undefined"
      ? window.localStorage.getItem(SESSION_STORAGE_KEY)
      : null;
  const user = sessionUserId ? findDemoUserById(sessionUserId) : null;
  return {
    name: user?.name ?? "Unknown",
    facility: user?.facility ?? "Unknown facility",
    facilityLevel: user?.facilityLevel ?? "hc",
  };
}
```

with:

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

- [ ] **Step 3: Type-check + lint**

Run: `pnpm exec tsc --noEmit && pnpm exec eslint src/lib/patients/use-patients.ts`
Expected: clean

---

### Task 7: Repoint the lab-nurse pages' inline session readers

**Files:**
- Modify: `src/app/dashboard/lab/page.tsx`
- Modify: `src/app/dashboard/lab/requests/page.tsx`
- Modify: `src/app/dashboard/lab/history/page.tsx`
- Modify: `src/app/dashboard/lab/requests/[id]/page.tsx`

**Interfaces:**
- Consumes: `findUserById`, `DirectoryUser` from `@/lib/auth/user-directory` (Task 3)

Each of these four files has its own inline `readSessionUser()` helper (independent
of `auth-context.tsx` and `use-patients.ts`) that resolves the session id via
`findDemoUserById` and types the result as `DemoUser | null`. Left unfixed, an
admin-registered Laboratory Nurse would see "Lab Nurse" / empty facility on every one
of these pages instead of their real name and facility, even though Tasks 4–6 already
fixed login and mutator attribution elsewhere (Task 7 closes the remaining gap). `DirectoryUser` is a structural
superset of `DemoUser`, so this is a mechanical swap.

- [ ] **Step 1: `src/app/dashboard/lab/page.tsx`**

Replace:
```ts
import { findDemoUserById } from "@/lib/auth/demo-users";
```
with:
```ts
import { findUserById } from "@/lib/auth/user-directory";
```
Replace:
```ts
function readSessionUser() {
  if (typeof window === "undefined") return null;
  const sessionUserId = window.localStorage.getItem("ubuntumed.session");
  return sessionUserId ? findDemoUserById(sessionUserId) : null;
}
```
with:
```ts
function readSessionUser() {
  if (typeof window === "undefined") return null;
  const sessionUserId = window.localStorage.getItem("ubuntumed.session");
  return sessionUserId ? findUserById(sessionUserId) ?? null : null;
}
```

- [ ] **Step 2: `src/app/dashboard/lab/requests/page.tsx`**

Same two replacements as Step 1 (identical `findDemoUserById` import and
`readSessionUser` body in this file).

- [ ] **Step 3: `src/app/dashboard/lab/history/page.tsx`**

Replace:
```ts
import { findDemoUserById } from "@/lib/auth/demo-users";
import { IconSearch, IconReport } from "@/components/dashboard/icons";
import Link from "next/link";
import { relativeTime, getInitials } from "@/lib/format";
import type { DemoUser } from "@/lib/auth/types";

function readSessionUser(): DemoUser | null {
  if (typeof window === "undefined") return null;
  const sessionUserId = window.localStorage.getItem("ubuntumed.session");
  return sessionUserId ? findDemoUserById(sessionUserId) ?? null : null;
}
```
with:
```ts
import { findUserById, type DirectoryUser } from "@/lib/auth/user-directory";
import { IconSearch, IconReport } from "@/components/dashboard/icons";
import Link from "next/link";
import { relativeTime, getInitials } from "@/lib/format";

function readSessionUser(): DirectoryUser | null {
  if (typeof window === "undefined") return null;
  const sessionUserId = window.localStorage.getItem("ubuntumed.session");
  return sessionUserId ? findUserById(sessionUserId) ?? null : null;
}
```

- [ ] **Step 4: `src/app/dashboard/lab/requests/[id]/page.tsx`**

Replace:
```ts
import type { DemoUser } from "@/lib/auth/types";
import { findDemoUserById } from "@/lib/auth/demo-users";
import { CriticalAlertModal } from "@/components/dashboard/critical-alert-modal";
import Link from "next/link";

function readSessionUser(): DemoUser | null {
  if (typeof window === "undefined") return null;
  const sessionUserId = window.localStorage.getItem("ubuntumed.session");
  return sessionUserId ? findDemoUserById(sessionUserId) ?? null : null;
}
```
with:
```ts
import { findUserById, type DirectoryUser } from "@/lib/auth/user-directory";
import { CriticalAlertModal } from "@/components/dashboard/critical-alert-modal";
import Link from "next/link";

function readSessionUser(): DirectoryUser | null {
  if (typeof window === "undefined") return null;
  const sessionUserId = window.localStorage.getItem("ubuntumed.session");
  return sessionUserId ? findUserById(sessionUserId) ?? null : null;
}
```

- [ ] **Step 5: Type-check + lint**

Run:
```bash
pnpm exec tsc --noEmit
pnpm exec eslint src/app/dashboard/lab/page.tsx src/app/dashboard/lab/requests/page.tsx src/app/dashboard/lab/history/page.tsx "src/app/dashboard/lab/requests/[id]/page.tsx"
```
Expected: clean

---

### Task 8: Sidebar nav item

**Files:**
- Modify: `src/components/dashboard/sidebar.tsx`

- [ ] **Step 1: Add the nav item**

In `NAV_ITEMS`, insert immediately after the `"Reports"` entry:

```ts
  {
    label: "Staff Management",
    icon: IconUsers,
    href: "/dashboard/hospital-admin/staff",
    enabledRoles: ["hospital_admin"],
  },
```

(`IconUsers` is already imported at the top of this file for the "Patient Registry" item.)

- [ ] **Step 2: Type-check + lint**

Run: `pnpm exec tsc --noEmit && pnpm exec eslint src/components/dashboard/sidebar.tsx`
Expected: clean

---

### Task 9: Staff Management page and components

**Files:**
- Create: `src/components/dashboard/staff/register-staff-form.tsx`
- Create: `src/components/dashboard/staff/staff-table.tsx`
- Create: `src/components/dashboard/staff/staff-management-content.tsx`
- Create: `src/app/dashboard/hospital-admin/staff/page.tsx`

**Interfaces:**
- Consumes: `useAuth` from `@/lib/auth/auth-context`; `registerStaffAccount` (Task 1); `setManagedStaffStatus`, `resetManagedStaffPassword` (Task 1); `setStaffOverrideStatus`, `setStaffOverridePassword` (Task 2); `useFacilityStaff`, `isUsernameTaken`, `DirectoryUser` (Task 3); `ROLE_LABEL` from `@/lib/auth/role-routes`; `RoleGuard` from `@/components/role-guard`.

- [ ] **Step 1: Write the registration form**

Create `src/components/dashboard/staff/register-staff-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { registerStaffAccount } from "@/lib/auth/managed-staff-storage";
import { isUsernameTaken } from "@/lib/auth/user-directory";
import type { Role } from "@/lib/auth/types";

type AssignableRole = Extract<Role, "nurse" | "lab_nurse" | "gynecologist">;

const ASSIGNABLE_ROLES: { value: AssignableRole; label: string }[] = [
  { value: "nurse", label: "Nurse (ANC)" },
  { value: "lab_nurse", label: "Laboratory Nurse" },
  { value: "gynecologist", label: "Gynecologist" },
];

export function RegisterStaffForm() {
  const { user } = useAuth();
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [role, setRole] = useState<AssignableRole>("nurse");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!user) return null;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedUsername = username.trim();
    const trimmedName = name.trim();
    const trimmedTitle = title.trim();

    if (!trimmedUsername || !trimmedName || !trimmedTitle || !password) {
      setError("All fields are required.");
      return;
    }
    if (isUsernameTaken(trimmedUsername)) {
      setError(`Username "${trimmedUsername}" is already in use.`);
      return;
    }

    registerStaffAccount({
      username: trimmedUsername,
      name: trimmedName,
      title: trimmedTitle,
      facility: user.facility,
      role,
      facilityLevel: user.facilityLevel,
      password,
      createdByAdminId: user.id,
    });

    setUsername("");
    setName("");
    setTitle("");
    setPassword("");
    setRole("nurse");
    setSuccess(`Account created for ${trimmedName}.`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Register New Staff</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Username
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Full Name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Title
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. In charge of ANC"
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Role
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as AssignableRole)}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          >
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 sm:col-span-2">
          Initial Password
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>
      </div>
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-700 dark:bg-teal-950/40 dark:text-teal-400">
          {success}
        </p>
      )}
      <button
        type="submit"
        className="self-start rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-600"
      >
        Register Staff
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Write the staff table**

Create `src/components/dashboard/staff/staff-table.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { useFacilityStaff, type DirectoryUser } from "@/lib/auth/user-directory";
import { setManagedStaffStatus, resetManagedStaffPassword } from "@/lib/auth/managed-staff-storage";
import { setStaffOverrideStatus, setStaffOverridePassword } from "@/lib/auth/staff-overrides-storage";
import { ROLE_LABEL } from "@/lib/auth/role-routes";

function setStaffStatus(staffUser: DirectoryUser, status: "active" | "suspended") {
  if (staffUser.source === "managed") {
    setManagedStaffStatus(staffUser.id, status);
  } else {
    setStaffOverrideStatus(staffUser.id, status);
  }
}

function resetStaffPassword(staffUser: DirectoryUser, newPassword: string) {
  if (staffUser.source === "managed") {
    resetManagedStaffPassword(staffUser.id, newPassword);
  } else {
    setStaffOverridePassword(staffUser.id, newPassword);
  }
}

function StaffRow({ staffUser }: { staffUser: DirectoryUser }) {
  const [resetting, setResetting] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  return (
    <tr className="border-t border-zinc-200 dark:border-zinc-800">
      <td className="px-4 py-3">
        <p className="font-medium text-zinc-900 dark:text-zinc-50">{staffUser.name}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">@{staffUser.username}</p>
      </td>
      <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-300">{ROLE_LABEL[staffUser.role]}</td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
            staffUser.status === "active"
              ? "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400"
              : "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
          }`}
        >
          {staffUser.status === "active" ? "Active" : "Suspended"}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setStaffStatus(staffUser, staffUser.status === "active" ? "suspended" : "active")}
            className="rounded-md border border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {staffUser.status === "active" ? "Suspend" : "Activate"}
          </button>
          {resetting ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                className="w-32 rounded-md border border-zinc-300 px-2 py-1.5 text-xs outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-950"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newPassword) return;
                  resetStaffPassword(staffUser, newPassword);
                  setNewPassword("");
                  setResetting(false);
                }}
                className="rounded-md bg-teal-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-600"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setResetting(false);
                  setNewPassword("");
                }}
                className="rounded-md px-2 py-1.5 text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setResetting(true)}
              className="rounded-md border border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Reset Password
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export function StaffTable() {
  const { user } = useAuth();
  const staff = useFacilityStaff(user?.facility ?? "");

  if (!user) return null;

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-zinc-200 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:border-zinc-800">
            <th className="px-4 py-3">Staff</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {staff.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-sm text-zinc-400">
                No staff registered at your facility yet.
              </td>
            </tr>
          ) : (
            staff.map((s) => <StaffRow key={s.id} staffUser={s} />)
          )}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Write the page shell**

Create `src/components/dashboard/staff/staff-management-content.tsx`:

```tsx
"use client";

import { RegisterStaffForm } from "./register-staff-form";
import { StaffTable } from "./staff-table";

export function StaffManagementContent() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Staff Management</h1>
      <RegisterStaffForm />
      <StaffTable />
    </div>
  );
}
```

- [ ] **Step 4: Write the route**

Create `src/app/dashboard/hospital-admin/staff/page.tsx`:

```tsx
import { RoleGuard } from "@/components/role-guard";
import { StaffManagementContent } from "@/components/dashboard/staff/staff-management-content";

export default function HospitalAdminStaffPage() {
  return (
    <RoleGuard roles={["hospital_admin"]}>
      <StaffManagementContent />
    </RoleGuard>
  );
}
```

- [ ] **Step 5: Type-check + lint**

Run:
```bash
pnpm exec tsc --noEmit
pnpm exec eslint src/components/dashboard/staff/register-staff-form.tsx src/components/dashboard/staff/staff-table.tsx src/components/dashboard/staff/staff-management-content.tsx src/app/dashboard/hospital-admin/staff/page.tsx
```
Expected: clean

---

### Task 10: Full-flow manual verification + build

**Files:** none (verification only)

- [ ] **Step 1: Route smoke test**

With the user's dev server running on port 3001:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/dashboard/hospital-admin/staff
```
Expected: `200`

- [ ] **Step 2: Manual end-to-end flow**

In the browser, logged in as `niyibizi` / `admin123`:
1. Open "Staff Management" from the sidebar.
2. Register a new Nurse: username `testnurse1`, name "Test Nurse", title "ANC Nurse", password `test123`. Confirm the success message and that the new row appears in the table with an "Active" badge.
3. Log out, log back in on the "In charge of ANC" tab as `testnurse1` / `test123`. Confirm it lands on `/dashboard/nurse` and the sidebar/profile show "Test Nurse" and "Bugesera District Hospital" (not "Unknown").
4. Register a patient or log a visit as this nurse; confirm it's attributed to "Test Nurse" (not "Unknown") — this verifies Task 6's `getCurrentUserSnapshot` fix.
5. Log out, log back in as `niyibizi`. On the staff table, click "Suspend" on Test Nurse.
6. Attempt to log in as `testnurse1` / `test123` again. Confirm the login is rejected with "This account has been suspended. Contact your hospital administrator."
7. As `niyibizi`, click "Activate" on Test Nurse, then confirm `testnurse1` can log in again.
8. As `niyibizi`, click "Suspend" then "Reset Password" on the hardcoded nurse `kagame` (same facility). Confirm `kagame` / `nurse123` is rejected as suspended, then "Activate" it and confirm the new password works and the old `nurse123` does not.

- [ ] **Step 3: Full build**

Run: `pnpm build`
Expected: clean build, no type or lint errors

---

## Self-Review Notes

- **Spec coverage:** register (Task 9), activate/suspend (Task 9 + Tasks 1/2 mutators), reset password (Task 9 + Tasks 1/2 mutators), assign roles (Task 9 form, restricted to the three clinical roles), facility scoping (Task 3's `useFacilityStaff` filter), functional login and attribution for registered accounts across the whole app (Tasks 3–7, including the four lab-nurse pages Task 7 covers) — all covered.
- **Excluded by design and explicitly called out:** account deletion, a separate approval queue, admin-managing-admin — matches the approved spec's "Out of scope" section.
- **Type consistency checked:** `ManagedStaffAccount.role` / `AssignableRole` / `DirectoryUser.role` all trace back to the same `Extract<Role, "nurse" | "lab_nurse" | "gynecologist">` (Task 1) or the full `Role` (Task 3's `DirectoryUser`, since it also represents `DEMO_USERS` entries which can be any role — filtered down to non-admin at the `useFacilityStaff` call site, not the type level).
- **`login()` signature change blast radius:** grepped for other callers — only `login/page.tsx` (Task 5) calls `login()` in this codebase. Separately grepped for `findDemoUserById` (the function `user-directory.ts` supersedes) and found 4 more call sites beyond `auth-context.tsx` and `use-patients.ts` — the lab-nurse pages now covered by Task 7 — so this is the full list.
