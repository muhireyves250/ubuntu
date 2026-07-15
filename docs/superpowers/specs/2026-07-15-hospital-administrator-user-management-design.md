# Hospital Administrator — User Management (Design)

## Goal

Let a Hospital Administrator register new clinical staff accounts, activate/suspend
accounts, and reset passwords — scoped to their own facility — completing the last
deferred piece of the Hospital Administrator spec. This is a localStorage-only demo
app with no backend, so "account lifecycle" is reimagined against the existing
`DEMO_USERS` + localStorage persistence pattern already used for `Referral` and
`FacilityCapacity` overrides.

## Current state (relevant code)

- `src/lib/auth/demo-users.ts` — `DEMO_USERS: DemoUser[]` is a hardcoded, compile-time
  array. `findDemoUserById`, `findDemoUserByUsername` search only this array.
- `src/lib/auth/auth-context.tsx` — `login(userId, password): boolean` looks up via
  `findDemoUserById` and compares `candidate.password` directly. Session is just the
  user's `id` in `localStorage["ubuntumed.session"]`.
- `src/app/login/page.tsx` — resolves username → user via `findDemoUserByUsername`,
  then calls `login(candidate.id, password)`.
- No existing concept of account status; all `DEMO_USERS` are implicitly always active.

## Data model & storage

Two new localStorage-backed stores, following patterns already established in this
codebase (`Referral`/`Recommendation` list-stores, and the `capacityOverrides`
blob-store used for facility capacity limits).

### `src/lib/auth/managed-staff-storage.ts`

Full CRUD list of admin-registered accounts — same shape/persistence pattern as
`Referral`: `readList`/`writeList` over a `localStorage` key, `useSyncExternalStore`-
compatible `subscribe`/`getSnapshot`/`getServerSnapshot`, plus mutators.

```ts
export interface ManagedStaffAccount {
  id: string;
  username: string;
  name: string;
  title: string;
  facility: string;
  role: "nurse" | "lab_nurse" | "gynecologist";
  facilityLevel: FacilityLevel; // copied from the registering admin's own facilityLevel
  password: string;
  status: "active" | "suspended";
  createdByAdminId: string;
  createdAt: string; // ISO timestamp
}
```

`facilityLevel` is required (not optional) because `use-patients.ts` mutators
(`createEmergencyVisit`'s routing logic) branch on it — a managed account works at the
same facility as the admin who created it, so it always carries the same level.

Storage key: `"ubuntumed.managedStaff"`.

Mutators:
- `registerStaffAccount(input: Omit<ManagedStaffAccount, "id" | "status" | "createdAt">): ManagedStaffAccount`
  — generates `id` (`staff-${crypto.randomUUID()}`), sets `status: "active"`,
  `createdAt: new Date().toISOString()`.
- `setManagedStaffStatus(id: string, status: "active" | "suspended"): void`
- `resetManagedStaffPassword(id: string, newPassword: string): void`

Reactive read hooks (same `useSyncExternalStore` pattern as `useReferrals`):
- `useManagedStaff(): ManagedStaffAccount[]`

### `src/lib/auth/staff-overrides-storage.ts`

A single blob keyed by user id, for suspending/resetting the password of the
*hardcoded* `DEMO_USERS` without touching `demo-users.ts`. Same shape/pattern as the
existing `capacityOverrides` store in `src/lib/patients/storage.ts`.

```ts
export interface StaffOverride {
  status?: "suspended"; // absence means active
  password?: string; // absence means use the hardcoded DemoUser.password
}
```

Storage key: `"ubuntumed.staffOverrides"` — `Record<string, StaffOverride>` keyed by
`DemoUser.id`.

Functions (mirroring `setCapacityOverride`/`getCapacityOverridesSnapshot` exactly):
- `setStaffOverrideStatus(userId: string, status: "active" | "suspended"): void`
  (writing `"active"` deletes the `status` key from that user's override entry)
- `setStaffOverridePassword(userId: string, password: string): void`
- `useStaffOverrides(): Record<string, StaffOverride>` (reactive hook)
- `getStaffOverridesSnapshot(): Record<string, StaffOverride>` (non-reactive, for use
  inside `auth-context.tsx`'s `login`)

### `src/lib/auth/user-directory.ts`

Unified view merging `DEMO_USERS` (hardcoded) and `ManagedStaffAccount[]` (admin-
registered), so the rest of the app has one place to resolve "any account."

```ts
export interface DirectoryUser {
  id: string;
  username: string;
  name: string;
  title: string;
  facility: string;
  role: Role;
  facilityLevel: FacilityLevel;
  status: "active" | "suspended";
  password: string; // effective password (override or record, resolved)
  source: "demo" | "managed";
}
```

- `getAllDirectoryUsers(): DirectoryUser[]` — non-reactive, reads `DEMO_USERS` +
  `getManagedStaffSnapshot()` + `getStaffOverridesSnapshot()`, resolves effective
  `status`/`password` for each `demo` entry from its override (if any).
- `findUserById(id: string): DirectoryUser | undefined`
- `findUserByUsername(username: string): DirectoryUser | undefined`
  (case-insensitive, matches existing `findDemoUserByUsername` behavior)
- `useFacilityStaff(facility: string): DirectoryUser[]` — reactive (subscribes to both
  underlying stores), returns entries where `facility === facility && role !== "hospital_admin"`.
  Excluding `hospital_admin` entirely means an admin can never see/suspend/reset another
  admin account, including their own — satisfies "cannot manage system-wide administrator
  accounts" with no extra self-lockout guard needed.
- `isUsernameTaken(username: string): boolean` — checks the full merged list,
  case-insensitive; used by the registration form before creating an account.

## Login integration

`auth-context.tsx`:
- `login(userId: string, password: string): "ok" | "invalid" | "suspended"` (replaces
  the current `boolean` return). Looks up via `findUserById`, compares the *effective*
  password, and returns `"suspended"` if the effective status is `"suspended"` — checked
  before the password comparison, so a suspended account never reveals whether the
  password was even correct.
- The `user` value derived from the stored session id now resolves via `findUserById`
  instead of `findDemoUserById`. If the effective status comes back `"suspended"`
  (e.g. an admin suspended a currently-logged-in user in another tab), `user` reads as
  `null` — the existing `RoleGuard`/login-redirect flow already handles a null user by
  bouncing to `/login`, so no new force-logout mechanism is needed.
- `AuthContextValue["login"]` type signature updates accordingly.

`src/lib/patients/use-patients.ts`:
- `getCurrentUserSnapshot()` (used by every mutator — `registerPatient`, `recordVisit`,
  `createReferral`, `getOrCreateEmergencyReferral`, etc. — to attribute `name`/
  `facility`/`facilityLevel`) currently resolves the session id via `findDemoUserById`
  only. It must resolve via the unified `findUserById` instead, otherwise an
  admin-registered account can log in but every write it makes throughout the app
  attributes to `"Unknown"` / `"Unknown facility"`. This is the one change that makes
  registered accounts actually functional beyond the login screen itself.

`login/page.tsx`:
- `findDemoUserByUsername` → `findUserByUsername` (from `user-directory.ts`).
- `handleSubmit` branches on the three `login()` return values:
  `"invalid"` → `"Incorrect password."` (unchanged copy);
  `"suspended"` → `"This account has been suspended. Contact your hospital administrator."`;
  `"ok"` → proceed to `router.replace(...)` (unchanged).

## UI — Staff Management page

New route `src/app/dashboard/hospital-admin/staff/page.tsx`, `RoleGuard roles={["hospital_admin"]}`,
rendering `StaffManagementContent`.

`src/components/dashboard/staff/staff-management-content.tsx` — page shell holding two
sections:

1. **Register New Staff** (`register-staff-form.tsx`) — inline form: username, full
   name, title, role (`<select>`: Nurse / Laboratory Nurse / Gynecologist), initial
   password. On submit: trims/validates all fields non-empty, calls `isUsernameTaken`
   and shows an inline error if so, otherwise calls `registerStaffAccount({ ...fields,
   facility: user.facility, createdByAdminId: user.id })` and clears the form.

2. **Staff table** (`staff-table.tsx`) — `useFacilityStaff(user.facility)`, one row per
   `DirectoryUser`: name, username, role label, status badge (green "Active" / gray
   "Suspended"), and two actions:
   - **Suspend / Activate** toggle button — calls `setManagedStaffStatus` (if
     `source === "managed"`) or `setStaffOverrideStatus` (if `source === "demo"`).
   - **Reset Password** — inline reveal of a password input + confirm button, calls
     `resetManagedStaffPassword` or `setStaffOverridePassword` depending on `source`.

Sidebar: new nav item `{ label: "Staff Management", icon: IconUsers, href:
"/dashboard/hospital-admin/staff", enabledRoles: ["hospital_admin"] }` added after
"Reports" in `NAV_ITEMS`.

## Out of scope

- Deleting accounts (not in the spec's verb list: register/approve/activate/suspend/
  reset password/assign roles).
- A separate "pending approval" queue — the admin registering an account *is* the
  approval step; there is no unapproved intermediate state.
- Letting an admin create or manage another `hospital_admin` account, including their
  own (see `useFacilityStaff` exclusion above).
- Any change to the `Role` union or what roles exist system-wide.
- Multi-facility administration (an admin only ever sees/manages their own
  `user.facility`, same scoping rule as the Reports slice).
