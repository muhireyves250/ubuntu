# Dashboard Live Panels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the four placeholder dashboard side-panel sections (Accept button, Active Referrals, Following Module, Today's ANC Visits) to real localStorage-backed data.

**Architecture:** A new `Referral` type and storage layer follows the identical cache + listener + `useSyncExternalStore` pattern already used for `Patient` and `Visit`. Four new hooks (`useReferrals`, `useActiveReferrals`, `useFollowUpPatients`, `useTodaysVisits`) and one action (`acceptReferral`) are added to `use-patients.ts`. Two components (`red-case-alert.tsx`, `side-panel.tsx`) are updated to consume them.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict, Tailwind CSS v4, localStorage (no backend), pnpm

## Global Constraints

- No backend, no API, no database — localStorage only.
- Use `pnpm`, never `npm` or `yarn`.
- TypeScript strict mode — no `any`, no ignored type errors.
- Tailwind CSS v4 — config lives in `postcss.config.mjs`, not `tailwind.config.*`.
- Path alias `@/*` maps to `src/*`.
- No new dependencies — zero new packages.
- All client components that use hooks must have `"use client"` at the top.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/lib/patients/types.ts` | Modify | Add `Referral` type |
| `src/lib/format.ts` | Modify | Add `relativeTime` helper |
| `src/lib/patients/storage.ts` | Modify | Add referral store (key, cache, listeners, CRUD) |
| `src/lib/patients/use-patients.ts` | Modify | Add `useReferrals`, `useActiveReferrals`, `acceptReferral`, `useFollowUpPatients`, `useTodaysVisits`, `FollowUpPatient`, `TodaysVisit` |
| `src/components/dashboard/red-case-alert.tsx` | Modify | Replace `alert()` with `acceptReferral` + `router.push`; filter accepted patients |
| `src/components/dashboard/side-panel.tsx` | Modify | Become `"use client"`; wire Active Referrals, Following Module, Today's ANC Visits |

---

### Task 1: Add `Referral` type, `relativeTime` helper, and referral storage

**Files:**
- Modify: `src/lib/patients/types.ts`
- Modify: `src/lib/format.ts`
- Modify: `src/lib/patients/storage.ts`

**Interfaces:**
- Produces: `Referral` type, `addReferral`, `getReferralsSnapshot`, `getServerReferralsSnapshot`, `subscribeToReferrals`, `relativeTime`

- [ ] **Step 1: Add `Referral` to `src/lib/patients/types.ts`**

Append after the `Visit` interface:

```ts
export interface Referral {
  id: string;
  patientId: string;
  acceptedAt: string; // ISO datetime string
  status: "active";
}
```

Full file after edit:

```ts
export type RiskLevel = "green" | "yellow" | "orange" | "red";

export interface Patient {
  id: string;
  name: string;
  age: number;
  gestationalAgeWeeks: number;
  facility: string;
  registeredAt: string;
  obstetricHistory: string;
  medicalHistory: string;
}

export interface Visit {
  id: string;
  patientId: string;
  date: string;
  symptomIds: string[];
  riskLevel: RiskLevel;
  notes: string;
}

export interface Referral {
  id: string;
  patientId: string;
  acceptedAt: string;
  status: "active";
}
```

- [ ] **Step 2: Add `relativeTime` to `src/lib/format.ts`**

Append after `getInitials`:

```ts
export function relativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}
```

- [ ] **Step 3: Add referral store to `src/lib/patients/storage.ts`**

Add the `Referral` import and the full referral section. Full file after edit:

```ts
import type { Patient, Visit, Referral } from "./types";
import { SEED_PATIENTS, SEED_VISITS } from "./seed-data";

const PATIENTS_KEY = "ubuntumed.patients";
const VISITS_KEY = "ubuntumed.visits";
const REFERRALS_KEY = "ubuntumed.referrals";

let patientsCache: Patient[] | null = null;
let visitsCache: Visit[] | null = null;
let referralsCache: Referral[] | null = null;

const patientListeners = new Set<() => void>();
const visitListeners = new Set<() => void>();
const referralListeners = new Set<() => void>();

function readList<T>(key: string): T[] | null {
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T[];
  } catch {
    return null;
  }
}

function writeList<T>(key: string, items: T[]) {
  window.localStorage.setItem(key, JSON.stringify(items));
}

function loadPatients(): Patient[] {
  if (patientsCache) return patientsCache;
  const stored = readList<Patient>(PATIENTS_KEY);
  patientsCache = stored ?? SEED_PATIENTS;
  if (!stored) writeList(PATIENTS_KEY, patientsCache);
  return patientsCache;
}

function loadVisits(): Visit[] {
  if (visitsCache) return visitsCache;
  const stored = readList<Visit>(VISITS_KEY);
  visitsCache = stored ?? SEED_VISITS;
  if (!stored) writeList(VISITS_KEY, visitsCache);
  return visitsCache;
}

function loadReferrals(): Referral[] {
  if (referralsCache) return referralsCache;
  const stored = readList<Referral>(REFERRALS_KEY);
  referralsCache = stored ?? [];
  if (!stored) writeList(REFERRALS_KEY, referralsCache);
  return referralsCache;
}

export function subscribeToPatients(onChange: () => void) {
  patientListeners.add(onChange);
  return () => patientListeners.delete(onChange);
}

export function subscribeToVisits(onChange: () => void) {
  visitListeners.add(onChange);
  return () => visitListeners.delete(onChange);
}

export function subscribeToReferrals(onChange: () => void) {
  referralListeners.add(onChange);
  return () => referralListeners.delete(onChange);
}

export function getPatientsSnapshot(): Patient[] {
  return loadPatients();
}

export function getVisitsSnapshot(): Visit[] {
  return loadVisits();
}

export function getReferralsSnapshot(): Referral[] {
  return loadReferrals();
}

export function getServerPatientsSnapshot(): Patient[] {
  return [];
}

export function getServerVisitsSnapshot(): Visit[] {
  return [];
}

export function getServerReferralsSnapshot(): Referral[] {
  return [];
}

export function addPatient(patient: Patient) {
  patientsCache = [...loadPatients(), patient];
  writeList(PATIENTS_KEY, patientsCache);
  patientListeners.forEach((listener) => listener());
}

export function addVisit(visit: Visit) {
  visitsCache = [...loadVisits(), visit];
  writeList(VISITS_KEY, visitsCache);
  visitListeners.forEach((listener) => listener());
}

export function addReferral(referral: Referral) {
  referralsCache = [...loadReferrals(), referral];
  writeList(REFERRALS_KEY, referralsCache);
  referralListeners.forEach((listener) => listener());
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
pnpm build 2>&1 | grep -E "error|Error" | head -20
```

Expected: no type errors from the three edited files.

- [ ] **Step 5: Commit**

```bash
git add src/lib/patients/types.ts src/lib/format.ts src/lib/patients/storage.ts
git commit -m "feat: add Referral type, relativeTime helper, referral storage layer"
```

---

### Task 2: Add referral hooks and `acceptReferral` action

**Files:**
- Modify: `src/lib/patients/use-patients.ts`

**Interfaces:**
- Consumes: `Referral` from `./types`; `addReferral`, `getReferralsSnapshot`, `getServerReferralsSnapshot`, `subscribeToReferrals` from `./storage`
- Produces: `useReferrals(): Referral[]`, `useActiveReferrals(): Referral[]`, `acceptReferral(patientId: string): Referral`

- [ ] **Step 1: Update imports in `src/lib/patients/use-patients.ts`**

Replace the existing import block at the top of the file:

```ts
"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  addPatient,
  addReferral,
  addVisit,
  getPatientsSnapshot,
  getReferralsSnapshot,
  getServerPatientsSnapshot,
  getServerReferralsSnapshot,
  getServerVisitsSnapshot,
  getVisitsSnapshot,
  subscribeToPatients,
  subscribeToReferrals,
  subscribeToVisits,
} from "./storage";
import { classifyRiskLevel } from "./symptom-checklist";
import type { Patient, Referral, RiskLevel, Visit } from "./types";
```

- [ ] **Step 2: Add `useReferrals`, `useActiveReferrals`, and `acceptReferral` after `useVisitsForPatient`**

Insert after the `useLatestRiskLevel` function (after line ~55):

```ts
export function useReferrals(): Referral[] {
  return useSyncExternalStore(
    subscribeToReferrals,
    getReferralsSnapshot,
    getServerReferralsSnapshot,
  );
}

export function useActiveReferrals(): Referral[] {
  const referrals = useReferrals();
  return useMemo(
    () => referrals.filter((r) => r.status === "active"),
    [referrals],
  );
}

export function acceptReferral(patientId: string): Referral {
  const referral: Referral = {
    id: `referral-${crypto.randomUUID()}`,
    patientId,
    acceptedAt: new Date().toISOString(),
    status: "active",
  };
  addReferral(referral);
  return referral;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm build 2>&1 | grep -E "error|Error" | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/patients/use-patients.ts
git commit -m "feat: add useReferrals, useActiveReferrals, acceptReferral"
```

---

### Task 3: Add `useFollowUpPatients` and `useTodaysVisits` hooks

**Files:**
- Modify: `src/lib/patients/use-patients.ts`

**Interfaces:**
- Consumes: `usePatients()`, `useVisits()` (already exist in the file)
- Produces:
  - `FollowUpPatient` interface: `{ patient: Patient; latestRiskLevel: RiskLevel; reason: "high-risk" | "overdue" }`
  - `useFollowUpPatients(): FollowUpPatient[]`
  - `TodaysVisit` interface: `{ visit: Visit; patient: Patient | undefined }`
  - `useTodaysVisits(): TodaysVisit[]`

- [ ] **Step 1: Add `FollowUpPatient`, `useFollowUpPatients`, `TodaysVisit`, `useTodaysVisits` to `src/lib/patients/use-patients.ts`**

Append after `acceptReferral`:

```ts
export interface FollowUpPatient {
  patient: Patient;
  latestRiskLevel: RiskLevel;
  reason: "high-risk" | "overdue";
}

export function useFollowUpPatients(): FollowUpPatient[] {
  const patients = usePatients();
  const visits = useVisits();

  return useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 14);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const results: FollowUpPatient[] = [];

    for (const patient of patients) {
      const patientVisits = visits
        .filter((v) => v.patientId === patient.id)
        .sort((a, b) => b.date.localeCompare(a.date));

      const latestVisit = patientVisits[0];
      const latestRiskLevel: RiskLevel = latestVisit?.riskLevel ?? "green";

      if (latestRiskLevel === "yellow" || latestRiskLevel === "orange") {
        results.push({ patient, latestRiskLevel, reason: "high-risk" });
      } else if (latestVisit && latestVisit.date < cutoffStr) {
        results.push({ patient, latestRiskLevel, reason: "overdue" });
      }
    }

    return results;
  }, [patients, visits]);
}

export interface TodaysVisit {
  visit: Visit;
  patient: Patient | undefined;
}

export function useTodaysVisits(): TodaysVisit[] {
  const visits = useVisits();
  const patients = usePatients();

  return useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return visits
      .filter((v) => v.date === today)
      .map((visit) => ({
        visit,
        patient: patients.find((p) => p.id === visit.patientId),
      }));
  }, [visits, patients]);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm build 2>&1 | grep -E "error|Error" | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/patients/use-patients.ts
git commit -m "feat: add useFollowUpPatients and useTodaysVisits hooks"
```

---

### Task 4: Wire Accept button in `red-case-alert.tsx`

**Files:**
- Modify: `src/components/dashboard/red-case-alert.tsx`

**Interfaces:**
- Consumes: `useActiveReferrals(): Referral[]`, `acceptReferral(patientId: string): Referral` from `@/lib/patients/use-patients`; `useRouter` from `next/navigation`

- [ ] **Step 1: Rewrite `src/components/dashboard/red-case-alert.tsx`**

Replace the entire file:

```tsx
"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  usePatients,
  useVisits,
  useActiveReferrals,
  acceptReferral,
} from "@/lib/patients/use-patients";
import type { Patient } from "@/lib/patients/types";

function IconEmergency({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 3.5 2.5 19.5h19L12 3.5Z"
        fill="currentColor"
        opacity="0.15"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M12 9.5v4M12 16.5h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconArrowRight({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconClock({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

interface RedCaseCardProps {
  patient: Patient;
  latestVisitDate: string;
  onAccept: (patientId: string) => void;
}

function RedCaseCard({ patient, latestVisitDate, onAccept }: RedCaseCardProps) {
  return (
    <div className="animate-pulse-ring-urgent flex items-start gap-4 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/30">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
        <IconEmergency className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-red-800 dark:text-red-300 truncate">
            {patient.name}
          </p>
          <span className="shrink-0 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
            Obstetric Emergency
          </span>
        </div>
        <p className="mt-0.5 text-xs text-red-700/70 dark:text-red-400/70">
          {patient.gestationalAgeWeeks}w gestation · {patient.facility}
        </p>
        <div className="mt-1 flex items-center gap-1 text-xs text-red-600/60 dark:text-red-400/60">
          <IconClock className="h-3.5 w-3.5" />
          <span>Flagged {latestVisitDate}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onAccept(patient.id)}
        className="mt-0.5 shrink-0 flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 active:scale-95"
      >
        Accept
        <IconArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function RedCaseAlertPanel() {
  const router = useRouter();
  const patients = usePatients();
  const visits = useVisits();
  const activeReferrals = useActiveReferrals();

  const acceptedPatientIds = useMemo(
    () => new Set(activeReferrals.map((r) => r.patientId)),
    [activeReferrals],
  );

  const redCases = useMemo(() => {
    return patients
      .filter((patient) => !acceptedPatientIds.has(patient.id))
      .map((patient) => {
        const latestVisit = visits
          .filter((v) => v.patientId === patient.id)
          .sort((a, b) => b.date.localeCompare(a.date))[0];
        return { patient, latestVisit };
      })
      .filter(({ latestVisit }) => latestVisit?.riskLevel === "red")
      .sort((a, b) =>
        (b.latestVisit?.date ?? "").localeCompare(a.latestVisit?.date ?? ""),
      );
  }, [patients, visits, acceptedPatientIds]);

  if (redCases.length === 0) return null;

  return (
    <div className="rounded-[1.25rem] border border-red-300 bg-red-50/60 p-6 shadow-[0_2px_12px_rgba(220,38,38,0.08)] dark:border-red-900/50 dark:bg-red-950/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-red-600" />
          </span>
          <h2 className="font-semibold text-red-900 dark:text-red-300">
            Pending Emergency Referrals
          </h2>
          <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
            {redCases.length}
          </span>
        </div>
        <span className="text-xs text-red-600/70 dark:text-red-400/70">
          Visible to all staff
        </span>
      </div>

      <p className="mt-2 text-sm text-red-700/80 dark:text-red-400/80">
        The following patients have been classified as obstetric emergencies and require immediate referral acceptance.
      </p>

      <div className="mt-4 flex flex-col gap-3">
        {redCases.map(({ patient, latestVisit }) => (
          <RedCaseCard
            key={patient.id}
            patient={patient}
            latestVisitDate={latestVisit?.date ?? "Unknown"}
            onAccept={(id) => {
              acceptReferral(id);
              router.push(`/dashboard/nurse/patients/${id}`);
            }}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run the dev server and manually verify**

```bash
pnpm dev
```

Open `http://localhost:3000`, log in as Nurse (ANC), go to the dashboard.
- Confirm the red case card for "Aline Uwimana" still shows.
- Click **Accept** — should navigate to her patient detail page.
- Go back to dashboard — her card should be **gone** from the Emergency panel.
- Reload the page — she should still be gone (referral is persisted).

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/red-case-alert.tsx
git commit -m "feat: wire Accept button to acceptReferral and navigate to patient record"
```

---

### Task 5: Wire `SidePanel` to live data

**Files:**
- Modify: `src/components/dashboard/side-panel.tsx`

**Interfaces:**
- Consumes:
  - `useActiveReferrals(): Referral[]` from `@/lib/patients/use-patients`
  - `usePatients(): Patient[]` from `@/lib/patients/use-patients`
  - `useFollowUpPatients(): FollowUpPatient[]` from `@/lib/patients/use-patients`
  - `useTodaysVisits(): TodaysVisit[]` from `@/lib/patients/use-patients`
  - `RiskBadge` from `@/components/patients/risk-badge` — `<RiskBadge level={RiskLevel} size="sm" />`
  - `relativeTime(isoString: string): string` from `@/lib/format`
  - `Link` from `next/link`

- [ ] **Step 1: Rewrite `src/components/dashboard/side-panel.tsx`**

Replace the entire file:

```tsx
"use client";

import Link from "next/link";
import type { DemoUser } from "@/lib/auth/types";
import type { RoleOverviewCopy } from "@/lib/dashboard/role-copy";
import { getInitials, relativeTime } from "@/lib/format";
import {
  useActiveReferrals,
  useFollowUpPatients,
  usePatients,
  useTodaysVisits,
} from "@/lib/patients/use-patients";
import { RiskBadge } from "@/components/patients/risk-badge";

export function SidePanel({
  user,
  copy,
}: {
  user: DemoUser;
  copy: RoleOverviewCopy;
}) {
  const activeReferrals = useActiveReferrals();
  const patients = usePatients();
  const followUps = useFollowUpPatients();
  const todaysVisits = useTodaysVisits();

  return (
    <div className="flex w-full flex-col gap-4 lg:w-80">
      {/* Greeting card */}
      <div className="flex flex-col gap-3 rounded-[1.25rem] border border-zinc-300 bg-[#ffeedb] p-6 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-sm font-semibold text-zinc-700 shadow-sm dark:bg-zinc-900 dark:text-zinc-300">
            {getInitials(user.name)}
          </div>
          <span className="rounded-full bg-orange-200/70 px-3 py-1 text-xs font-semibold text-orange-800 dark:bg-orange-900/60 dark:text-orange-300">
            {copy.scope}
          </span>
        </div>

        <div className="mt-2">
          <p className="text-xl font-bold leading-tight text-zinc-900 dark:text-zinc-50">
            Good day, {user.name.split(" ")[0]}
          </p>
          <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-400">
            {copy.description}
          </p>
        </div>

        {/* Following Module */}
        <div className="mt-4 flex flex-col gap-1 rounded-xl border border-zinc-300 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <p className="font-semibold text-zinc-900 dark:text-zinc-100">
            Following Module
          </p>
          {followUps.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No active follow-ups.
            </p>
          ) : (
            <div className="mt-2 flex flex-col gap-2">
              {followUps.map(({ patient, latestRiskLevel, reason }) => (
                <Link
                  key={patient.id}
                  href={`/dashboard/nurse/patients/${patient.id}`}
                  className="flex items-center justify-between rounded-lg border border-zinc-100 px-3 py-2 text-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                      {patient.name}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {reason === "high-risk"
                        ? "High risk — close follow-up"
                        : "No visit in 14 days"}
                    </p>
                  </div>
                  <RiskBadge level={latestRiskLevel} size="sm" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Active Referrals */}
      <div className="rounded-[1.25rem] border border-zinc-300 bg-[#ffeedb] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:border-zinc-700 dark:bg-orange-950/40">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
            Active Referrals
          </h3>
          <Link
            href="/dashboard/nurse/patients"
            className="text-sm font-medium text-teal-700 dark:text-teal-400"
          >
            View all
          </Link>
        </div>
        {activeReferrals.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
            No active referrals.
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {activeReferrals.map((referral) => {
              const patient = patients.find((p) => p.id === referral.patientId);
              if (!patient) return null;
              return (
                <Link
                  key={referral.id}
                  href={`/dashboard/nurse/patients/${referral.patientId}`}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                      {patient.name}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {patient.gestationalAgeWeeks}w gestation
                    </p>
                  </div>
                  <p className="ml-2 shrink-0 text-xs text-zinc-400 dark:text-zinc-500">
                    {relativeTime(referral.acceptedAt)}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Today's ANC Visits */}
      <div className="rounded-[1.25rem] border border-zinc-300 bg-[#ffeedb] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:border-zinc-700 dark:bg-orange-950/40">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
            Today&apos;s ANC Visits
          </h3>
          <Link
            href="/dashboard/nurse/patients"
            className="rounded-md border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-600 dark:border-zinc-800 dark:text-zinc-300"
          >
            View Weekly
          </Link>
        </div>
        {todaysVisits.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
            No visits recorded today.
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {todaysVisits.map(({ visit, patient }) => {
              if (!patient) return null;
              return (
                <Link
                  key={visit.id}
                  href={`/dashboard/nurse/patients/${patient.id}`}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                >
                  <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                    {patient.name}
                  </p>
                  <RiskBadge level={visit.riskLevel} size="sm" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run the dev server and manually verify**

```bash
pnpm dev
```

Open `http://localhost:3000`, log in as Nurse (ANC):

**Following Module:**
- Should show Claudine Mukeshimana (yellow — teenage + controlled-htn) and Solange Ingabire (yellow — multiple-gestation). Both have yellow latest visits.
- Reason line should read "High risk — close follow-up" for each.

**Active Referrals:**
- If you accepted Aline Uwimana in Task 4, she should appear here with "Xw gestation" and a relative time stamp.
- "View all" link should navigate to `/dashboard/nurse/patients`.

**Today's ANC Visits:**
- Will show "No visits recorded today." unless you log a new visit dated today from a patient's Signs & Symptoms tab.
- To test: open any patient → Signs & Symptoms tab → leave date as today → save. Return to dashboard — the patient should appear in Today's ANC Visits with their risk badge.

**View Weekly button:**
- Should navigate to `/dashboard/nurse/patients` (not disabled).

- [ ] **Step 3: Verify TypeScript build**

```bash
pnpm build 2>&1 | grep -E "error|Error" | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/side-panel.tsx
git commit -m "feat: wire SidePanel to live referral, follow-up, and today's visit data"
```
