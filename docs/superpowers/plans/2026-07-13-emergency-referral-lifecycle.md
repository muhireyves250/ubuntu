# Emergency Referral Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-step "auto-accepted referral" with a real pending → accepted → closed lifecycle, scoped to the receiving facility, owned by the nurse who accepts it, closed with a recovered/died outcome — plus two small bundled cleanups (tab reorder, surfacing dead `treatment`/`followUpPlan` fields).

**Architecture:** `Referral` gains a real status enum and lifecycle fields. A single shared helper (`getOrCreateEmergencyReferral`) is called both by the Signs & Symptoms emergency path and by any visit that classifies RED, so both converge on identical pending-referral behavior. `RedCaseAlertPanel` becomes a direct, facility-scoped read of pending referrals instead of deriving "red patients without a referral" from raw visit data.

**Tech Stack:** Next.js App Router, React, TypeScript strict, Tailwind CSS v4, pnpm. No test runner — verify via `pnpm exec tsc --noEmit` and `pnpm exec eslint .`.

## Global Constraints

- Work directly on `main` (explicit user consent already given this session) — do NOT create a worktree or new branch.
- Do NOT push — the user pushes themselves after reviewing.
- Every task ends with `pnpm exec tsc --noEmit` scoped to that task's files, plus a commit.
- Follow existing Tailwind class conventions exactly (copy sibling components' classes rather than inventing new ones).
- `pnpm` only, never npm/yarn/bun.

---

### Task 1: `Referral` type overhaul

**Files:**
- Modify: `src/lib/patients/types.ts`

**Interfaces:**
- Produces: `ReferralStatus`, `ReferralOutcome`, updated `Referral` interface — consumed by every later task in this plan.

- [ ] **Step 1: Replace the `Referral` interface**

Find (around line 67):

```ts
export interface Referral {
  id: string;
  patientId: string;
  acceptedAt: string;
  status: "active";
  receivingFacility?: string;
  reason?: string;
  urgency?: "routine" | "urgent" | "emergency";
}
```

Replace with:

```ts
export type ReferralStatus = "pending" | "accepted" | "closed";
export type ReferralOutcome = "recovered" | "died";

export interface Referral {
  id: string;
  patientId: string;
  createdAt: string;
  status: ReferralStatus;
  receivingFacility: string;
  reason: string;
  urgency: "routine" | "urgent" | "emergency";
  referredByNurse: string;
  referredByFacility: string;
  acceptedAt?: string;
  acceptedByNurse?: string;
  acceptedByFacility?: string;
  closedAt?: string;
  outcome?: ReferralOutcome;
  outcomeStatement?: string;
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: errors everywhere this type is used (storage.ts, use-patients.ts, red-case-alert.tsx, create-referral-modal.tsx, nurse/referrals/page.tsx, pregnancy-timeline.tsx) — all expected, fixed in later tasks of this plan.

- [ ] **Step 3: Commit**

```bash
git add src/lib/patients/types.ts
git commit -m "refactor(referrals): give Referral a real pending/accepted/closed lifecycle"
```

---

### Task 2: Storage layer — `updateReferral` + stale-shape guard

**Files:**
- Modify: `src/lib/patients/storage.ts`

**Interfaces:**
- Consumes: `Referral` (Task 1).
- Produces: `updateReferral(referralId: string, updates: Partial<Referral>): void` — consumed by Task 3.

- [ ] **Step 1: Add `updateReferral`**, following the exact pattern of `updatePregnancy`:

```ts
export function updateReferral(referralId: string, updates: Partial<Referral>) {
  referralsCache = loadReferrals().map((r) =>
    r.id === referralId ? { ...r, ...updates } : r,
  );
  writeList(REFERRALS_KEY, referralsCache);
  referralListeners.forEach((listener) => listener());
}
```

Add this directly after the existing `updatePregnancy` function.

- [ ] **Step 2: Add a stale-shape guard for referrals**, following the pattern already used for `isCurrentShapePatient`/`isCurrentShapeVisit`/`isCurrentShapePregnancy` (added in a prior session to auto-discard old-shape cached `localStorage` data — the `Referral` shape just changed again in Task 1, so old cached referrals from before this plan need the same treatment):

Find:

```ts
function loadReferrals(): Referral[] {
  if (referralsCache) return referralsCache;
  const stored = readList<Referral>(REFERRALS_KEY);
  referralsCache = stored ?? [];
  if (!stored) writeList(REFERRALS_KEY, referralsCache);
  return referralsCache;
}
```

Replace with:

```ts
function isCurrentShapeReferral(referral: Referral): boolean {
  return (
    typeof referral.createdAt === "string" &&
    typeof referral.referredByNurse === "string" &&
    typeof referral.referredByFacility === "string"
  );
}

function loadReferrals(): Referral[] {
  if (referralsCache) return referralsCache;
  const stored = readList<Referral>(REFERRALS_KEY);
  const usable = stored && stored.every(isCurrentShapeReferral) ? stored : null;
  referralsCache = usable ?? [];
  if (!usable) writeList(REFERRALS_KEY, referralsCache);
  return referralsCache;
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors from `storage.ts` itself; other files still show expected Task-1 breakage.

- [ ] **Step 4: Commit**

```bash
git add src/lib/patients/storage.ts
git commit -m "feat(referrals): add updateReferral, discard stale-shape cached referrals"
```

---

### Task 3: `use-patients.ts` referral logic rewrite

**Files:**
- Modify: `src/lib/patients/use-patients.ts`

**Interfaces:**
- Consumes: `updateReferral` (Task 2), `Referral`/`ReferralOutcome` (Task 1).
- Produces (exact names later tasks depend on):
  - `useActiveReferrals(): Referral[]` — now filters `status === "accepted"` (was `"active"`).
  - `acceptEmergencyReferral(referralId: string): Referral`
  - `closeReferral(referralId: string, data: { outcome: ReferralOutcome; outcomeStatement: string }): Referral`
  - `createReferral(data: { patientId: string; receivingFacility: string; reason: string; urgency: "routine" | "urgent" | "emergency" }): Referral` — the manual, auto-accepted path used by `CreateReferralModal`.
  - `recordVisit` gains `treatment?: string` and `followUpPlan?: string` on its data param, and now auto-creates a pending emergency referral whenever the computed `riskLevel === "red"`, regardless of visit type.
  - `createEmergencyVisit` unchanged in signature/return shape, internals updated.
  - `acceptReferral` is deleted — nothing calls it under the new model.

- [ ] **Step 1: Update imports**

Find:

```ts
import {
  addPatient,
  addReferral,
  addVisit,
  addPregnancy,
  updatePatient as storageUpdatePatient,
  updatePregnancy as storageUpdatePregnancy,
  getPatientsSnapshot,
  getReferralsSnapshot,
  getServerPatientsSnapshot,
  getServerReferralsSnapshot,
  getServerVisitsSnapshot,
  getServerPregnanciesSnapshot,
  getVisitsSnapshot,
  getPregnanciesSnapshot,
  subscribeToPatients,
  subscribeToReferrals,
  subscribeToVisits,
  subscribeToPregnancies,
} from "./storage";
```

Replace with:

```ts
import {
  addPatient,
  addReferral,
  addVisit,
  addPregnancy,
  updatePatient as storageUpdatePatient,
  updatePregnancy as storageUpdatePregnancy,
  updateReferral as storageUpdateReferral,
  getPatientsSnapshot,
  getReferralsSnapshot,
  getServerPatientsSnapshot,
  getServerReferralsSnapshot,
  getServerVisitsSnapshot,
  getServerPregnanciesSnapshot,
  getVisitsSnapshot,
  getPregnanciesSnapshot,
  subscribeToPatients,
  subscribeToReferrals,
  subscribeToVisits,
  subscribeToPregnancies,
} from "./storage";
```

Find:

```ts
import type {
  Patient,
  Referral,
  RiskLevel,
  Visit,
  VisitLabs,
  VisitType,
  Pregnancy,
} from "./types";
```

Replace with:

```ts
import type {
  Patient,
  Referral,
  ReferralOutcome,
  RiskLevel,
  Visit,
  VisitLabs,
  VisitType,
  Pregnancy,
} from "./types";
```

- [ ] **Step 2: Replace `useActiveReferrals` and `acceptReferral`**

Find:

```ts
export function useActiveReferrals(): Referral[] {
  const referrals = useReferrals();
  return useMemo(
    () => referrals.filter((r) => r.status === "active"),
    [referrals],
  );
}

export function acceptReferral(
  patientId: string,
  extra?: Partial<Omit<Referral, "id" | "patientId" | "acceptedAt" | "status">>,
): Referral {
  const referral: Referral = {
    id: `referral-${crypto.randomUUID()}`,
    patientId,
    acceptedAt: new Date().toISOString(),
    status: "active",
    ...extra,
  };
  addReferral(referral);
  return referral;
}
```

Replace with:

```ts
export function useActiveReferrals(): Referral[] {
  const referrals = useReferrals();
  return useMemo(
    () => referrals.filter((r) => r.status === "accepted"),
    [referrals],
  );
}

const REFERRAL_ROUTING: Record<string, string> = {
  "Nyamata Health Center": "Bugesera District Hospital",
};
const DEFAULT_RECEIVING_FACILITY = "Bugesera District Hospital";

function getOrCreateEmergencyReferral(patientId: string, reason: string): Referral {
  const existing = getReferralsSnapshot().find(
    (r) => r.patientId === patientId && (r.status === "pending" || r.status === "accepted"),
  );
  if (existing) return existing;

  const { name, facility } = getCurrentUserSnapshot();
  const referral: Referral = {
    id: `referral-${crypto.randomUUID()}`,
    patientId,
    createdAt: new Date().toISOString(),
    status: "pending",
    receivingFacility: REFERRAL_ROUTING[facility] ?? DEFAULT_RECEIVING_FACILITY,
    reason,
    urgency: "emergency",
    referredByNurse: name,
    referredByFacility: facility,
  };
  addReferral(referral);
  return referral;
}

export function acceptEmergencyReferral(referralId: string): Referral {
  const referral = getReferralsSnapshot().find((r) => r.id === referralId);
  if (!referral || referral.status !== "pending") {
    throw new Error("Referral is not pending");
  }
  const { name, facility } = getCurrentUserSnapshot();
  storageUpdateReferral(referralId, {
    status: "accepted",
    acceptedAt: new Date().toISOString(),
    acceptedByNurse: name,
    acceptedByFacility: facility,
  });
  return getReferralsSnapshot().find((r) => r.id === referralId)!;
}

export function closeReferral(
  referralId: string,
  data: { outcome: ReferralOutcome; outcomeStatement: string },
): Referral {
  const referral = getReferralsSnapshot().find((r) => r.id === referralId);
  if (!referral || referral.status !== "accepted") {
    throw new Error("Referral is not accepted");
  }
  storageUpdateReferral(referralId, {
    status: "closed",
    closedAt: new Date().toISOString(),
    outcome: data.outcome,
    outcomeStatement: data.outcomeStatement,
  });
  return getReferralsSnapshot().find((r) => r.id === referralId)!;
}

export function createReferral(data: {
  patientId: string;
  receivingFacility: string;
  reason: string;
  urgency: "routine" | "urgent" | "emergency";
}): Referral {
  const { name, facility } = getCurrentUserSnapshot();
  const now = new Date().toISOString();
  const referral: Referral = {
    id: `referral-${crypto.randomUUID()}`,
    patientId: data.patientId,
    createdAt: now,
    status: "accepted",
    receivingFacility: data.receivingFacility,
    reason: data.reason,
    urgency: data.urgency,
    referredByNurse: name,
    referredByFacility: facility,
    acceptedAt: now,
    acceptedByNurse: name,
    acceptedByFacility: facility,
  };
  addReferral(referral);
  return referral;
}
```

Note: `getOrCreateEmergencyReferral` is intentionally not exported — only `createEmergencyVisit` and `recordVisit` (both in this same file) call it.

- [ ] **Step 3: Update `recordVisit`** to accept `treatment`/`followUpPlan` and auto-create a pending referral on RED

Find:

```ts
export function recordVisit(data: {
  pregnancyId: string;
  type: VisitType;
  ancNumber?: number;
  scheduledWeek?: number;
  symptomIds: string[];
  notes: string;
  labs?: VisitLabs;
  emergencySummary?: string;
}): Visit {
  const { name, facility } = getCurrentUserSnapshot();
  const visit: Visit = {
    id: `visit-${crypto.randomUUID()}`,
    pregnancyId: data.pregnancyId,
    date: new Date().toISOString().slice(0, 10),
    type: data.type,
    ancNumber: data.ancNumber,
    scheduledWeek: data.scheduledWeek,
    hospital: facility,
    attendingNurse: name,
    symptomIds: data.symptomIds,
    notes: data.notes,
    riskLevel: data.type === "emergency" ? "red" : classifyRiskLevel(data.symptomIds),
    labs: data.labs,
    emergencySummary: data.emergencySummary,
  };
  addVisit(visit);
  return visit;
}
```

Replace with:

```ts
export function recordVisit(data: {
  pregnancyId: string;
  type: VisitType;
  ancNumber?: number;
  scheduledWeek?: number;
  symptomIds: string[];
  notes: string;
  labs?: VisitLabs;
  emergencySummary?: string;
  treatment?: string;
  followUpPlan?: string;
}): Visit {
  const { name, facility } = getCurrentUserSnapshot();
  const riskLevel = data.type === "emergency" ? "red" : classifyRiskLevel(data.symptomIds);
  const visit: Visit = {
    id: `visit-${crypto.randomUUID()}`,
    pregnancyId: data.pregnancyId,
    date: new Date().toISOString().slice(0, 10),
    type: data.type,
    ancNumber: data.ancNumber,
    scheduledWeek: data.scheduledWeek,
    hospital: facility,
    attendingNurse: name,
    symptomIds: data.symptomIds,
    notes: data.notes,
    riskLevel,
    labs: data.labs,
    emergencySummary: data.emergencySummary,
    treatment: data.treatment,
    followUpPlan: data.followUpPlan,
  };
  addVisit(visit);

  if (riskLevel === "red") {
    const pregnancy = getPregnanciesSnapshot().find((p) => p.id === data.pregnancyId);
    if (pregnancy) {
      const reason =
        data.type === "emergency"
          ? (data.emergencySummary ?? data.notes)
          : `Classified RED during ${data.type} visit`;
      getOrCreateEmergencyReferral(pregnancy.patientId, reason);
    }
  }

  return visit;
}
```

- [ ] **Step 4: Update `createEmergencyVisit`**

Find:

```ts
  const referral = acceptReferral(patientId, { urgency: "emergency", reason: summary });

  return { pregnancy, visit, referral };
```

Replace with:

```ts
  const referral = getOrCreateEmergencyReferral(patientId, summary);

  return { pregnancy, visit, referral };
```

(`recordVisit` above already created this same pending referral as a side effect since `type: "emergency"` always yields `riskLevel: "red"` — this call just reads it back. No duplicate is created because of the open-referral guard in `getOrCreateEmergencyReferral`.)

- [ ] **Step 5: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: this file compiles clean. Remaining errors are scoped to component files fixed in later tasks.

- [ ] **Step 6: Commit**

```bash
git add src/lib/patients/use-patients.ts
git commit -m "refactor(referrals): pending/accept/close lifecycle, converge emergency + routine-RED referrals"
```

---

### Task 4: Add a receiving-hospital demo nurse

**Files:**
- Modify: `src/lib/auth/demo-users.ts`

**Interfaces:**
- None (data only) — makes the accept flow testable with a second login.

- [ ] **Step 1: Add a new nurse entry** immediately after the existing `nurse-uwase` entry:

```ts
  {
    id: "nurse-kagame",
    name: "Nurse Kagame",
    title: "In charge of ANC",
    facility: "Bugesera District Hospital",
    role: "nurse",
    facilityLevel: "dh",
    password: "nurse123",
  },
```

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors from this file (no type changes needed — `"nurse"` + `"dh"` already fit `Role`/`FacilityLevel`).

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth/demo-users.ts
git commit -m "feat(auth): add a receiving-hospital nurse demo account for the accept-referral flow"
```

---

### Task 5: `CreateReferralModal` uses the new `createReferral` helper

**Files:**
- Modify: `src/components/patients/create-referral-modal.tsx`

**Interfaces:**
- Consumes: `createReferral` (Task 3).

- [ ] **Step 1: Replace the `addReferral` import and call**

Find:

```ts
import { addReferral } from "@/lib/patients/storage";
```

Replace with:

```ts
import { createReferral } from "@/lib/patients/use-patients";
```

Find:

```ts
  function handleSubmit() {
    addReferral({
      id: `referral-${crypto.randomUUID()}`,
      patientId: patient.id,
      acceptedAt: new Date().toISOString(),
      status: "active",
      receivingFacility,
      reason: reason.trim(),
      urgency,
    });
    onCreated();
    onClose();
  }
```

Replace with:

```ts
  function handleSubmit() {
    createReferral({
      patientId: patient.id,
      receivingFacility,
      reason: reason.trim(),
      urgency,
    });
    onCreated();
    onClose();
  }
```

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: this file's errors resolved.

- [ ] **Step 3: Commit**

```bash
git add src/components/patients/create-referral-modal.tsx
git commit -m "refactor(referrals): CreateReferralModal uses createReferral instead of constructing Referral directly"
```

---

### Task 6: `RedCaseAlertPanel` — facility-scoped pending referrals

**Files:**
- Modify: `src/components/dashboard/red-case-alert.tsx`

**Interfaces:**
- Consumes: `useReferrals`, `acceptEmergencyReferral` (Task 3); `useAuth` (`@/lib/auth/auth-context`, existing).
- Produces: this component no longer derives "red patients without a referral" from visit data — it reads pending referrals directly, scoped to `receivingFacility === currentUser.facility`.

- [ ] **Step 1: Rewrite the file**

```tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  usePatients,
  useVisits,
  usePregnancies,
  useReferrals,
  acceptEmergencyReferral,
} from "@/lib/patients/use-patients";
import { useAuth } from "@/lib/auth/auth-context";
import { gestationalAgeWeeks } from "@/lib/patients/pregnancy";
import { fullName } from "@/lib/format";
import type { Patient, Visit } from "@/lib/patients/types";
import { ConfirmModal } from "./confirm-modal";
import { PatientEmergencyInfoModal } from "./patient-emergency-info-modal";

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
  referredFrom: string;
  gaWeeks: number | null;
  onAccept: () => void;
  onViewInfo: () => void;
}

function RedCaseCard({ patient, latestVisitDate, referredFrom, gaWeeks, onAccept, onViewInfo }: RedCaseCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onViewInfo}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onViewInfo();
      }}
      className="animate-pulse-ring-urgent flex cursor-pointer items-start gap-4 rounded-xl border border-red-200 bg-red-50 p-4 transition-colors hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/30 dark:hover:bg-red-950/50"
    >
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
        <IconEmergency className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-red-800 dark:text-red-300 truncate">
            {fullName(patient)}
          </p>
          <span className="shrink-0 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
            Obstetric Emergency
          </span>
        </div>
        <p className="mt-0.5 text-xs text-red-700/70 dark:text-red-400/70">
          {gaWeeks !== null ? `${gaWeeks}w gestation · ` : ""}Referred from {referredFrom}
        </p>
        <div className="mt-1 flex items-center gap-1 text-xs text-red-600/60 dark:text-red-400/60">
          <IconClock className="h-3.5 w-3.5" />
          <span>Flagged {latestVisitDate}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onAccept();
        }}
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
  const { user } = useAuth();
  const patients = usePatients();
  const visits = useVisits();
  const pregnancies = usePregnancies();
  const referrals = useReferrals();
  const [pendingAcceptId, setPendingAcceptId] = useState<string | null>(null);
  const [viewInfoReferralId, setViewInfoReferralId] = useState<string | null>(null);

  const patientById = useMemo(() => new Map(patients.map((p) => [p.id, p])), [patients]);
  const patientIdByPregnancyId = useMemo(
    () => new Map(pregnancies.map((p) => [p.id, p.patientId])),
    [pregnancies],
  );

  const pendingCases = useMemo(() => {
    if (!user) return [];
    const results: {
      referral: (typeof referrals)[number];
      patient: Patient;
      latestVisit: Visit | undefined;
      gaWeeks: number | null;
    }[] = [];

    for (const referral of referrals) {
      if (referral.status !== "pending" || referral.receivingFacility !== user.facility) continue;
      const patient = patientById.get(referral.patientId);
      if (!patient) continue;
      const latestVisit = visits
        .filter((v) => patientIdByPregnancyId.get(v.pregnancyId) === referral.patientId)
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      const openPregnancy = pregnancies.find(
        (p) => p.patientId === referral.patientId && p.status === "open",
      );
      const gaWeeks = openPregnancy ? gestationalAgeWeeks(openPregnancy.lmpDate) : null;
      results.push({ referral, patient, latestVisit, gaWeeks });
    }

    return results.sort((a, b) => b.referral.createdAt.localeCompare(a.referral.createdAt));
  }, [referrals, patientById, visits, pregnancies, patientIdByPregnancyId, user]);

  if (pendingCases.length === 0) return null;

  const pendingAccept = pendingCases.find(({ referral }) => referral.id === pendingAcceptId);
  const viewInfo = pendingCases.find(({ referral }) => referral.id === viewInfoReferralId);

  return (
    <div className="rounded-[1.25rem] border border-red-300 bg-white p-6 shadow-[0_2px_12px_rgba(220,38,38,0.08)] dark:border-red-900/50 dark:bg-red-950/20">
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
            {pendingCases.length}
          </span>
        </div>
        <span className="text-xs text-red-600/70 dark:text-red-400/70">
          Referred to {user?.facility}
        </span>
      </div>

      <p className="mt-2 text-sm text-red-700/80 dark:text-red-400/80">
        The following emergency cases have been referred to your facility and require acceptance.
      </p>

      <div className="mt-4 flex flex-col gap-3">
        {pendingCases.map(({ referral, patient, latestVisit, gaWeeks }) => (
          <RedCaseCard
            key={referral.id}
            patient={patient}
            latestVisitDate={latestVisit?.date ?? "Unknown"}
            referredFrom={referral.referredByFacility}
            gaWeeks={gaWeeks}
            onAccept={() => setPendingAcceptId(referral.id)}
            onViewInfo={() => setViewInfoReferralId(referral.id)}
          />
        ))}
      </div>

      {pendingAccept && (
        <ConfirmModal
          title="Accept this emergency referral?"
          description={`${fullName(pendingAccept.patient)} will be assigned to you and marked as an accepted referral.`}
          confirmLabel="Accept"
          tone="danger"
          onConfirm={() => {
            acceptEmergencyReferral(pendingAccept.referral.id);
            router.push(`/dashboard/nurse/patients/${pendingAccept.patient.id}`);
          }}
          onCancel={() => setPendingAcceptId(null)}
        />
      )}

      {viewInfo && (
        <PatientEmergencyInfoModal
          patient={viewInfo.patient}
          latestVisit={viewInfo.latestVisit}
          onClose={() => setViewInfoReferralId(null)}
          onAccept={() => {
            setViewInfoReferralId(null);
            setPendingAcceptId(viewInfo.referral.id);
          }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: this file's errors resolved.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/red-case-alert.tsx
git commit -m "refactor(referrals): RedCaseAlertPanel reads pending referrals scoped to the current user's facility"
```

---

### Task 7: `CloseReferralModal` + Referral Log page rewrite

**Files:**
- Create: `src/components/dashboard/close-referral-modal.tsx`
- Modify: `src/app/dashboard/nurse/referrals/page.tsx`

**Interfaces:**
- Consumes: `closeReferral` (Task 3); `ReferralStatus` (Task 1); `useAuth`.

- [ ] **Step 1: Create `close-referral-modal.tsx`**, following `close-pregnancy-modal.tsx`'s exact structural pattern:

```tsx
"use client";

import { useEffect, useState } from "react";
import { closeReferral } from "@/lib/patients/use-patients";
import { IconClose } from "./icons";
import type { Referral } from "@/lib/patients/types";

export function CloseReferralModal({
  referral,
  patientName,
  onClose,
  onClosed,
}: {
  referral: Referral;
  patientName: string;
  onClose: () => void;
  onClosed: () => void;
}) {
  const [outcome, setOutcome] = useState<"recovered" | "died">("recovered");
  const [outcomeStatement, setOutcomeStatement] = useState("");

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    closeReferral(referral.id, { outcome, outcomeStatement });
    onClosed();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-300 bg-[#ffeedb] p-6 shadow-2xl dark:border-zinc-700 dark:bg-orange-950/40">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Close Referral — {patientName}</h2>
          <button type="button" onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800">
            <IconClose className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4 rounded-xl border border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Outcome
            <select value={outcome} onChange={(e) => setOutcome(e.target.value as typeof outcome)} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50">
              <option value="recovered">Recovered</option>
              <option value="died">Died</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Outcome statement
            <textarea required rows={4} value={outcomeStatement} onChange={(e) => setOutcomeStatement(e.target.value)} placeholder="Describe the case outcome…" className="resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50" />
          </label>
          <div className="mt-2 grid grid-cols-2 gap-2.5">
            <button type="button" onClick={onClose} className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800">Cancel</button>
            <button type="submit" className="rounded-xl bg-[#0f766e] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-800">Close Case</button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite `nurse/referrals/page.tsx`**

```tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { RoleGuard } from "@/components/role-guard";
import { useReferrals, usePatients } from "@/lib/patients/use-patients";
import { useAuth } from "@/lib/auth/auth-context";
import { getInitials, relativeTime, fullName } from "@/lib/format";
import { CloseReferralModal } from "@/components/dashboard/close-referral-modal";
import type { ReferralStatus } from "@/lib/patients/types";

const STATUS_FILTERS: { value: "all" | ReferralStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "closed", label: "Closed" },
];

const STATUS_BADGE: Record<ReferralStatus, string> = {
  pending: "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400",
  accepted: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  closed: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

function ReferralLogContent() {
  const referrals = useReferrals();
  const patients = usePatients();
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<"all" | ReferralStatus>("all");
  const [closeTargetId, setCloseTargetId] = useState<string | null>(null);

  const patientById = useMemo(
    () => new Map(patients.map((patient) => [patient.id, patient])),
    [patients],
  );

  const rows = useMemo(() => {
    return referrals
      .map((referral) => ({ referral, patient: patientById.get(referral.patientId) }))
      .filter((row) => row.patient)
      .filter((row) => statusFilter === "all" || row.referral.status === statusFilter)
      .sort((a, b) => b.referral.createdAt.localeCompare(a.referral.createdAt));
  }, [referrals, patientById, statusFilter]);

  const closeTarget = rows.find((row) => row.referral.id === closeTargetId);

  return (
    <div className="flex flex-col gap-5">
      {closeTarget && closeTarget.patient && (
        <CloseReferralModal
          referral={closeTarget.referral}
          patientName={fullName(closeTarget.patient)}
          onClose={() => setCloseTargetId(null)}
          onClosed={() => setCloseTargetId(null)}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-300 bg-[#ffeedb] px-4 py-3 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">
          Referral Log
        </h2>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {referrals.length} referral{referrals.length === 1 ? "" : "s"} total
        </span>
      </div>

      <div className="flex w-fit gap-1 rounded-full border border-zinc-300 bg-[#ffeedb] p-1 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setStatusFilter(filter.value)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              statusFilter === filter.value
                ? "bg-[#0f766e] text-white shadow-sm"
                : "text-zinc-600 hover:bg-white/60 dark:text-zinc-300"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-300 bg-[#ffeedb] shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
        <div className="scrollbar-hidden max-h-[32rem] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-zinc-300 bg-[#ffeedb] text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-700 dark:bg-orange-950/40 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Receiving Facility</th>
                <th className="px-4 py-3">Referred</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Outcome</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {rows.map(({ referral, patient }) => (
                <tr
                  key={referral.id}
                  className="bg-white transition-colors hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/60"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/nurse/patients/${patient!.id}`}
                      className="flex items-center gap-2.5 font-medium text-zinc-900 hover:text-teal-900 dark:text-zinc-50 dark:hover:text-teal-300"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                        {getInitials(fullName(patient!))}
                      </span>
                      {fullName(patient!)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                    {referral.receivingFacility}
                  </td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                    <span title={referral.createdAt}>{relativeTime(referral.createdAt)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STATUS_BADGE[referral.status]}`}>
                      {referral.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                    {referral.outcome ? (
                      <span className={referral.outcome === "died" ? "text-red-700 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"}>
                        {referral.outcome}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {referral.status === "accepted" && referral.acceptedByNurse === user?.name && (
                      <button
                        type="button"
                        onClick={() => setCloseTargetId(referral.id)}
                        className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      >
                        Close Case
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr className="bg-white dark:bg-zinc-900">
                  <td colSpan={6} className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400">
                    No referrals match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function ReferralLogPage() {
  return (
    <RoleGuard path="/dashboard/nurse">
      <ReferralLogContent />
    </RoleGuard>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: both files' errors resolved.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/close-referral-modal.tsx src/app/dashboard/nurse/referrals/page.tsx
git commit -m "feat(referrals): add Close Case flow and status filter to the Referral Log"
```

---

### Task 8: `PregnancyTimeline` — guard referral lifecycle fields

**Files:**
- Modify: `src/components/patients/pregnancy/pregnancy-timeline.tsx`

**Interfaces:**
- Consumes: updated `Referral` (Task 1) — `acceptedAt` is now optional (pending referrals don't have one yet).

- [ ] **Step 1: Fix the referral date derivation** (currently `referral.acceptedAt.slice(0, 10)`, which crashes for a pending referral with no `acceptedAt`)

Find:

```ts
      ...referrals.map(
        (referral) =>
          ({
            kind: "referral",
            id: referral.id,
            date: referral.acceptedAt.slice(0, 10),
            data: referral,
          }) satisfies TimelineItem,
      ),
```

Replace with:

```ts
      ...referrals.map(
        (referral) =>
          ({
            kind: "referral",
            id: referral.id,
            date: (referral.acceptedAt ?? referral.createdAt).slice(0, 10),
            data: referral,
          }) satisfies TimelineItem,
      ),
```

- [ ] **Step 2: Update `itemLabel`'s referral case** to reflect status

Find:

```ts
    case "referral":
      return "Referral accepted";
```

Replace with:

```ts
    case "referral":
      if (item.data.status === "pending") return "Referral sent — pending acceptance";
      if (item.data.status === "accepted") return "Referral accepted";
      return "Referral closed";
```

- [ ] **Step 3: Update the expanded detail for the referral case**

Find:

```tsx
                {item.kind === "referral" && (
                  <p>Accepted at: {item.data.acceptedAt}</p>
                )}
```

Replace with:

```tsx
                {item.kind === "referral" && (
                  <>
                    <p>Referred to: {item.data.receivingFacility}</p>
                    {item.data.acceptedAt && <p>Accepted at: {item.data.acceptedAt}</p>}
                    {item.data.outcome && (
                      <p>Outcome: {item.data.outcome} — {item.data.outcomeStatement}</p>
                    )}
                  </>
                )}
```

- [ ] **Step 4: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: this file's errors resolved.

- [ ] **Step 5: Commit**

```bash
git add src/components/patients/pregnancy/pregnancy-timeline.tsx
git commit -m "fix(pregnancy): guard pregnancy timeline against pending referrals with no acceptedAt"
```

---

### Task 9: Patient detail page — tab reorder, drop Classification, emergency banner update

**Files:**
- Modify: `src/app/dashboard/nurse/patients/[id]/page.tsx`

**Interfaces:**
- None new — pure UI reorder plus reading fields already present on `Referral` (Task 1).

- [ ] **Step 1: Remove the `ClassificationTab` import**

Find:

```ts
import { ClassificationTab } from "@/components/patients/classification-tab";
```

Delete this line.

- [ ] **Step 2: Reorder `TABS` and drop `"Classification"`**

Find:

```ts
const TABS = [
  "Overview",
  "Patient Details",
  "Signs & Symptoms",
  "New Assessment",
  "Pregnancy",
  "Classification",
  "Visit History",
  "AI Prediction",
] as const;
```

Replace with:

```ts
const TABS = [
  "Overview",
  "Patient Details",
  "Signs & Symptoms",
  "Pregnancy",
  "Visit History",
  "New Assessment",
  "AI Prediction",
] as const;
```

- [ ] **Step 3: Remove the `"Classification"` tab's rendering branch**

Find:

```tsx
        {activeTab === "Classification" && (
          <ClassificationTab currentRisk={currentRisk} visits={allVisits} />
        )}
```

Delete this block. (Note: the tab bodies are conditionally rendered by string match against `activeTab`, not by array order, so simply reordering `TABS` above is enough to change the tab strip's order — this step only removes the now-dead Classification branch.)

- [ ] **Step 4: Update the emergency confirmation banner's referral info block** to reflect the new pending state instead of a meaningless "Urgency" line

Find:

```tsx
                <div className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-left text-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Referral
                  </p>
                  <p className="text-zinc-700 dark:text-zinc-300">
                    Urgency: {emergencyResult.referral.urgency}
                  </p>
                </div>
```

Replace with:

```tsx
                <div className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-left text-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Referral
                  </p>
                  <p className="text-zinc-700 dark:text-zinc-300">
                    Sent to {emergencyResult.referral.receivingFacility} — pending acceptance
                  </p>
                </div>
```

- [ ] **Step 5: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: this file's errors resolved.

- [ ] **Step 6: Lint**

Run: `pnpm exec eslint src/app/dashboard/nurse/patients/[id]/page.tsx`
Expected: no unused-import warnings (confirm `ClassificationTab` import removal didn't leave anything dangling).

- [ ] **Step 7: Commit**

```bash
git add "src/app/dashboard/nurse/patients/[id]/page.tsx"
git commit -m "feat(patients): reorder detail tabs, drop Classification, show pending-referral state on emergency banner"
```

---

### Task 10: Surface `treatment`/`followUpPlan`

**Files:**
- Modify: `src/components/patients/assessment/summary-step.tsx`
- Modify: `src/components/patients/visit-history-tab.tsx`

**Interfaces:**
- Consumes: `recordVisit`'s `treatment`/`followUpPlan` params (Task 3).

- [ ] **Step 1: Add treatment/follow-up state and inputs to `summary-step.tsx`**

Find:

```ts
  const [notes, setNotes] = useState("");
```

Replace with:

```ts
  const [notes, setNotes] = useState("");
  const [treatment, setTreatment] = useState("");
  const [followUpPlan, setFollowUpPlan] = useState("");
```

Find:

```ts
    const visit = recordVisit({
      pregnancyId,
      type,
      scheduledWeek,
      ancNumber,
      symptomIds: symptoms,
      notes,
      labs: hasVisitLabs ? visitLabs : undefined,
    });
```

Replace with:

```ts
    const visit = recordVisit({
      pregnancyId,
      type,
      scheduledWeek,
      ancNumber,
      symptomIds: symptoms,
      notes,
      labs: hasVisitLabs ? visitLabs : undefined,
      treatment: treatment.trim() || undefined,
      followUpPlan: followUpPlan.trim() || undefined,
    });
```

Find the `Notes` field's closing `</label>` (right before the submit `<button type="submit">`) and add two more fields directly after it:

```tsx
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Treatment provided
        <input
          type="text"
          value={treatment}
          onChange={(e) => setTreatment(e.target.value)}
          placeholder="e.g. IV magnesium sulfate administered…"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Follow-up plan
        <input
          type="text"
          value={followUpPlan}
          onChange={(e) => setFollowUpPlan(e.target.value)}
          placeholder="e.g. Return in 2 weeks for BP recheck…"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </label>
```

- [ ] **Step 2: Display them in `visit-history-tab.tsx`'s expanded detail row**

Find:

```tsx
                          {visit.type === "emergency" && visit.emergencySummary ? (
                            <p>
                              <span className="font-medium text-zinc-400">
                                Summary:{" "}
                              </span>
                              {visit.emergencySummary}
                            </p>
                          ) : null}
                          {visit.notes ? (
```

Replace with:

```tsx
                          {visit.type === "emergency" && visit.emergencySummary ? (
                            <p>
                              <span className="font-medium text-zinc-400">
                                Summary:{" "}
                              </span>
                              {visit.emergencySummary}
                            </p>
                          ) : null}
                          {visit.treatment ? (
                            <p>
                              <span className="font-medium text-zinc-400">
                                Treatment:{" "}
                              </span>
                              {visit.treatment}
                            </p>
                          ) : null}
                          {visit.followUpPlan ? (
                            <p>
                              <span className="font-medium text-zinc-400">
                                Follow-up plan:{" "}
                              </span>
                              {visit.followUpPlan}
                            </p>
                          ) : null}
                          {visit.notes ? (
```

Also update the "no additional details" fallback condition further down in the same block:

Find:

```tsx
                          {!visit.notes && !visit.labs && !visit.emergencySummary && (
```

Replace with:

```tsx
                          {!visit.notes && !visit.labs && !visit.emergencySummary && !visit.treatment && !visit.followUpPlan && (
```

- [ ] **Step 3: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: both files' errors resolved.

- [ ] **Step 4: Commit**

```bash
git add src/components/patients/assessment/summary-step.tsx src/components/patients/visit-history-tab.tsx
git commit -m "feat(patients): surface treatment and follow-up plan fields in assessment and visit history"
```

---

### Task 11: Final sweep

**Files:** none (verification only)

- [ ] **Step 1: Full project type-check**

Run: `pnpm exec tsc --noEmit`
Expected: PASS, zero errors project-wide.

- [ ] **Step 2: Full project lint**

Run: `pnpm exec eslint .`
Expected: zero new errors.

- [ ] **Step 3: Grep sweep for dead references**

Run: `grep -rn "acceptReferral\b\|status === \"active\"\|referral\.acceptedAt\.slice" src`
Expected: zero matches.

- [ ] **Step 4: Production build**

Run: `pnpm build`
Expected: succeeds (this is the closest available substitute for manual browser verification in this environment — no browser automation tool is available here).

- [ ] **Step 5: Report exactly what could and could not be verified**

Since there is no browser tool available, explicitly tell the user which flows need their own manual click-through: registering an emergency at one nurse login (`nurse-uwase`), then logging in as the receiving nurse (`nurse-kagame`) to see and accept the pending referral, then closing it with an outcome from the Referral Log.

---

## Self-Review Notes

- **Spec coverage:** every section of the design spec maps to a task — data model (Task 1), storage (Task 2), core lifecycle logic + routine-RED convergence (Task 3), demo user for testing (Task 4), manual-referral path (Task 5), facility-scoped pending panel (Task 6), close-case flow (Task 7), timeline safety (Task 8), tab reorder/Classification drop/banner (Task 9), treatment/follow-up surfacing (Task 10).
- **Placeholder scan:** no TBD/TODO; every step shows literal, complete code.
- **Type consistency:** `Referral`/`ReferralStatus`/`ReferralOutcome` (Task 1) are referenced identically by name across every later task; `getOrCreateEmergencyReferral`, `acceptEmergencyReferral`, `closeReferral`, `createReferral` (Task 3) are the exact names Tasks 5–7 import.
- **Known limitation carried forward from the design doc:** `REFERRAL_ROUTING` is a two-entry hardcoded lookup, not a real facility hierarchy — explicitly out of scope per the design doc, backend territory later.
