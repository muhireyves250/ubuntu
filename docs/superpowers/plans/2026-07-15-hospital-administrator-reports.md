# Hospital Administrator Reports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a tabbed Reports page (Maternal Care / Referral / Laboratory / Staff Performance) under the Hospital Administrator role, deriving every metric from existing data — no new storage.

**Architecture:** One new route + one container component (tab switcher + shared date-range picker, mirroring `DashboardOverview`'s `RANGE_OPTIONS` and `pregnancy-tab.tsx`'s `ARCHIVE_TABS` pattern) + four section components, each a pure aggregation over `usePatients()`/`useVisits()`/`usePregnancies()`/`useReferrals()` (all already global) plus the existing `getLabRequests`/`subscribeToLabRequests` for the lab section. One small addition to `use-patients.ts`: a bulk `useAllRecommendations()` hook (only a per-patient variant exists today).

**Tech Stack:** Next.js App Router, React 19, TypeScript strict, Tailwind v4, pnpm. No test runner — verify with `pnpm exec tsc --noEmit`, `pnpm exec eslint .`, `pnpm build`, plus manual walkthrough.

## Global Constraints

- Never use `git add -A`/`git add .` — stage explicit paths only.
- Do not commit unless the user explicitly asks.
- No "Rejected referrals" metric — that status doesn't exist in `ReferralStatus`.
- No fabricated lab "turnaround time" — only request-to-acceptance latency, labeled as such.
- No charting library — stat tiles and simple tables only, matching the existing app style.
- Verify with `pnpm exec tsc --noEmit` (ignore stale `.next/types/*`) and `pnpm exec eslint <changed files>` after every task; `pnpm build` at the end.

---

### Task 1: Bulk recommendations hook

**Files:**
- Modify: `src/lib/patients/use-patients.ts`

**Interfaces:**
- Produces: `useAllRecommendations(): Recommendation[]`.

- [ ] **Step 1: Add the hook**

Find `useRecommendationsForPatient` (uses `subscribeToRecommendations`/`getRecommendationsSnapshot`/`getServerRecommendationsSnapshot`, already imported). Add directly after it:
```ts
export function useAllRecommendations(): Recommendation[] {
  return useSyncExternalStore(
    subscribeToRecommendations,
    getRecommendationsSnapshot,
    getServerRecommendationsSnapshot,
  );
}
```

- [ ] **Step 2: Verify**

Run: `pnpm exec tsc --noEmit 2>&1 | grep -v ".next/types"`
Run: `pnpm exec eslint src/lib/patients/use-patients.ts`

---

### Task 2: Maternal Care report section

**Files:**
- Create: `src/components/dashboard/reports/maternal-care-report.tsx`

**Interfaces:**
- Consumes: `usePatients`, `useVisits`, `usePregnancies` (existing, global), `useAuth`.
- Produces: `MaternalCareReport({ days }: { days?: number })`.

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useAuth } from "@/lib/auth/auth-context";
import { usePatients, useVisits, usePregnancies } from "@/lib/patients/use-patients";
import { StatCard } from "@/components/dashboard/stat-card";
import { IconUsers, IconClipboard, IconAlert, IconActivity } from "@/components/dashboard/icons";

export function MaternalCareReport({ days }: { days?: number }) {
  const { user } = useAuth();
  const patients = usePatients();
  const visits = useVisits();
  const pregnancies = usePregnancies();

  if (!user) return null;
  const facility = user.facility;

  const cutoff = days != null ? new Date(new Date().getTime() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) : null;
  const scopedVisits = visits.filter((v) => v.hospital === facility && (!cutoff || v.date >= cutoff));

  const totalAncVisits = scopedVisits.filter((v) => v.type !== "emergency").length;
  const emergencyPatientIds = new Set(scopedVisits.filter((v) => v.type === "emergency").map((v) => v.pregnancyId));
  const pregnancyIdByPatientId = new Map(pregnancies.map((p) => [p.id, p.patientId]));

  const patientIdByPregnancyId = new Map(pregnancies.map((p) => [p.id, p.patientId]));
  const latestVisitByPatient = new Map<string, (typeof visits)[number]>();
  for (const v of visits) {
    if (v.hospital !== facility) continue;
    const patientId = patientIdByPregnancyId.get(v.pregnancyId);
    if (!patientId) continue;
    const existing = latestVisitByPatient.get(patientId);
    if (!existing || v.date > existing.date || (v.date === existing.date && (v.createdAt ?? "") > (existing.createdAt ?? ""))) {
      latestVisitByPatient.set(patientId, v);
    }
  }
  const highRiskCount = [...latestVisitByPatient.values()].filter(
    (v) => v.riskLevel === "orange" || v.riskLevel === "red",
  ).length;

  const facilityPregnancies = pregnancies.filter((p) => {
    const patientId = pregnancyIdByPatientId.get(p.id);
    return patients.some((pt) => pt.id === patientId);
  });
  const closedWithDelivery = facilityPregnancies.filter((p) => p.status === "closed" && p.delivery);

  const outcomeCounts = { "live-birth": 0, stillbirth: 0, "maternal-death": 0 };
  const methodCounts = { vaginal: 0, cesarean: 0, assisted: 0 };
  const babyStatusCounts = { alive: 0, deceased: 0 };
  for (const p of closedWithDelivery) {
    if (!p.delivery) continue;
    outcomeCounts[p.delivery.outcome] += 1;
    methodCounts[p.delivery.method] += 1;
    babyStatusCounts[p.delivery.babyStatus] += 1;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={IconClipboard} value={String(totalAncVisits)} label="ANC visits logged" accentClass="bg-violet-100 text-violet-700" />
        <StatCard icon={IconAlert} value={String(highRiskCount)} label="High-risk pregnancies" accentClass="bg-amber-100 text-amber-700" />
        <StatCard icon={IconActivity} value={String(emergencyPatientIds.size)} label="Emergency pregnancies" accentClass="bg-red-100 text-red-700" />
        <StatCard icon={IconUsers} value={String(closedWithDelivery.length)} label="Deliveries recorded" accentClass="bg-sky-100 text-sky-700" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Delivery Outcome</p>
          <dl className="flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-zinc-500 dark:text-zinc-400">Live birth</dt><dd className="font-semibold">{outcomeCounts["live-birth"]}</dd></div>
            <div className="flex justify-between"><dt className="text-zinc-500 dark:text-zinc-400">Stillbirth</dt><dd className="font-semibold">{outcomeCounts.stillbirth}</dd></div>
            <div className="flex justify-between"><dt className="text-red-600 dark:text-red-400">Maternal death</dt><dd className="font-semibold text-red-600 dark:text-red-400">{outcomeCounts["maternal-death"]}</dd></div>
          </dl>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Delivery Method</p>
          <dl className="flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-zinc-500 dark:text-zinc-400">Vaginal</dt><dd className="font-semibold">{methodCounts.vaginal}</dd></div>
            <div className="flex justify-between"><dt className="text-zinc-500 dark:text-zinc-400">Cesarean</dt><dd className="font-semibold">{methodCounts.cesarean}</dd></div>
            <div className="flex justify-between"><dt className="text-zinc-500 dark:text-zinc-400">Assisted</dt><dd className="font-semibold">{methodCounts.assisted}</dd></div>
          </dl>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Neonatal Outcome</p>
          <dl className="flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-zinc-500 dark:text-zinc-400">Alive</dt><dd className="font-semibold">{babyStatusCounts.alive}</dd></div>
            <div className="flex justify-between"><dt className="text-red-600 dark:text-red-400">Deceased</dt><dd className="font-semibold text-red-600 dark:text-red-400">{babyStatusCounts.deceased}</dd></div>
          </dl>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `pnpm exec tsc --noEmit 2>&1 | grep -v ".next/types"`
Run: `pnpm exec eslint src/components/dashboard/reports/maternal-care-report.tsx`

---

### Task 3: Referral report section

**Files:**
- Create: `src/components/dashboard/reports/referral-report.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useAuth } from "@/lib/auth/auth-context";
import { useReferrals } from "@/lib/patients/use-patients";
import { StatCard } from "@/components/dashboard/stat-card";
import { IconReport, IconCheckCircle, IconClock, IconAlert } from "@/components/dashboard/icons";

export function ReferralReport({ days }: { days?: number }) {
  const { user } = useAuth();
  const referrals = useReferrals();
  if (!user) return null;
  const facility = user.facility;

  const cutoff = days != null ? new Date(new Date().getTime() - days * 24 * 60 * 60 * 1000).toISOString() : null;
  const inWindow = referrals.filter((r) => !cutoff || r.createdAt >= cutoff);

  const incoming = inWindow.filter((r) => r.receivingFacility === facility || r.acceptedByFacility === facility).length;
  const outgoing = inWindow.filter((r) => r.referredByFacility === facility).length;
  const accepted = inWindow.filter((r) => r.status === "accepted" && r.acceptedByFacility === facility).length;
  const emergencyCount = inWindow.filter((r) => r.urgency === "emergency").length;

  const acceptedWithTimestamps = inWindow.filter(
    (r) => r.acceptedByFacility === facility && r.acceptedAt,
  );
  const avgAcceptHours =
    acceptedWithTimestamps.length === 0
      ? null
      : acceptedWithTimestamps.reduce((sum, r) => {
          const ms = new Date(r.acceptedAt!).getTime() - new Date(r.createdAt).getTime();
          return sum + ms;
        }, 0) / acceptedWithTimestamps.length / (1000 * 60 * 60);

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      <StatCard icon={IconReport} value={String(incoming)} label="Incoming referrals" accentClass="bg-sky-100 text-sky-700" />
      <StatCard icon={IconReport} value={String(outgoing)} label="Outgoing referrals" accentClass="bg-violet-100 text-violet-700" />
      <StatCard icon={IconCheckCircle} value={String(accepted)} label="Accepted referrals" accentClass="bg-teal-100 text-teal-700" />
      <StatCard icon={IconAlert} value={String(emergencyCount)} label="Emergency referrals" accentClass="bg-red-100 text-red-700" />
      <StatCard
        icon={IconClock}
        value={avgAcceptHours == null ? "—" : `${avgAcceptHours.toFixed(1)}h`}
        label="Avg. time to accept"
        accentClass="bg-amber-100 text-amber-700"
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `pnpm exec tsc --noEmit 2>&1 | grep -v ".next/types"`
Run: `pnpm exec eslint src/components/dashboard/reports/referral-report.tsx`

---

### Task 4: Laboratory report section

**Files:**
- Create: `src/components/dashboard/reports/laboratory-report.tsx`

**Interfaces:**
- Consumes: `getLabRequests`, `subscribeToLabRequests` (existing, from `@/lib/patients/lab-requests`).

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { getLabRequests, subscribeToLabRequests, type LabRequest } from "@/lib/patients/lab-requests";
import { StatCard } from "@/components/dashboard/stat-card";
import { IconClipboard, IconCheckCircle, IconClock, IconAlertTriangle } from "@/components/dashboard/icons";

export function LaboratoryReport({ days }: { days?: number }) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<LabRequest[]>(() => (user ? getLabRequests(user.facility) : []));

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToLabRequests(() => {
      setRequests(getLabRequests(user.facility));
    });
    return () => { unsubscribe(); };
  }, [user]);

  if (!user) return null;

  const cutoff = days != null ? new Date(new Date().getTime() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) : null;
  const inWindow = requests.filter((r) => !cutoff || r.requestDate >= cutoff);

  const completed = inWindow.filter((r) => r.status === "Completed").length;
  const pending = inWindow.filter((r) => r.status === "Pending" || r.status === "In Progress").length;
  const critical = inWindow.filter((r) => r.results.some((res) => res.interpretation === "Critical")).length;

  const acceptedWithTimestamps = inWindow.filter((r) => r.acceptedAt);
  const avgAcceptHours =
    acceptedWithTimestamps.length === 0
      ? null
      : acceptedWithTimestamps.reduce((sum, r) => {
          const ms = new Date(r.acceptedAt!).getTime() - new Date(r.requestDate).getTime();
          return sum + ms;
        }, 0) / acceptedWithTimestamps.length / (1000 * 60 * 60);

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      <StatCard icon={IconClipboard} value={String(inWindow.length)} label="Laboratory requests" accentClass="bg-sky-100 text-sky-700" />
      <StatCard icon={IconCheckCircle} value={String(completed)} label="Completed tests" accentClass="bg-teal-100 text-teal-700" />
      <StatCard icon={IconClock} value={String(pending)} label="Pending requests" accentClass="bg-amber-100 text-amber-700" />
      <StatCard icon={IconAlertTriangle} value={String(critical)} label="Critical results" accentClass="bg-red-100 text-red-700" />
      <StatCard
        icon={IconClock}
        value={avgAcceptHours == null ? "—" : `${avgAcceptHours.toFixed(1)}h`}
        label="Avg. request-to-acceptance"
        accentClass="bg-violet-100 text-violet-700"
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `pnpm exec tsc --noEmit 2>&1 | grep -v ".next/types"`
Run: `pnpm exec eslint src/components/dashboard/reports/laboratory-report.tsx`

---

### Task 5: Staff Performance report section

**Files:**
- Create: `src/components/dashboard/reports/staff-performance-report.tsx`

**Interfaces:**
- Consumes: `useVisits`, `useReferrals`, `useAllRecommendations` (Task 1), `useAuth`; `getLabRequests`/`subscribeToLabRequests` for lab-nurse workload.

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { useVisits, useReferrals, useAllRecommendations } from "@/lib/patients/use-patients";
import { getLabRequests, subscribeToLabRequests, type LabRequest } from "@/lib/patients/lab-requests";

function tally(names: string[]): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const name of names) {
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

function WorkloadTable({ title, rows, emptyLabel }: { title: string; rows: { name: string; count: number }[]; emptyLabel: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">{title}</p>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-400">{emptyLabel}</p>
      ) : (
        <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
          {rows.map((row) => (
            <div key={row.name} className="flex items-center justify-between py-1.5 text-sm">
              <span className="text-zinc-700 dark:text-zinc-300">{row.name}</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-50">{row.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function StaffPerformanceReport({ days }: { days?: number }) {
  const { user } = useAuth();
  const visits = useVisits();
  const referrals = useReferrals();
  const recommendations = useAllRecommendations();
  const [labRequests, setLabRequests] = useState<LabRequest[]>(() => (user ? getLabRequests(user.facility) : []));

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToLabRequests(() => {
      setLabRequests(getLabRequests(user.facility));
    });
    return () => { unsubscribe(); };
  }, [user]);

  if (!user) return null;
  const facility = user.facility;

  const cutoff = days != null ? new Date(new Date().getTime() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) : null;

  const ancNurseWorkload = tally(
    visits
      .filter((v) => v.hospital === facility && v.type !== "emergency" && (!cutoff || v.date >= cutoff))
      .map((v) => v.attendingNurse),
  );
  const labNurseWorkload = tally(
    labRequests.filter((r) => r.acceptedBy && (!cutoff || r.requestDate >= cutoff)).map((r) => r.acceptedBy!),
  );
  const gynecologistWorkload = tally(
    referrals
      .filter((r) => r.acceptedByFacility === facility && r.urgency === "emergency" && r.acceptedByNurse && (!cutoff || r.createdAt.slice(0, 10) >= (cutoff ?? "")))
      .map((r) => r.acceptedByNurse!),
  );
  const recommendationWorkload = tally(
    recommendations
      .filter((r) => r.createdByFacility === facility && (!cutoff || r.createdAt.slice(0, 10) >= (cutoff ?? "")))
      .map((r) => r.createdByGynecologist),
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <WorkloadTable title="ANC Nurse Workload (visits logged)" rows={ancNurseWorkload} emptyLabel="No visits in this window." />
      <WorkloadTable title="Laboratory Nurse Workload (requests fulfilled)" rows={labNurseWorkload} emptyLabel="No lab requests accepted in this window." />
      <WorkloadTable title="Emergency Cases Accepted (by nurse)" rows={gynecologistWorkload} emptyLabel="No emergency cases accepted in this window." />
      <WorkloadTable title="Specialist Recommendations Authored" rows={recommendationWorkload} emptyLabel="No recommendations in this window." />
    </div>
  );
}
```
Note: "Emergency Cases Accepted (by nurse)" intentionally covers whoever accepted (nurse or gynecologist — both use `acceptedByNurse`), since the spec's "Gynecologist workload" and "Emergency case management statistics" are the same underlying data (who accepted emergency referrals at this facility) — not duplicating the same tally under two headings.

- [ ] **Step 2: Verify**

Run: `pnpm exec tsc --noEmit 2>&1 | grep -v ".next/types"`
Run: `pnpm exec eslint src/components/dashboard/reports/staff-performance-report.tsx`

---

### Task 6: Reports container, route, and sidebar entry

**Files:**
- Create: `src/components/dashboard/reports/reports-content.tsx`
- Create: `src/app/dashboard/hospital-admin/reports/page.tsx`
- Modify: `src/components/dashboard/sidebar.tsx`

**Interfaces:**
- Consumes: the four section components (Tasks 2–5).

- [ ] **Step 1: Write the container**

```tsx
"use client";

import { useState } from "react";
import { MaternalCareReport } from "./maternal-care-report";
import { ReferralReport } from "./referral-report";
import { LaboratoryReport } from "./laboratory-report";
import { StaffPerformanceReport } from "./staff-performance-report";

const REPORT_TABS = ["Maternal Care", "Referral", "Laboratory", "Staff Performance"] as const;
type ReportTab = (typeof REPORT_TABS)[number];

const RANGE_OPTIONS: { value: string; label: string; days?: number }[] = [
  { value: "7", label: "Last 7 days", days: 7 },
  { value: "30", label: "Last 30 days", days: 30 },
  { value: "90", label: "Last 90 days", days: 90 },
  { value: "all", label: "All time", days: undefined },
];

export function ReportsContent() {
  const [tab, setTab] = useState<ReportTab>("Maternal Care");
  const [range, setRange] = useState("30");
  const selectedDays = RANGE_OPTIONS.find((r) => r.value === range)?.days;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Reports</h1>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
        >
          {RANGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="scrollbar-hidden flex w-fit gap-1 overflow-x-auto rounded-full border border-zinc-300 bg-[#ffeedb] p-1 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
        {REPORT_TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              tab === t
                ? "bg-[#0f766e] text-white shadow-sm shadow-teal-700/20"
                : "text-zinc-600 hover:bg-white/60 dark:text-zinc-300 dark:hover:bg-zinc-800/60"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-zinc-300 bg-[#ffeedb] p-5 dark:border-zinc-700 dark:bg-orange-950/40">
        {tab === "Maternal Care" && <MaternalCareReport days={selectedDays} />}
        {tab === "Referral" && <ReferralReport days={selectedDays} />}
        {tab === "Laboratory" && <LaboratoryReport days={selectedDays} />}
        {tab === "Staff Performance" && <StaffPerformanceReport days={selectedDays} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write the route**

```tsx
import { RoleGuard } from "@/components/role-guard";
import { ReportsContent } from "@/components/dashboard/reports/reports-content";

export default function HospitalAdminReportsPage() {
  return (
    <RoleGuard roles={["hospital_admin"]}>
      <ReportsContent />
    </RoleGuard>
  );
}
```

- [ ] **Step 3: Add the sidebar nav item**

In `src/components/dashboard/sidebar.tsx`, add to `NAV_ITEMS` (after the "Referral Log" entry, using `IconClipboard` — already imported in this file):
```ts
  {
    label: "Reports",
    icon: IconClipboard,
    href: "/dashboard/hospital-admin/reports",
    enabledRoles: ["hospital_admin"],
  },
```

- [ ] **Step 4: Verify**

Run: `pnpm exec tsc --noEmit 2>&1 | grep -v ".next/types"`
Run: `pnpm exec eslint src/components/dashboard/reports/reports-content.tsx src/app/dashboard/hospital-admin/reports/page.tsx src/components/dashboard/sidebar.tsx`

---

### Task 7: Full verification and manual walkthrough

**Files:** none (verification only)

- [ ] **Step 1: Full typecheck, lint, build**

Run: `pnpm exec tsc --noEmit 2>&1 | grep -v ".next/types"` — expect no output.
Run: `pnpm exec eslint .` — expect no errors.
Run: `pnpm build` — expect success; confirm `/dashboard/hospital-admin/reports` appears in the route list.

- [ ] **Step 2: Manual walkthrough**

Logged in as Dr. Niyibizi:
1. Sidebar shows "Reports" between Referral Log and (nothing, since lab items are hidden for this role).
2. Open Reports, click through all 4 tabs, confirm no crashes and numbers render (zeros are fine if no data in range).
3. Change the date-range picker, confirm numbers update.
4. Compare Laboratory tab's "Laboratory requests"/"Completed"/"Pending" counts against `/dashboard/lab` (as a lab nurse at the same facility) for consistency.
5. Compare Referral tab's "Incoming"/"Accepted" counts against the Referral Log page for the same facility.

- [ ] **Step 3: Report results**

Summarize pass/fail for each walkthrough step. Do not commit unless explicitly asked.
