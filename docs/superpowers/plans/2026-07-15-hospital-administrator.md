# Hospital Administrator (Slice 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Hospital Administrator role with a read-only oversight dashboard, admin-editable emergency capacity (replacing the hardcoded value from the capacity slice), and read-only patient record access — while positively preventing any clinical write action, especially accepting emergency referrals.

**Architecture:** Same patterns as the Gynecologist and capacity slices: widen `Role`, widen `RoleGuard` on shared pages, reuse `DashboardOverview`, add one new persisted store (capacity overrides, same shape as `Referral`/`Recommendation`) and extend `useFacilityCapacity` to read it first.

**Tech Stack:** Next.js App Router, React 19, TypeScript strict, Tailwind v4, pnpm. No test runner — verify with `pnpm exec tsc --noEmit`, `pnpm exec eslint .`, `pnpm build`, plus manual walkthrough.

## Global Constraints

- Never use `git add -A`/`git add .` — stage explicit paths only.
- Do not commit unless the user explicitly asks.
- No Reports pages, no User Management — separate later slices.
- No multi-factor capacity fields (ICU/HDU/theatre/blood bank/NICU) — still the single `maxActiveRedCases` number, just now overridable.
- Verify with `pnpm exec tsc --noEmit` (ignore stale `.next/types/*`) and `pnpm exec eslint <changed files>` after every task; `pnpm build` at the end.

---

### Task 1: Role, demo user, routing, and copy

**Files:**
- Modify: `src/lib/auth/types.ts`
- Modify: `src/lib/auth/demo-users.ts`
- Modify: `src/lib/auth/role-routes.ts`
- Modify: `src/lib/dashboard/role-copy.ts`
- Modify: `src/app/login/page.tsx`
- Modify: `src/components/dashboard/profile-panel.tsx`

**Interfaces:**
- Produces: `Role` includes `"hospital_admin"`; demo user `hospital-admin-niyibizi`; `ROLE_DASHBOARD_PATH.hospital_admin = "/dashboard/hospital-admin"`.

- [ ] **Step 1: Widen `Role`**

In `src/lib/auth/types.ts`:
```ts
export type Role = "nurse" | "lab_nurse" | "gynecologist" | "hospital_admin";
```

- [ ] **Step 2: Add the demo user**

In `src/lib/auth/demo-users.ts`, add to `DEMO_USERS` (after the gynecologist entry):
```ts
  {
    id: "hospital-admin-niyibizi",
    username: "niyibizi",
    name: "Dr. Niyibizi",
    title: "Hospital Administrator",
    facility: "Bugesera District Hospital",
    role: "hospital_admin",
    facilityLevel: "dh",
    password: "admin123",
  },
```

- [ ] **Step 3: Dashboard path and label**

In `src/lib/auth/role-routes.ts`:
```ts
export const ROLE_DASHBOARD_PATH: Record<Role, string> = {
  nurse: "/dashboard/nurse",
  lab_nurse: "/dashboard/lab",
  gynecologist: "/dashboard/gynecologist",
  hospital_admin: "/dashboard/hospital-admin",
};

export const ROLE_LABEL: Record<Role, string> = {
  nurse: "Nurse (ANC)",
  lab_nurse: "Laboratory Nurse",
  gynecologist: "Gynecologist",
  hospital_admin: "Hospital Administrator",
};
```

- [ ] **Step 4: Overview copy**

In `src/lib/dashboard/role-copy.ts`, add to `ROLE_OVERVIEW_COPY`:
```ts
  hospital_admin: {
    scope: "Hospital Operations",
    description:
      "Monitor performance, configure emergency capacity, and review records for your facility — read-only for clinical data.",
  },
```

- [ ] **Step 5: Login page role tab**

In `src/app/login/page.tsx`, add to `ROLE_TABS`:
```ts
const ROLE_TABS: { role: Role; label: string }[] = [
  { role: "nurse", label: "In charge of ANC" },
  { role: "lab_nurse", label: "Laboratory Nurse" },
  { role: "gynecologist", label: "Gynecologist" },
  { role: "hospital_admin", label: "Hospital Administrator" },
];
```
`RoleIcon` currently falls through to the gynecologist icon for anything that isn't `"nurse"`/`"lab_nurse"` — give `hospital_admin` its own branch so it doesn't inherit the wrong icon. Change:
```tsx
  if (role === "lab_nurse") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M9 2v6.5L4.5 17a2 2 0 0 0 1.8 3h11.4a2 2 0 0 0 1.8-3L15 8.5V2M9 2h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M6 3v6a6 6 0 0 0 12 0V3M6 9a3 3 0 1 1-3 3M18 9a3 3 0 1 0 3 3M12 15v4m0 0a3 3 0 1 0 3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
```
to:
```tsx
  if (role === "lab_nurse") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M9 2v6.5L4.5 17a2 2 0 0 0 1.8 3h11.4a2 2 0 0 0 1.8-3L15 8.5V2M9 2h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (role === "hospital_admin") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M4 21V9l8-5 8 5v12M4 21h16M9 21v-6h6v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M6 3v6a6 6 0 0 0 12 0V3M6 9a3 3 0 1 1-3 3M18 9a3 3 0 1 0 3 3M12 15v4m0 0a3 3 0 1 0 3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
```

- [ ] **Step 6: Profile panel permissions and role switcher**

In `src/components/dashboard/profile-panel.tsx`, add to `ROLE_PERMISSIONS`:
```ts
  hospital_admin: [
    "Read-only oversight dashboard for your facility",
    "Configure your facility's emergency capacity limit",
    "Read-only access to patient records at your facility",
    "Cannot accept referrals, provide treatment, or edit clinical records",
  ],
```
(`profile-panel.tsx` no longer has a role-switcher — confirmed by reading the current file — so no `SWITCHABLE_ROLES` update is needed here.)

- [ ] **Step 7: Verify**

Run: `pnpm exec tsc --noEmit 2>&1 | grep -v ".next/types"` — expect errors only in files not yet touched by later tasks (the new `Role` member will be missing from `Record<Role, ...>` maps this task didn't cover, if any exist beyond what Step 3/4/6 already fixed — there are none left after this task per a `grep -rn "Record<Role" src/` check, so expect a clean typecheck here).
Run: `pnpm exec eslint src/lib/auth/types.ts src/lib/auth/demo-users.ts src/lib/auth/role-routes.ts src/lib/dashboard/role-copy.ts src/app/login/page.tsx src/components/dashboard/profile-panel.tsx`

---

### Task 2: Capacity overrides persistence

**Files:**
- Modify: `src/lib/patients/storage.ts`

**Interfaces:**
- Produces: `subscribeToCapacityOverrides`, `getCapacityOverridesSnapshot`, `getServerCapacityOverridesSnapshot`, `setCapacityOverride(facility, max)`.

- [ ] **Step 1: Add the store**

This is a single `Record<string, number>` blob, not a list of ID-keyed records like `Referral`/`Recommendation`, so it doesn't reuse `readList`/`writeList` (which are typed for arrays). Add near the bottom of `src/lib/patients/storage.ts`:
```ts
const CAPACITY_OVERRIDES_KEY = "ubuntumed.capacityOverrides";
let capacityOverridesCache: Record<string, number> | null = null;
const capacityOverrideListeners = new Set<() => void>();

function loadCapacityOverrides(): Record<string, number> {
  if (capacityOverridesCache) return capacityOverridesCache;
  const raw = window.localStorage.getItem(CAPACITY_OVERRIDES_KEY);
  try {
    capacityOverridesCache = raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    capacityOverridesCache = {};
  }
  return capacityOverridesCache;
}

export function subscribeToCapacityOverrides(onChange: () => void) {
  capacityOverrideListeners.add(onChange);
  return () => capacityOverrideListeners.delete(onChange);
}

export function getCapacityOverridesSnapshot(): Record<string, number> {
  return loadCapacityOverrides();
}

export function getServerCapacityOverridesSnapshot(): Record<string, number> {
  return {};
}

export function setCapacityOverride(facility: string, max: number) {
  capacityOverridesCache = { ...loadCapacityOverrides(), [facility]: max };
  window.localStorage.setItem(CAPACITY_OVERRIDES_KEY, JSON.stringify(capacityOverridesCache));
  capacityOverrideListeners.forEach((listener) => listener());
}
```

- [ ] **Step 2: Verify**

Run: `pnpm exec tsc --noEmit 2>&1 | grep -v ".next/types"`
Run: `pnpm exec eslint src/lib/patients/storage.ts`

---

### Task 3: Wire overrides into capacity derivation, add the mutator

**Files:**
- Modify: `src/lib/patients/use-patients.ts`

**Interfaces:**
- Consumes: storage functions from Task 2.
- Produces: `setFacilityMaxCapacity(facility, max)`; `useFacilityCapacity`/`getFacilityCapacitySnapshot` now check overrides first.

- [ ] **Step 1: Import the new storage functions**

Add to the existing `import { ... } from "./storage";` block:
```ts
  subscribeToCapacityOverrides,
  getCapacityOverridesSnapshot,
  getServerCapacityOverridesSnapshot,
  setCapacityOverride,
```

- [ ] **Step 2: Update both capacity derivations to check overrides first**

Find:
```ts
function getFacilityCapacitySnapshot(facility: string): FacilityCapacity {
  const max = FACILITY_CAPACITY[facility] ?? DEFAULT_CAPACITY;
```
Change to:
```ts
function getFacilityCapacitySnapshot(facility: string): FacilityCapacity {
  const overrides = getCapacityOverridesSnapshot();
  const max = overrides[facility] ?? FACILITY_CAPACITY[facility] ?? DEFAULT_CAPACITY;
```
Find:
```ts
export function useFacilityCapacity(facility: string): FacilityCapacity {
  const referrals = useReferrals();
  return useMemo(() => {
    const max = FACILITY_CAPACITY[facility] ?? DEFAULT_CAPACITY;
```
Change to:
```ts
export function useFacilityCapacity(facility: string): FacilityCapacity {
  const referrals = useReferrals();
  const overrides = useSyncExternalStore(
    subscribeToCapacityOverrides,
    getCapacityOverridesSnapshot,
    getServerCapacityOverridesSnapshot,
  );
  return useMemo(() => {
    const max = overrides[facility] ?? FACILITY_CAPACITY[facility] ?? DEFAULT_CAPACITY;
```
And update that `useMemo`'s dependency array from `[referrals, facility]` to `[referrals, facility, overrides]`.

- [ ] **Step 3: Add the mutator**

Add directly after `useFacilityCapacity`:
```ts
export function setFacilityMaxCapacity(facility: string, max: number) {
  setCapacityOverride(facility, max);
}
```
(Thin wrapper kept for naming symmetry with the rest of this file's exported mutators — e.g. `respondToRecommendation`, `acceptEmergencyReferral` — rather than exporting the storage function directly under a storage-flavored name.)

- [ ] **Step 4: Verify**

Run: `pnpm exec tsc --noEmit 2>&1 | grep -v ".next/types"`
Run: `pnpm exec eslint src/lib/patients/use-patients.ts`

---

### Task 4: RoleGuard, sidebar, and RedCaseAlertPanel exclusion

**Files:**
- Modify: `src/app/dashboard/nurse/patients/page.tsx`
- Modify: `src/app/dashboard/nurse/patients/[id]/page.tsx`
- Modify: `src/app/dashboard/nurse/referrals/page.tsx`
- Modify: `src/app/dashboard/nurse/risk-classification/page.tsx`
- Modify: `src/components/dashboard/sidebar.tsx`
- Modify: `src/components/dashboard/red-case-alert.tsx`

**Interfaces:**
- Consumes: `RoleGuard` (existing, `roles: Role[]`), `Role` (Task 1).

- [ ] **Step 1: Widen RoleGuard on the four shared pages**

In each of these files, change `<RoleGuard roles={["nurse", "gynecologist"]}>` to `<RoleGuard roles={["nurse", "gynecologist", "hospital_admin"]}>`:
- `src/app/dashboard/nurse/patients/page.tsx`
- `src/app/dashboard/nurse/patients/[id]/page.tsx`
- `src/app/dashboard/nurse/referrals/page.tsx`
- `src/app/dashboard/nurse/risk-classification/page.tsx`

- [ ] **Step 2: Sidebar nav**

In `src/components/dashboard/sidebar.tsx`, add `"hospital_admin"` to the same three `enabledRoles` arrays that currently read `["nurse", "gynecologist"]` (Patient Registry, Risk Classification, Referral Log) — do **not** add it to ANC Visits or Active Alerts (those stay nurse-only). Also extend the "Dashboard" active-highlight check:
```ts
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard" ||
                  pathname === "/dashboard/nurse" ||
                  pathname === "/dashboard/gynecologist" ||
                  pathname === "/dashboard/lab" ||
                  pathname === "/dashboard/hospital-admin"
                : pathname.startsWith(item.href || "");
```

- [ ] **Step 3: Exclude Hospital Administrator from `RedCaseAlertPanel`**

In `src/components/dashboard/red-case-alert.tsx`, inside `RedCaseAlertPanel`, right after the `const { user } = useAuth();` line, add:
```ts
  if (user?.role === "hospital_admin") return null;
```
Place it after all hook calls (`usePatients()`, `useVisits()`, etc. and the `useState`/`useMemo` calls) — i.e. at the same point the existing `if (pendingCases.length === 0) return null;` early return sits, not before the hooks, to avoid violating rules-of-hooks. Concretely: add it immediately before `if (pendingCases.length === 0) return null;`.

- [ ] **Step 4: Verify**

Run: `pnpm exec tsc --noEmit 2>&1 | grep -v ".next/types"`
Run: `pnpm exec eslint src/app/dashboard/nurse/patients/page.tsx "src/app/dashboard/nurse/patients/[id]/page.tsx" src/app/dashboard/nurse/referrals/page.tsx src/app/dashboard/nurse/risk-classification/page.tsx src/components/dashboard/sidebar.tsx src/components/dashboard/red-case-alert.tsx`

---

### Task 5: Make the patient detail page actually read-only for Hospital Administrator

**Files:**
- Modify: `src/app/dashboard/nurse/patients/[id]/page.tsx`

**Interfaces:**
- Consumes: `useAuth()` (already imported in this file).

- [ ] **Step 1: Compute a read-only flag and a filtered tab list**

`TABS` is currently a module-level `const` array (used to derive the `Tab` type via `(typeof TABS)[number]`) — keep it as-is for the type, but compute a separate render-time list inside the component. Find:
```ts
  const { user } = useAuth();
  const isManagingReferral =
```
Change to:
```ts
  const { user } = useAuth();
  const isReadOnlyAdmin = user?.role === "hospital_admin";
  const isManagingReferral =
```
Then find the tab bar:
```tsx
          <div className="scrollbar-hidden flex w-fit gap-1 overflow-x-auto rounded-full border border-zinc-300 bg-[#ffeedb] p-1 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
            {TABS.map((tab) => (
```
Change to:
```tsx
          <div className="scrollbar-hidden flex w-fit gap-1 overflow-x-auto rounded-full border border-zinc-300 bg-[#ffeedb] p-1 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
            {TABS.filter((tab) => !(isReadOnlyAdmin && tab === "New Assessment")).map((tab) => (
```
Leave the `activeTab === "New Assessment" && (...)` render block untouched — it's simply unreachable for this role now since there's no tab button to click into it, and `activeTab` defaults to `"Overview"` anyway.

- [ ] **Step 2: Hide the Edit/Create Referral actions menu**

Find:
```tsx
        <div className="flex items-center gap-2.5">
          <RiskBadge level={currentRisk} />
          <div className="relative">
            <button
              type="button"
              onClick={() => setActionsOpen((o) => !o)}
```
Wrap the whole `<div className="relative">...</div>` actions-menu block (everything from `<div className="relative">` through its matching closing `</div>`, i.e. the button + the conditional dropdown) in `{!isReadOnlyAdmin && ( ... )}`:
```tsx
        <div className="flex items-center gap-2.5">
          <RiskBadge level={currentRisk} />
          {!isReadOnlyAdmin && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setActionsOpen((o) => !o)}
                className="flex items-center gap-1 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Actions
                <IconChevronDown className="h-3.5 w-3.5" />
              </button>
              {actionsOpen && (
                <div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                  <button
                    type="button"
                    onClick={() => { setActionsOpen(false); setShowEditModal(true); }}
                    className="block w-full px-4 py-2.5 text-left text-sm text-zinc-700 hover:bg-teal-50 hover:text-teal-900 dark:text-zinc-300 dark:hover:bg-teal-950"
                  >
                    Edit patient
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActionsOpen(false); setShowReferralModal(true); }}
                    className="block w-full px-4 py-2.5 text-left text-sm text-zinc-700 hover:bg-teal-50 hover:text-teal-900 dark:text-zinc-300 dark:hover:bg-teal-950"
                  >
                    Create referral
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
```
(Indentation of the inner content shifts by one level since it's now nested one level deeper — apply the indentation, it doesn't affect behavior but keep the file readable.)

- [ ] **Step 3: Hide the Visit History log-visit buttons**

Find:
```tsx
                onLogScheduledVisit={
                  activeReferral
                    ? undefined
                    : (week) => {
                        setAssessmentContext({ type: "scheduled", scheduledWeek: week });
                        setActiveTab("New Assessment");
                      }
                }
                onLogUnscheduledVisit={
                  activeReferral
                    ? undefined
                    : () => {
                        setAssessmentContext({ type: "unscheduled" });
                        setActiveTab("New Assessment");
                      }
                }
```
Change both conditions from `activeReferral ? undefined : ...` to `activeReferral || isReadOnlyAdmin ? undefined : ...`:
```tsx
                onLogScheduledVisit={
                  activeReferral || isReadOnlyAdmin
                    ? undefined
                    : (week) => {
                        setAssessmentContext({ type: "scheduled", scheduledWeek: week });
                        setActiveTab("New Assessment");
                      }
                }
                onLogUnscheduledVisit={
                  activeReferral || isReadOnlyAdmin
                    ? undefined
                    : () => {
                        setAssessmentContext({ type: "unscheduled" });
                        setActiveTab("New Assessment");
                      }
                }
```

- [ ] **Step 4: Verify**

Run: `pnpm exec tsc --noEmit 2>&1 | grep -v ".next/types"`
Run: `pnpm exec eslint "src/app/dashboard/nurse/patients/[id]/page.tsx"`

---

### Task 6: Hospital Administrator dashboard — route, Referral Activity card, capacity editor

**Files:**
- Create: `src/app/dashboard/hospital-admin/page.tsx`
- Modify: `src/components/dashboard/overview.tsx`

**Interfaces:**
- Consumes: `useFacilityCapacity`, `FACILITY_CAPACITY`, `setFacilityMaxCapacity` (Task 3), `useReferrals` (existing, already global).

- [ ] **Step 1: Create the route**

```tsx
import { RoleGuard } from "@/components/role-guard";
import { DashboardOverview } from "@/components/dashboard/overview";

export default function HospitalAdminDashboardPage() {
  return (
    <RoleGuard roles={["hospital_admin"]}>
      <DashboardOverview />
    </RoleGuard>
  );
}
```

- [ ] **Step 2: Add the capacity pill's inline editor, gated to the admin role**

`overview.tsx` already has the capacity pill from the previous slice (`hasCapacityConfig` / `capacity` / the colored `<div>` block). Import `setFacilityMaxCapacity` and `useState` (if not already imported — `useState` already is, for `range`), and `useReferrals`.

Add to the imports:
```ts
import { useRiskSummary, useFacilityCapacity, FACILITY_CAPACITY, setFacilityMaxCapacity, useReferrals } from "@/lib/patients/use-patients";
```
Inside `DashboardOverview`, after the existing `const capacity = useFacilityCapacity(user?.facility ?? "");` and `const hasCapacityConfig = ...` lines, add:
```ts
const referrals = useReferrals();
const isHospitalAdmin = user?.role === "hospital_admin";
const [capacityDraft, setCapacityDraft] = useState<string>("");
const [isEditingCapacity, setIsEditingCapacity] = useState(false);

const referralCounts = user
  ? {
      pending: referrals.filter(
        (r) => r.status === "pending" && (r.referredByFacility === user.facility || r.receivingFacility === user.facility),
      ).length,
      accepted: referrals.filter((r) => r.status === "accepted" && r.acceptedByFacility === user.facility).length,
      closed: referrals.filter(
        (r) => r.status === "closed" && (r.referredByFacility === user.facility || r.acceptedByFacility === user.facility),
      ).length,
    }
  : { pending: 0, accepted: 0, closed: 0 };
```
Note: `useReferrals()` and the two `useState` calls must be added **before** the existing `if (!user) return null;` line in this component (same rule as `capacity`/`useFacilityCapacity` already follow) — place them alongside the other hook calls at the top, not after the early return.

- [ ] **Step 3: Extend the capacity pill with an edit control, admin-only**

Find the existing capacity pill block (from the previous slice):
```tsx
      {hasCapacityConfig && (
        <div
          className={`flex items-center gap-2.5 rounded-xl border px-4 py-2.5 text-sm font-medium ${
            capacity.status === "full"
              ? "border-red-300 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
              : capacity.status === "nearly_full"
                ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300"
                : "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
          }`}
        >
          <span>
            {user.facility}: {capacity.active}/{capacity.max} active emergency cases
          </span>
          <span className="rounded-full bg-white/60 px-2 py-0.5 text-xs font-bold uppercase tracking-wide dark:bg-black/20">
            {capacity.status === "full" ? "Full" : capacity.status === "nearly_full" ? "Nearly Full" : "Available"}
          </span>
        </div>
      )}
```
Replace with (adds an edit affordance only for `hospital_admin`, and shows the pill even without prior config for that role so they can set an initial value — everyone else keeps the original `hasCapacityConfig`-gated read-only pill):
```tsx
      {(hasCapacityConfig || isHospitalAdmin) && (
        <div
          className={`flex flex-wrap items-center gap-2.5 rounded-xl border px-4 py-2.5 text-sm font-medium ${
            capacity.status === "full"
              ? "border-red-300 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
              : capacity.status === "nearly_full"
                ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300"
                : "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
          }`}
        >
          <span>
            {user.facility}: {capacity.active}/{capacity.max} active emergency cases
          </span>
          <span className="rounded-full bg-white/60 px-2 py-0.5 text-xs font-bold uppercase tracking-wide dark:bg-black/20">
            {capacity.status === "full" ? "Full" : capacity.status === "nearly_full" ? "Nearly Full" : "Available"}
          </span>
          {isHospitalAdmin && (
            isEditingCapacity ? (
              <form
                className="flex items-center gap-1.5"
                onSubmit={(e) => {
                  e.preventDefault();
                  const parsed = Number(capacityDraft);
                  if (Number.isFinite(parsed) && parsed >= 0) {
                    setFacilityMaxCapacity(user.facility, parsed);
                    setIsEditingCapacity(false);
                  }
                }}
              >
                <input
                  type="number"
                  min={0}
                  autoFocus
                  value={capacityDraft}
                  onChange={(e) => setCapacityDraft(e.target.value)}
                  className="w-16 rounded-md border border-current bg-white/80 px-2 py-1 text-xs text-zinc-900 outline-none dark:bg-zinc-900 dark:text-zinc-50"
                />
                <button type="submit" className="rounded-md bg-white/60 px-2 py-1 text-xs font-semibold dark:bg-black/20">
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingCapacity(false)}
                  className="text-xs underline"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => { setCapacityDraft(String(capacity.max)); setIsEditingCapacity(true); }}
                className="rounded-md bg-white/60 px-2 py-1 text-xs font-semibold underline dark:bg-black/20"
              >
                Edit limit
              </button>
            )
          )}
        </div>
      )}
```

- [ ] **Step 4: Add the Referral Activity card, admin-only**

Add right after the capacity pill block (still before `<div className="flex flex-col gap-6 lg:flex-row">`):
```tsx
      {isHospitalAdmin && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{referralCounts.pending}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Pending referrals</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">{referralCounts.accepted}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Accepted referrals</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-2xl font-bold text-zinc-600 dark:text-zinc-400">{referralCounts.closed}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Closed referrals</p>
          </div>
        </div>
      )}
```

- [ ] **Step 5: Verify**

Run: `pnpm exec tsc --noEmit 2>&1 | grep -v ".next/types"`
Run: `pnpm exec eslint src/app/dashboard/hospital-admin/page.tsx src/components/dashboard/overview.tsx`

---

### Task 7: "Hospital at full capacity" notification

**Files:**
- Modify: `src/lib/patients/use-patients.ts`

**Interfaces:**
- Consumes: `useFacilityCapacity`-equivalent snapshot logic already available inside `useNotificationAlerts` via `getFacilityCapacitySnapshot`-style derivation — reuse the pattern, not the hook (this is inside a `useMemo`, not calling another hook).

- [ ] **Step 1: Widen the alert type union**

Find:
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
    | "emergency_arrival";
```
Add `"facility_full"` to the union.

- [ ] **Step 2: Add the branch**

Inside `useNotificationAlerts`, `useFacilityCapacity` can't be called (it's a hook, and we're already inside a `useMemo`) — instead, call the plain `getFacilityCapacitySnapshot`-style logic directly. Since that helper is `function`-scoped (not exported) but declared in the same file, it's directly callable. Add a new `if (role === "hospital_admin") { ... }` block near the other role-specific blocks (after the existing `recommendation_responded` block, before the final `// Sort by priority...` comment):
```ts
    if (role === "hospital_admin" && currentUser.facility in FACILITY_CAPACITY) {
      const facilityCapacity = getFacilityCapacitySnapshot(currentUser.facility);
      if (facilityCapacity.status === "full") {
        alerts.push({
          id: `facility-full-${currentUser.facility}`,
          type: "facility_full",
          patientId: "",
          patientName: currentUser.facility,
          title: "Hospital at Full Emergency Capacity",
          message: `${currentUser.facility} has ${facilityCapacity.active}/${facilityCapacity.max} active emergency cases — no new referrals can be accepted until one closes.`,
          date: new Date().toISOString().slice(0, 10),
          priority: "Emergency",
        });
      }
    }
```
Add `FACILITY_CAPACITY` to the dependency array of the surrounding `useMemo` only if it isn't already stable module-scope (it is a `const` object reference that never changes, so it does **not** need to be in the dependency array — do not add it).

- [ ] **Step 3: Route the new alert type in the notification panel**

`notification-panel.tsx`'s `handleAlertClick` already types its parameter as `NotificationAlert["type"]` (from an earlier fix) and routes anything that isn't `"lab_request"` to `/dashboard/nurse/patients/${patientId}`. A `facility_full` alert has `patientId: ""`, which would produce a broken link (`/dashboard/nurse/patients/`). Add a guard: find
```ts
    if (type === "lab_request") {
      router.push("/dashboard/lab/requests");
    } else {
      router.push(`/dashboard/nurse/patients/${patientId}`);
    }
```
in `src/components/dashboard/notification-panel.tsx` and change to:
```ts
    if (type === "lab_request") {
      router.push("/dashboard/lab/requests");
    } else if (type === "facility_full") {
      router.push("/dashboard/hospital-admin");
    } else {
      router.push(`/dashboard/nurse/patients/${patientId}`);
    }
```

- [ ] **Step 4: Verify**

Run: `pnpm exec tsc --noEmit 2>&1 | grep -v ".next/types"`
Run: `pnpm exec eslint src/lib/patients/use-patients.ts src/components/dashboard/notification-panel.tsx`

---

### Task 8: Full verification and manual walkthrough

**Files:** none (verification only)

- [ ] **Step 1: Full typecheck, lint, build**

Run: `pnpm exec tsc --noEmit 2>&1 | grep -v ".next/types"` — expect no output.
Run: `pnpm exec eslint .` — expect no errors.
Run: `pnpm build` — expect success; confirm `/dashboard/hospital-admin` appears in the route list.

- [ ] **Step 2: Manual walkthrough**

Against the running dev server, logged in as Dr. Niyibizi (`niyibizi` / `admin123`):
1. Confirm the dashboard loads at `/dashboard/hospital-admin`, shows the capacity pill with an "Edit limit" control, and the Pending/Accepted/Closed referral counts.
2. Edit the capacity limit (e.g. to 5), confirm it persists across a page refresh, and confirm the previous slice's broadcast-hiding/accept-guard logic respects the new number (accept 5 cases as Nurse Kagame or Dr. Mutesi before it goes Full, not 3).
3. Confirm `RedCaseAlertPanel` never renders for this account even when pending emergencies exist system-wide.
4. Open a patient from Patient Registry — confirm there is no "New Assessment" tab, no "Actions" menu (no Edit patient / Create referral), and Visit History shows no "Log Scheduled/Unscheduled Visit" buttons.
5. Push the facility to Full (via another account) — confirm the "Hospital at Full Emergency Capacity" bell alert appears for Dr. Niyibizi and links back to the admin dashboard.
6. Confirm the sidebar shows Patient Registry, Risk Classification, and Referral Log, but not ANC Visits or Active Alerts.

- [ ] **Step 3: Report results**

Summarize pass/fail for each walkthrough step. Do not commit unless explicitly asked.
