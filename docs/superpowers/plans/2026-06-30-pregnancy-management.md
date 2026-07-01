# Pregnancy Management UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `Pregnancy` record (LMP/EDD/obstetric history), a lightweight `AncVisit` attendance log scoped to it, and a "Pregnancy" tab on the patient detail page that shows a summary card and a merged timeline (ANC visits, clinical Assessments, Referrals, derived milestones).

**Architecture:** Two new domain types (`Pregnancy`, `AncVisit`) follow the existing localStorage-backed store pattern already used for `Patient`/`Visit`/`Referral` (`storage.ts` → `use-patients.ts` hooks). A new pure helper module (`pregnancy.ts`) computes EDD, gestational age, and derived ANC milestones with no React/storage dependency, so it's trivial to verify in isolation. UI is three new components (`NewPregnancyModal`, `AddAncVisitModal`, `PregnancyTimeline`) composed by a `PregnancyTab`, wired into the existing tab bar on the patient detail page exactly like the "New Assessment" tab was.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict mode, Tailwind v4. No test runner configured — verification is `pnpm build` (type-checks) + `pnpm lint`, plus a scripted browser check (Playwright driving system Chrome) for the final UI task, matching how the "wire SidePanel to live data" and "vitals wizard" work in this repo was verified.

## Global Constraints

- A patient can have at most one **active** pregnancy; `Pregnancy.status` is always `"active"` in this slice (no close/end UI).
- The existing clinical `Visit` type and `recordVisit()` are untouched.
- No new routes — `New Pregnancy` and `Add ANC Visit` are modals; the timeline lives in a new tab on the existing patient detail page, not a separate route.
- ANC schedule (fixed, for milestone derivation): visit 1 due by 12 weeks, visit 2 by 26 weeks, visit 3 by 30 weeks, visit 4 by 36 weeks.
- EDD = LMP + 280 days, computed once at creation and stored.
- Path alias `@/*` → `src/*`.

---

## Task 1: Pregnancy/AncVisit types and pure date helpers

**Files:**
- Modify: `src/lib/patients/types.ts`
- Create: `src/lib/patients/pregnancy.ts`

**Interfaces:**
- Produces (for all later tasks):
  - `Pregnancy` and `AncVisit` interfaces (exact shape below)
  - `computeEdd(lmpDate: string): string`
  - `gestationalAgeWeeks(lmpDate: string, asOf?: string): number`
  - `ANC_SCHEDULE: { visitNumber: number; dueByWeek: number }[]`
  - `deriveMilestones(pregnancy: Pregnancy, ancVisits: AncVisit[], asOf?: string): { id: string; visitNumber: number; dueByWeek: number; overdue: boolean }[]`

- [ ] **Step 1: Add the two new types**

In `src/lib/patients/types.ts`, append after the existing `Referral` interface:

```ts
export interface Pregnancy {
  id: string;
  patientId: string;
  gravidity: number;
  parity: number;
  previousCS: number;
  previousPPH: boolean;
  previousEclampsia: boolean;
  previousStillbirth: boolean;
  lmpDate: string; // ISO date, e.g. "2026-01-15"
  eddDate: string; // ISO date, computed = lmpDate + 280 days
  status: "active";
  createdAt: string; // ISO datetime
}

export interface AncVisit {
  id: string;
  pregnancyId: string;
  date: string; // ISO date
  ancNumber: number; // 1, 2, 3, ...
  provider: string;
  notes: string;
}
```

- [ ] **Step 2: Write the pure helper module**

Create `src/lib/patients/pregnancy.ts`:

```ts
import type { AncVisit, Pregnancy } from "./types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function computeEdd(lmpDate: string): string {
  const lmp = new Date(`${lmpDate}T00:00:00`);
  const edd = new Date(lmp.getTime() + 280 * MS_PER_DAY);
  return edd.toISOString().slice(0, 10);
}

export function gestationalAgeWeeks(lmpDate: string, asOf?: string): number {
  const lmp = new Date(`${lmpDate}T00:00:00`);
  const reference = asOf ? new Date(`${asOf}T00:00:00`) : new Date();
  const diffDays = (reference.getTime() - lmp.getTime()) / MS_PER_DAY;
  return Math.max(0, Math.floor(diffDays / 7));
}

export const ANC_SCHEDULE: { visitNumber: number; dueByWeek: number }[] = [
  { visitNumber: 1, dueByWeek: 12 },
  { visitNumber: 2, dueByWeek: 26 },
  { visitNumber: 3, dueByWeek: 30 },
  { visitNumber: 4, dueByWeek: 36 },
];

export interface Milestone {
  id: string;
  visitNumber: number;
  dueByWeek: number;
  overdue: boolean;
}

export function deriveMilestones(
  pregnancy: Pregnancy,
  ancVisits: AncVisit[],
  asOf?: string,
): Milestone[] {
  const loggedCount = ancVisits.length;
  const currentWeeks = gestationalAgeWeeks(pregnancy.lmpDate, asOf);

  return ANC_SCHEDULE.filter(
    (scheduled) => scheduled.visitNumber > loggedCount,
  ).map((scheduled) => ({
    id: `milestone-${pregnancy.id}-${scheduled.visitNumber}`,
    visitNumber: scheduled.visitNumber,
    dueByWeek: scheduled.dueByWeek,
    overdue: currentWeeks > scheduled.dueByWeek,
  }));
}
```

- [ ] **Step 3: Verify types and logic by hand**

Run:
```bash
pnpm build
```
Expected: build succeeds (this exercises the TypeScript compiler against the new file — there's no separate type-check script in this repo, see `package.json`).

Then sanity-check the date math directly with `node` (plain JS, no TS needed since the logic is simple date arithmetic — this is a one-off manual check, not a permanent script):
```bash
node -e '
const lmp = new Date("2026-01-01T00:00:00");
const edd = new Date(lmp.getTime() + 280*24*60*60*1000);
console.log(edd.toISOString().slice(0,10)); // expect 2026-10-08
'
```
Expected output: `2026-10-08`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/patients/types.ts src/lib/patients/pregnancy.ts
git commit -m "feat: add Pregnancy/AncVisit types and gestational-age helpers"
```

---

## Task 2: Storage layer for Pregnancy and AncVisit

**Files:**
- Modify: `src/lib/patients/storage.ts`

**Interfaces:**
- Consumes: `Pregnancy`, `AncVisit` from Task 1 (`src/lib/patients/types.ts`)
- Produces (for Task 3):
  - `subscribeToPregnancies(onChange: () => void): () => void`
  - `subscribeToAncVisits(onChange: () => void): () => void`
  - `getPregnanciesSnapshot(): Pregnancy[]`
  - `getAncVisitsSnapshot(): AncVisit[]`
  - `getServerPregnanciesSnapshot(): Pregnancy[]`
  - `getServerAncVisitsSnapshot(): AncVisit[]`
  - `addPregnancy(pregnancy: Pregnancy): void`
  - `addAncVisit(ancVisit: AncVisit): void`

This task mirrors the existing `Patient`/`Visit`/`Referral` pattern in this file exactly — same cache/listener/load/subscribe/snapshot/add shape, just for two more entities, with no stored seed data (both start empty, like `Referral`).

- [ ] **Step 1: Add imports and storage keys**

In `src/lib/patients/storage.ts`, change the top import line:

```ts
import type { Patient, Visit, Referral, Pregnancy, AncVisit } from "./types";
```

Add after the existing key constants:

```ts
const PREGNANCIES_KEY = "ubuntumed.pregnancies";
const ANC_VISITS_KEY = "ubuntumed.ancVisits";
```

- [ ] **Step 2: Add caches and listener sets**

Add after the existing cache/listener declarations:

```ts
let pregnanciesCache: Pregnancy[] | null = null;
let ancVisitsCache: AncVisit[] | null = null;

const pregnancyListeners = new Set<() => void>();
const ancVisitListeners = new Set<() => void>();
```

- [ ] **Step 3: Add load functions**

Add after `loadReferrals`:

```ts
function loadPregnancies(): Pregnancy[] {
  if (pregnanciesCache) return pregnanciesCache;
  const stored = readList<Pregnancy>(PREGNANCIES_KEY);
  pregnanciesCache = stored ?? [];
  if (!stored) writeList(PREGNANCIES_KEY, pregnanciesCache);
  return pregnanciesCache;
}

function loadAncVisits(): AncVisit[] {
  if (ancVisitsCache) return ancVisitsCache;
  const stored = readList<AncVisit>(ANC_VISITS_KEY);
  ancVisitsCache = stored ?? [];
  if (!stored) writeList(ANC_VISITS_KEY, ancVisitsCache);
  return ancVisitsCache;
}
```

- [ ] **Step 4: Add subscribe, snapshot, server-snapshot, and add functions**

Add after `subscribeToReferrals`:

```ts
export function subscribeToPregnancies(onChange: () => void) {
  pregnancyListeners.add(onChange);
  return () => pregnancyListeners.delete(onChange);
}

export function subscribeToAncVisits(onChange: () => void) {
  ancVisitListeners.add(onChange);
  return () => ancVisitListeners.delete(onChange);
}
```

Add after `getReferralsSnapshot`:

```ts
export function getPregnanciesSnapshot(): Pregnancy[] {
  return loadPregnancies();
}

export function getAncVisitsSnapshot(): AncVisit[] {
  return loadAncVisits();
}
```

Add after `getServerReferralsSnapshot`:

```ts
export function getServerPregnanciesSnapshot(): Pregnancy[] {
  return [];
}

export function getServerAncVisitsSnapshot(): AncVisit[] {
  return [];
}
```

Add after `addReferral`:

```ts
export function addPregnancy(pregnancy: Pregnancy) {
  pregnanciesCache = [...loadPregnancies(), pregnancy];
  writeList(PREGNANCIES_KEY, pregnanciesCache);
  pregnancyListeners.forEach((listener) => listener());
}

export function addAncVisit(ancVisit: AncVisit) {
  ancVisitsCache = [...loadAncVisits(), ancVisit];
  writeList(ANC_VISITS_KEY, ancVisitsCache);
  ancVisitListeners.forEach((listener) => listener());
}
```

- [ ] **Step 5: Verify**

```bash
pnpm build
pnpm lint
```
Expected: both succeed with no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/patients/storage.ts
git commit -m "feat: add localStorage-backed storage for pregnancies and ANC visits"
```

---

## Task 3: Hooks — usePregnancyForPatient, createPregnancy, useAncVisitsForPregnancy, recordAncVisit

**Files:**
- Modify: `src/lib/patients/use-patients.ts`

**Interfaces:**
- Consumes: storage functions from Task 2; `Pregnancy`, `AncVisit` types from Task 1
- Produces (for Tasks 4-6):
  - `usePregnancyForPatient(patientId: string): Pregnancy | null`
  - `createPregnancy(data: Omit<Pregnancy, "id" | "eddDate" | "status" | "createdAt">): Pregnancy` — throws `Error("Patient already has an active pregnancy")` if one exists
  - `useAncVisitsForPregnancy(pregnancyId: string): AncVisit[]` — sorted newest-first by `date`
  - `recordAncVisit(data: Omit<AncVisit, "id">): AncVisit`

- [ ] **Step 1: Update imports**

In `src/lib/patients/use-patients.ts`, change the storage import block to:

```ts
import {
  addPatient,
  addReferral,
  addVisit,
  addPregnancy,
  addAncVisit,
  getPatientsSnapshot,
  getReferralsSnapshot,
  getServerPatientsSnapshot,
  getServerReferralsSnapshot,
  getServerVisitsSnapshot,
  getServerPregnanciesSnapshot,
  getServerAncVisitsSnapshot,
  getVisitsSnapshot,
  getPregnanciesSnapshot,
  getAncVisitsSnapshot,
  subscribeToPatients,
  subscribeToReferrals,
  subscribeToVisits,
  subscribeToPregnancies,
  subscribeToAncVisits,
} from "./storage";
```

And change the type import line to:

```ts
import { classifyRiskLevel } from "./symptom-checklist";
import { computeEdd } from "./pregnancy";
import type {
  Patient,
  Referral,
  RiskLevel,
  Visit,
  VisitLabs,
  Pregnancy,
  AncVisit,
} from "./types";
```

- [ ] **Step 2: Add usePregnancies/useAncVisits base hooks and the per-patient/per-pregnancy hooks**

Add after `useReferrals` (right before `useActiveReferrals` — placement doesn't matter functionally, but keep related hooks grouped):

```ts
export function usePregnancies(): Pregnancy[] {
  return useSyncExternalStore(
    subscribeToPregnancies,
    getPregnanciesSnapshot,
    getServerPregnanciesSnapshot,
  );
}

export function useAncVisits(): AncVisit[] {
  return useSyncExternalStore(
    subscribeToAncVisits,
    getAncVisitsSnapshot,
    getServerAncVisitsSnapshot,
  );
}

export function usePregnancyForPatient(patientId: string): Pregnancy | null {
  const pregnancies = usePregnancies();
  return useMemo(
    () =>
      pregnancies.find(
        (pregnancy) =>
          pregnancy.patientId === patientId && pregnancy.status === "active",
      ) ?? null,
    [pregnancies, patientId],
  );
}

export function useAncVisitsForPregnancy(pregnancyId: string): AncVisit[] {
  const ancVisits = useAncVisits();
  return useMemo(
    () =>
      ancVisits
        .filter((visit) => visit.pregnancyId === pregnancyId)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [ancVisits, pregnancyId],
  );
}
```

- [ ] **Step 3: Add createPregnancy and recordAncVisit**

Add at the end of the file, after `recordVisit`:

```ts
export function createPregnancy(
  data: Omit<Pregnancy, "id" | "eddDate" | "status" | "createdAt">,
): Pregnancy {
  const existing = getPregnanciesSnapshot().find(
    (pregnancy) =>
      pregnancy.patientId === data.patientId && pregnancy.status === "active",
  );
  if (existing) {
    throw new Error("Patient already has an active pregnancy");
  }

  const pregnancy: Pregnancy = {
    ...data,
    id: `pregnancy-${crypto.randomUUID()}`,
    eddDate: computeEdd(data.lmpDate),
    status: "active",
    createdAt: new Date().toISOString(),
  };
  addPregnancy(pregnancy);
  return pregnancy;
}

export function recordAncVisit(data: Omit<AncVisit, "id">): AncVisit {
  const ancVisit: AncVisit = {
    ...data,
    id: `anc-visit-${crypto.randomUUID()}`,
  };
  addAncVisit(ancVisit);
  return ancVisit;
}
```

- [ ] **Step 4: Verify**

```bash
pnpm build
pnpm lint
```
Expected: both succeed. `pnpm build` will fail with a type error if `pregnancy.ts`'s `computeEdd` signature doesn't match the call here — if so, re-check Task 1's signature (`computeEdd(lmpDate: string): string`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/patients/use-patients.ts
git commit -m "feat: add pregnancy and ANC visit hooks"
```

---

## Task 4: NewPregnancyModal

**Files:**
- Create: `src/components/patients/pregnancy/new-pregnancy-modal.tsx`

**Interfaces:**
- Consumes: `createPregnancy` from Task 3 (`@/lib/patients/use-patients`); `gestationalAgeWeeks`, `computeEdd` from Task 1 (`@/lib/patients/pregnancy`); `Pregnancy` type; `IconClose` from `@/components/dashboard/icons`
- Produces (for Task 7): `NewPregnancyModal({ patientId, onClose, onCreated }: { patientId: string; onClose: () => void; onCreated: (pregnancy: Pregnancy) => void })`

This follows the same modal shell as `src/components/patients/register-patient-modal.tsx` (cream card, Escape-to-close, two-button footer) — read that file for the exact classNames before writing this one if anything below is ambiguous.

- [ ] **Step 1: Write the component**

Create `src/components/patients/pregnancy/new-pregnancy-modal.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { createPregnancy } from "@/lib/patients/use-patients";
import { computeEdd, gestationalAgeWeeks } from "@/lib/patients/pregnancy";
import { IconClose } from "@/components/dashboard/icons";
import type { Pregnancy } from "@/lib/patients/types";

export function NewPregnancyModal({
  patientId,
  onClose,
  onCreated,
}: {
  patientId: string;
  onClose: () => void;
  onCreated: (pregnancy: Pregnancy) => void;
}) {
  const [gravidity, setGravidity] = useState("");
  const [parity, setParity] = useState("");
  const [previousCS, setPreviousCS] = useState("0");
  const [previousPPH, setPreviousPPH] = useState(false);
  const [previousEclampsia, setPreviousEclampsia] = useState(false);
  const [previousStillbirth, setPreviousStillbirth] = useState(false);
  const [lmpDate, setLmpDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const edd = lmpDate ? computeEdd(lmpDate) : null;
  const weeks = lmpDate ? gestationalAgeWeeks(lmpDate) : null;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      const pregnancy = createPregnancy({
        patientId,
        gravidity: Number(gravidity),
        parity: Number(parity),
        previousCS: Number(previousCS),
        previousPPH,
        previousEclampsia,
        previousStillbirth,
        lmpDate,
      });
      onCreated(pregnancy);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not create pregnancy",
      );
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
      />

      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-300 bg-[#ffeedb] p-6 shadow-2xl dark:border-zinc-700 dark:bg-orange-950/40">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            New Pregnancy
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-5 flex flex-col gap-4 rounded-xl border border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
        >
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </p>
          )}

          <div className="flex gap-4">
            <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Gravidity
              <input
                type="number"
                required
                min={1}
                value={gravidity}
                onChange={(event) => setGravidity(event.target.value)}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Parity
              <input
                type="number"
                required
                min={0}
                value={parity}
                onChange={(event) => setParity(event.target.value)}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Previous C-sections
            <input
              type="number"
              required
              min={0}
              value={previousCS}
              onChange={(event) => setPreviousCS(event.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>

          <div className="flex flex-col gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={previousPPH}
                onChange={(event) => setPreviousPPH(event.target.checked)}
                className="h-4 w-4 rounded border-zinc-300"
              />
              Previous postpartum hemorrhage (PPH)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={previousEclampsia}
                onChange={(event) => setPreviousEclampsia(event.target.checked)}
                className="h-4 w-4 rounded border-zinc-300"
              />
              Previous eclampsia
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={previousStillbirth}
                onChange={(event) =>
                  setPreviousStillbirth(event.target.checked)
                }
                className="h-4 w-4 rounded border-zinc-300"
              />
              Previous stillbirth
            </label>
          </div>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Last menstrual period (LMP)
            <input
              type="date"
              required
              value={lmpDate}
              onChange={(event) => setLmpDate(event.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>

          {lmpDate && (
            <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
              <span>Estimated due date</span>
              <span className="font-medium text-zinc-900 dark:text-zinc-50">
                {edd} · {weeks}w now
              </span>
            </div>
          )}

          <div className="mt-2 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-[#0f766e] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-800"
            >
              Create Pregnancy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

```bash
pnpm build
pnpm lint
```
Expected: both succeed. This component isn't wired into any page yet, so this only confirms it type-checks and lints cleanly.

- [ ] **Step 3: Commit**

```bash
git add src/components/patients/pregnancy/new-pregnancy-modal.tsx
git commit -m "feat: add NewPregnancyModal component"
```

---

## Task 5: AddAncVisitModal

**Files:**
- Create: `src/components/patients/pregnancy/add-anc-visit-modal.tsx`

**Interfaces:**
- Consumes: `recordAncVisit` from Task 3; `IconClose` from `@/components/dashboard/icons`; `AncVisit` type
- Produces (for Task 7): `AddAncVisitModal({ pregnancyId, suggestedAncNumber, onClose, onRecorded }: { pregnancyId: string; suggestedAncNumber: number; onClose: () => void; onRecorded: (visit: AncVisit) => void })`

- [ ] **Step 1: Write the component**

Create `src/components/patients/pregnancy/add-anc-visit-modal.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { recordAncVisit } from "@/lib/patients/use-patients";
import { IconClose } from "@/components/dashboard/icons";
import type { AncVisit } from "@/lib/patients/types";

export function AddAncVisitModal({
  pregnancyId,
  suggestedAncNumber,
  onClose,
  onRecorded,
}: {
  pregnancyId: string;
  suggestedAncNumber: number;
  onClose: () => void;
  onRecorded: (visit: AncVisit) => void;
}) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [ancNumber, setAncNumber] = useState(String(suggestedAncNumber));
  const [provider, setProvider] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const visit = recordAncVisit({
      pregnancyId,
      date,
      ancNumber: Number(ancNumber),
      provider,
      notes,
    });
    onRecorded(visit);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
      />

      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-300 bg-[#ffeedb] p-6 shadow-2xl dark:border-zinc-700 dark:bg-orange-950/40">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            Add ANC Visit
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-5 flex flex-col gap-4 rounded-xl border border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <div className="flex gap-4">
            <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Visit date
              <input
                type="date"
                required
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              ANC number
              <input
                type="number"
                required
                min={1}
                value={ancNumber}
                onChange={(event) => setAncNumber(event.target.value)}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Attending provider
            <input
              type="text"
              required
              value={provider}
              onChange={(event) => setProvider(event.target.value)}
              placeholder="e.g. Nurse Uwase"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Notes
            <textarea
              rows={2}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="e.g. No alarming signs, counseled on nutrition"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>

          <div className="mt-2 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-[#0f766e] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-800"
            >
              Save Visit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

```bash
pnpm build
pnpm lint
```
Expected: both succeed.

- [ ] **Step 3: Commit**

```bash
git add src/components/patients/pregnancy/add-anc-visit-modal.tsx
git commit -m "feat: add AddAncVisitModal component"
```

---

## Task 6: PregnancyTimeline

**Files:**
- Create: `src/components/patients/pregnancy/pregnancy-timeline.tsx`

**Interfaces:**
- Consumes: `Pregnancy`, `AncVisit`, `Visit`, `Referral` types; `deriveMilestones` from `@/lib/patients/pregnancy`; `RiskBadge` from `@/components/patients/risk-badge`
- Produces (for Task 7): `PregnancyTimeline({ pregnancy, ancVisits, visits, referrals }: { pregnancy: Pregnancy; ancVisits: AncVisit[]; visits: Visit[]; referrals: Referral[] })`

Merges four item kinds newest-first, click-to-expand inline detail (one item open at a time, toggled via local `useState<string | null>`).

- [ ] **Step 1: Write the component**

Create `src/components/patients/pregnancy/pregnancy-timeline.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import { deriveMilestones } from "@/lib/patients/pregnancy";
import { RiskBadge } from "@/components/patients/risk-badge";
import { formatLabs } from "@/lib/format";
import type { AncVisit, Pregnancy, Referral, Visit } from "@/lib/patients/types";

type TimelineItem =
  | { kind: "anc-visit"; id: string; date: string; data: AncVisit }
  | { kind: "assessment"; id: string; date: string; data: Visit }
  | { kind: "referral"; id: string; date: string; data: Referral }
  | {
      kind: "milestone";
      id: string;
      date: null;
      data: { visitNumber: number; dueByWeek: number; overdue: boolean };
    };

function itemLabel(item: TimelineItem): string {
  switch (item.kind) {
    case "anc-visit":
      return `ANC visit ${item.data.ancNumber} logged`;
    case "assessment":
      return `Assessment recorded — classified ${item.data.riskLevel}`;
    case "referral":
      return "Referral accepted";
    case "milestone":
      return `ANC visit ${item.data.visitNumber} of 4 recommended — due by week ${item.data.dueByWeek}`;
  }
}

export function PregnancyTimeline({
  pregnancy,
  ancVisits,
  visits,
  referrals,
}: {
  pregnancy: Pregnancy;
  ancVisits: AncVisit[];
  visits: Visit[];
  referrals: Referral[];
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const items = useMemo<TimelineItem[]>(() => {
    const milestones = deriveMilestones(pregnancy, ancVisits).map(
      (milestone) =>
        ({
          kind: "milestone",
          id: milestone.id,
          date: null,
          data: milestone,
        }) satisfies TimelineItem,
    );

    const dated: TimelineItem[] = [
      ...ancVisits.map(
        (visit) =>
          ({
            kind: "anc-visit",
            id: visit.id,
            date: visit.date,
            data: visit,
          }) satisfies TimelineItem,
      ),
      ...visits.map(
        (visit) =>
          ({
            kind: "assessment",
            id: visit.id,
            date: visit.date,
            data: visit,
          }) satisfies TimelineItem,
      ),
      ...referrals.map(
        (referral) =>
          ({
            kind: "referral",
            id: referral.id,
            date: referral.acceptedAt.slice(0, 10),
            data: referral,
          }) satisfies TimelineItem,
      ),
    ].sort((a, b) => b.date.localeCompare(a.date));

    return [...milestones, ...dated];
  }, [pregnancy, ancVisits, visits, referrals]);

  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        No timeline activity yet.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-3 border-l border-zinc-200 pl-4 dark:border-zinc-800">
      {items.map((item) => {
        const expanded = expandedId === item.id;
        return (
          <li key={item.id} className="relative text-sm">
            <span
              aria-hidden
              className={`absolute -left-[1.05rem] top-1.5 h-2 w-2 rounded-full ${
                item.kind === "milestone" && item.data.overdue
                  ? "bg-orange-500"
                  : "bg-teal-700"
              }`}
            />
            <button
              type="button"
              onClick={() => setExpandedId(expanded ? null : item.id)}
              className="flex w-full items-center justify-between gap-2 text-left"
            >
              <span className="text-zinc-700 dark:text-zinc-300">
                {itemLabel(item)}
              </span>
              {item.kind === "assessment" && (
                <RiskBadge level={item.data.riskLevel} size="sm" />
              )}
            </button>
            <p className="text-xs text-zinc-400">{item.date ?? "Upcoming"}</p>

            {expanded && (
              <div className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                {item.kind === "anc-visit" && (
                  <>
                    <p>Provider: {item.data.provider || "—"}</p>
                    <p>Notes: {item.data.notes || "—"}</p>
                  </>
                )}
                {item.kind === "assessment" && (
                  <p>Labs: {formatLabs(item.data)}</p>
                )}
                {item.kind === "referral" && (
                  <p>Accepted at: {item.data.acceptedAt}</p>
                )}
                {item.kind === "milestone" && (
                  <p>
                    {item.data.overdue
                      ? "This visit is overdue."
                      : "This visit has not been logged yet."}
                  </p>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
```

- [ ] **Step 2: Verify**

```bash
pnpm build
pnpm lint
```
Expected: both succeed.

- [ ] **Step 3: Commit**

```bash
git add src/components/patients/pregnancy/pregnancy-timeline.tsx
git commit -m "feat: add PregnancyTimeline component"
```

---

## Task 7: PregnancyTab and wiring into the patient detail page

**Files:**
- Create: `src/components/patients/pregnancy-tab.tsx`
- Modify: `src/app/dashboard/nurse/patients/[id]/page.tsx`

**Interfaces:**
- Consumes: `usePregnancyForPatient`, `useAncVisitsForPregnancy` from Task 3; `NewPregnancyModal` from Task 4; `AddAncVisitModal` from Task 5; `PregnancyTimeline` from Task 6; `gestationalAgeWeeks` from Task 1; `useVisitsForPatient`, `useReferrals` (existing, from `@/lib/patients/use-patients`)
- Produces: `PregnancyTab({ patientId }: { patientId: string })` — the tab content component, plus the modified patient detail page with the new tab wired in and gestational age display updated.

- [ ] **Step 1: Write PregnancyTab**

Create `src/components/patients/pregnancy-tab.tsx`:

```tsx
"use client";

import { useState } from "react";
import {
  usePregnancyForPatient,
  useAncVisitsForPregnancy,
  useVisitsForPatient,
  useReferrals,
} from "@/lib/patients/use-patients";
import { gestationalAgeWeeks } from "@/lib/patients/pregnancy";
import { NewPregnancyModal } from "@/components/patients/pregnancy/new-pregnancy-modal";
import { AddAncVisitModal } from "@/components/patients/pregnancy/add-anc-visit-modal";
import { PregnancyTimeline } from "@/components/patients/pregnancy/pregnancy-timeline";

export function PregnancyTab({ patientId }: { patientId: string }) {
  const pregnancy = usePregnancyForPatient(patientId);
  const ancVisits = useAncVisitsForPregnancy(pregnancy?.id ?? "");
  const visits = useVisitsForPatient(patientId);
  const referrals = useReferrals().filter((r) => r.patientId === patientId);

  const [showNewPregnancy, setShowNewPregnancy] = useState(false);
  const [showAddVisit, setShowAddVisit] = useState(false);

  if (!pregnancy) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-10 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          This patient has no active pregnancy on record.
        </p>
        <button
          type="button"
          onClick={() => setShowNewPregnancy(true)}
          className="rounded-lg bg-[#0f766e] px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
        >
          New Pregnancy
        </button>

        {showNewPregnancy && (
          <NewPregnancyModal
            patientId={patientId}
            onClose={() => setShowNewPregnancy(false)}
            onCreated={() => setShowNewPregnancy(false)}
          />
        )}
      </div>
    );
  }

  const weeks = gestationalAgeWeeks(pregnancy.lmpDate);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900 sm:grid-cols-2">
        <p>
          <span className="text-zinc-400">Gravidity / Parity</span>
          <br />
          <span className="font-medium text-zinc-900 dark:text-zinc-50">
            G{pregnancy.gravidity} P{pregnancy.parity}
          </span>
        </p>
        <p>
          <span className="text-zinc-400">Previous C-sections</span>
          <br />
          <span className="font-medium text-zinc-900 dark:text-zinc-50">
            {pregnancy.previousCS}
          </span>
        </p>
        <p>
          <span className="text-zinc-400">LMP</span>
          <br />
          <span className="font-medium text-zinc-900 dark:text-zinc-50">
            {pregnancy.lmpDate}
          </span>
        </p>
        <p>
          <span className="text-zinc-400">EDD</span>
          <br />
          <span className="font-medium text-zinc-900 dark:text-zinc-50">
            {pregnancy.eddDate}
          </span>
        </p>
        <p>
          <span className="text-zinc-400">Gestational age</span>
          <br />
          <span className="font-medium text-zinc-900 dark:text-zinc-50">
            {weeks} weeks
          </span>
        </p>
        <div className="flex flex-wrap items-start gap-1.5">
          {pregnancy.previousPPH && (
            <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700 dark:bg-orange-950/30 dark:text-orange-400">
              Previous PPH
            </span>
          )}
          {pregnancy.previousEclampsia && (
            <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700 dark:bg-orange-950/30 dark:text-orange-400">
              Previous eclampsia
            </span>
          )}
          {pregnancy.previousStillbirth && (
            <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700 dark:bg-orange-950/30 dark:text-orange-400">
              Previous stillbirth
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowAddVisit(true)}
        className="w-fit rounded-lg bg-[#0f766e] px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
      >
        Add ANC Visit
      </button>

      <PregnancyTimeline
        pregnancy={pregnancy}
        ancVisits={ancVisits}
        visits={visits}
        referrals={referrals}
      />

      {showAddVisit && (
        <AddAncVisitModal
          pregnancyId={pregnancy.id}
          suggestedAncNumber={ancVisits.length + 1}
          onClose={() => setShowAddVisit(false)}
          onRecorded={() => setShowAddVisit(false)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire the tab and gestational-age fallback into the patient detail page**

In `src/app/dashboard/nurse/patients/[id]/page.tsx`, add the import (after the `AssessmentWizard` import):

```ts
import { PregnancyTab } from "@/components/patients/pregnancy-tab";
```

And add to the existing hooks import line — change:
```ts
import { usePatient, useVisitsForPatient } from "@/lib/patients/use-patients";
```
to:
```ts
import {
  usePatient,
  useVisitsForPatient,
  usePregnancyForPatient,
} from "@/lib/patients/use-patients";
```

Add this import:
```ts
import { gestationalAgeWeeks } from "@/lib/patients/pregnancy";
```

Change the `TABS` constant:
```ts
const TABS = [
  "Patient Details",
  "Signs & Symptoms",
  "New Assessment",
  "Pregnancy",
  "Classification",
  "Visit History",
] as const;
```

Inside `PatientDetailContent`, after the existing `const visits = useVisitsForPatient(patientId);` line, add:
```ts
  const pregnancy = usePregnancyForPatient(patientId);
```

Change the gestational-age display line — find:
```tsx
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {patient.age} years • {patient.gestationalAgeWeeks} weeks gestation
            </p>
```
replace with:
```tsx
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {patient.age} years •{" "}
              {pregnancy
                ? gestationalAgeWeeks(pregnancy.lmpDate)
                : patient.gestationalAgeWeeks}{" "}
              weeks gestation
            </p>
```

Add the new tab's content block — find:
```tsx
        {activeTab === "New Assessment" && <AssessmentWizard />}
```
and add immediately after it:
```tsx
        {activeTab === "Pregnancy" && <PregnancyTab patientId={patient.id} />}
```

- [ ] **Step 3: Verify with build and lint**

```bash
pnpm build
pnpm lint
```
Expected: both succeed with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/patients/pregnancy-tab.tsx src/app/dashboard/nurse/patients/[id]/page.tsx
git commit -m "feat: add Pregnancy tab to patient detail page"
```

---

## Task 8: End-to-end browser verification

**Files:** none (verification only)

This task drives the running app the same way the dashboard side-panel check earlier in this session did: `playwright-core` controlling the system-installed Google Chrome (`/usr/bin/google-chrome`), since this environment has no `playwright` browsers pre-downloaded and no test runner configured.

- [ ] **Step 1: Confirm the dev server is up and find its port**

```bash
pgrep -fl "next dev" || pnpm dev &
for p in 3000 3001 3002; do code=$(curl -s -o /dev/null -m 1 -w "%{http_code}" http://localhost:$p/login); echo "$p: $code"; done
```
Expected: one port returns `200`. Use that port below (it was `3001` earlier in this session, but confirm — it can shift between dev server restarts).

- [ ] **Step 2: Write and run the verification script**

Create `/tmp/claude-1000/-home-ebenezer-Projects-ubuntumed/26eef4ec-72f8-4b49-8c57-c7aec9f6f036/scratchpad/pw-verify/verify-pregnancy.js` (reuse the existing `pw-verify` directory and its already-installed `playwright-core` dependency):

```js
const { chromium } = require("playwright-core");

const PORT = process.env.PORT || "3001"; // set to whatever Step 1 found

(async () => {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/google-chrome",
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();
  page.on("pageerror", (err) => console.log("PAGEERROR:", err.message));

  await page.goto(`http://localhost:${PORT}/login`, { waitUntil: "networkidle" });
  await page.getByPlaceholder("Enter your password").fill("nurse123");
  await page.getByRole("button", { name: /log in/i }).click();
  await page.waitForLoadState("networkidle");

  // Navigate to a seeded patient's detail page via Patient Registry
  await page.getByRole("link", { name: /patient registry/i }).click();
  await page.waitForLoadState("networkidle");
  await page.locator("a[href^='/dashboard/nurse/patients/patient-']").first().click();
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Pregnancy" }).click();
  await page.screenshot({ path: "10-pregnancy-empty.png" });

  await page.getByRole("button", { name: "New Pregnancy" }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "11-new-pregnancy-modal.png" });

  await page.getByLabel(/gravidity/i).fill("2");
  await page.getByLabel(/^parity/i).fill("1");
  await page.locator("input[type=date]").fill("2026-01-01");
  await page.waitForTimeout(200);
  await page.screenshot({ path: "12-new-pregnancy-filled.png" });

  await page.getByRole("button", { name: "Create Pregnancy" }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "13-pregnancy-summary.png" });

  await page.getByRole("button", { name: "Add ANC Visit" }).click();
  await page.waitForTimeout(300);
  await page.getByLabel(/attending provider/i).fill("Nurse Uwase");
  await page.getByRole("button", { name: "Save Visit" }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "14-pregnancy-with-visit.png", fullPage: true });

  const bodyText = await page.evaluate(() => document.body.innerText);
  require("fs").writeFileSync("pregnancy-tab-text.txt", bodyText);

  await browser.close();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

Run it:
```bash
cd /tmp/claude-1000/-home-ebenezer-Projects-ubuntumed/26eef4ec-72f8-4b49-8c57-c7aec9f6f036/scratchpad/pw-verify
PORT=3001 node verify-pregnancy.js
```
(Replace `3001` with whatever port Step 1 found.)

Expected: exits 0, no `PAGEERROR` lines printed.

- [ ] **Step 3: Inspect the screenshots and text dump**

Read each generated PNG (`10-pregnancy-empty.png` through `14-pregnancy-with-visit.png`) and confirm:
- `10`: empty state with "New Pregnancy" button.
- `11`/`12`: modal renders all fields, EDD/weeks preview appears after LMP is filled.
- `13`: summary card shows G2 P1, LMP `2026-01-01`, EDD `2026-10-08`, gestational age in weeks, and an "Add ANC Visit" button.
- `14`: timeline shows the "ANC visit 1 logged" entry and the remaining derived milestones (visits 2-4, since only 1 was logged).

Read `pregnancy-tab-text.txt` and confirm it contains `"ANC visit 1 logged"` and at least one `"due by week"` milestone line.

- [ ] **Step 4: Report results**

No commit for this task — it's verification only. If any expectation in Step 3 fails, stop and fix the relevant earlier task before proceeding (per executing-plans: don't force through a failing verification).

---

## Self-Review Notes

- **Spec coverage:** Data model (Task 1), storage (Task 2), hooks incl. active-pregnancy guard (Task 3), New Pregnancy modal with live EDD/GA preview (Task 4), Add ANC Visit modal (Task 5), 4-item-kind timeline with derived milestones and inline expand (Task 6), tab placement + gestational-age fallback (Task 7), manual verification (Task 8) — every spec section maps to a task.
- **Placeholder scan:** No TBD/TODO; all steps contain full code.
- **Type consistency checked:** `Pregnancy`/`AncVisit` field names match across `types.ts` (Task 1), `storage.ts` (Task 2), `use-patients.ts` (Task 3), and all consuming components (Tasks 4-7). `computeEdd`/`gestationalAgeWeeks`/`deriveMilestones` signatures from Task 1 are used identically in Tasks 3, 4, 6, 7. `usePregnancyForPatient` returns `Pregnancy | null` consistently used with `pregnancy ? ... : ...` guards in Tasks 6 and 7.
