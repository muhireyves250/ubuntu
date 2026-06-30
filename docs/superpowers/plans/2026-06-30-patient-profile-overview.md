# Patient Profile Overview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Overview tab as the default landing tab on the patient detail page, a red alert banner for high-risk patients, and skeleton loaders.

**Architecture:** `ProfileOverviewTab` is a new self-contained component that reads from props (patient, visits, pregnancy, ancVisits) and fires `onAction(tab)` to switch tabs. The page shell imports it and wires it like the existing tab components. Skeleton state lives inside `ProfileOverviewTab` via a 300ms `useEffect`.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, Tailwind CSS v4, localStorage-backed hooks.

## Global Constraints

- pnpm only (no npm/yarn/bun)
- Path alias `@/*` → `src/*`
- Tailwind v4 — no `tailwind.config.*`, config in `postcss.config.mjs`
- No new routes, no new stores, no new hooks
- All data from existing hooks: `usePatient`, `useVisitsForPatient`, `usePregnancyForPatient`, `useAncVisitsForPregnancy`
- `RiskBadge` accepts `level: RiskLevel` and `size?: "sm" | "md" | "lg"`
- Existing TABS type in page: `"Patient Details" | "Signs & Symptoms" | "New Assessment" | "Pregnancy" | "Classification" | "Visit History"` — will add `"Overview"` as first

---

### Task 1: Create `ProfileOverviewTab` component

**Files:**
- Create: `src/components/patients/profile-overview-tab.tsx`

**Interfaces:**
- Produces: `ProfileOverviewTab({ patient, visits, pregnancy, ancVisits, onAction })` — imported and rendered by Task 2

```ts
// types consumed by this component:
import type { Patient, Visit, Pregnancy, AncVisit } from "@/lib/patients/types";
// Tab type is defined in the page; onAction receives the tab name string
```

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { useEffect, useState } from "react";
import { RiskBadge } from "@/components/patients/risk-badge";
import { SYMPTOM_CHECKLIST } from "@/lib/patients/symptom-checklist";
import { formatLabs } from "@/lib/format";
import { gestationalAgeWeeks } from "@/lib/patients/pregnancy";
import type { Patient, Visit, Pregnancy, AncVisit } from "@/lib/patients/types";

const SYMPTOM_LABEL = new Map(SYMPTOM_CHECKLIST.map((s) => [s.id, s.label]));

function fmt(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
        {title}
      </p>
      {children}
    </div>
  );
}

function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="animate-pulse rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-3 h-3 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-4 rounded bg-zinc-100 dark:bg-zinc-800"
            style={{ width: `${70 + (i % 3) * 10}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function ProfileOverviewTab({
  patient,
  visits,
  pregnancy,
  ancVisits,
  onAction,
}: {
  patient: Patient;
  visits: Visit[];
  pregnancy: Pregnancy | null;
  ancVisits: AncVisit[];
  onAction: (tab: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(t);
  }, []);

  const latestVisit = visits[0] ?? null;
  const currentRisk = latestVisit?.riskLevel ?? "green";
  const gaWeeks = pregnancy
    ? gestationalAgeWeeks(pregnancy.lmpDate)
    : patient.gestationalAgeWeeks;

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <SkeletonCard lines={1} />
        <SkeletonCard lines={4} />
        <SkeletonCard lines={3} />
        <SkeletonCard lines={3} />
        <div className="animate-pulse flex gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-9 flex-1 rounded-lg bg-zinc-100 dark:bg-zinc-800" />
          ))}
        </div>
      </div>
    );
  }

  const topSymptoms =
    latestVisit && latestVisit.symptomIds.length > 0
      ? latestVisit.symptomIds
          .slice(0, 3)
          .map((id) => SYMPTOM_LABEL.get(id) ?? id)
          .join(", ")
      : "None";

  return (
    <div className="flex flex-col gap-4">
      {/* Risk card */}
      <SectionCard title="Current risk">
        <div className="flex flex-col items-center gap-2 py-2">
          <RiskBadge level={currentRisk} size="lg" />
          <p className="text-xs text-zinc-400">
            {latestVisit
              ? `Last assessed: ${latestVisit.date}`
              : "No assessments yet"}
          </p>
        </div>
      </SectionCard>

      {/* Demographics card */}
      <SectionCard title="Demographics">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <dt className="text-xs text-zinc-400">Full name</dt>
            <dd className="font-medium text-zinc-900 dark:text-zinc-50">
              {patient.name}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-400">Age</dt>
            <dd className="font-medium text-zinc-900 dark:text-zinc-50">
              {patient.age} years
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-400">Gestational age</dt>
            <dd className="font-medium text-zinc-900 dark:text-zinc-50">
              {gaWeeks} weeks
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-400">Facility</dt>
            <dd className="font-medium text-zinc-900 dark:text-zinc-50">
              {patient.facility}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs text-zinc-400">Registered</dt>
            <dd className="font-medium text-zinc-900 dark:text-zinc-50">
              {patient.registeredAt}
            </dd>
          </div>
        </dl>
      </SectionCard>

      {/* Active pregnancy card */}
      <SectionCard title="Active pregnancy">
        {pregnancy ? (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <dt className="text-xs text-zinc-400">Gestational age</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                {gaWeeks} weeks
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-400">EDD</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                {fmt(pregnancy.eddDate)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-400">Obstetric</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                G{pregnancy.gravidity} P{pregnancy.parity}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-400">ANC visits</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                {ancVisits.length} visit{ancVisits.length !== 1 ? "s" : ""} recorded
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-zinc-400">No active pregnancy on record.</p>
        )}
      </SectionCard>

      {/* Latest assessment card */}
      <SectionCard title="Latest assessment">
        {latestVisit ? (
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">
                {latestVisit.date}
              </span>
              <RiskBadge level={latestVisit.riskLevel} size="sm" />
            </div>
            <div>
              <span className="text-xs text-zinc-400">Symptoms: </span>
              <span className="text-zinc-700 dark:text-zinc-300">
                {topSymptoms}
              </span>
            </div>
            <div>
              <span className="text-xs text-zinc-400">Labs: </span>
              <span className="text-zinc-700 dark:text-zinc-300">
                {formatLabs(latestVisit)}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-400">No assessments recorded yet.</p>
        )}
      </SectionCard>

      {/* Quick actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => onAction("New Assessment")}
          className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          New Assessment
        </button>
        <button
          type="button"
          onClick={() => onAction("Visit History")}
          className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          View History
        </button>
        <button
          type="button"
          disabled
          title="Coming soon"
          className="flex-1 cursor-not-allowed rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-400 dark:border-zinc-800 dark:text-zinc-600"
        >
          New Referral
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
pnpm build 2>&1 | tail -10
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/patients/profile-overview-tab.tsx
git commit -m "feat: add ProfileOverviewTab component (issue #14)"
```

---

### Task 2: Wire Overview tab and red alert banner into patient detail page

**Files:**
- Modify: `src/app/dashboard/nurse/patients/[id]/page.tsx`

**Interfaces:**
- Consumes: `ProfileOverviewTab` from `@/components/patients/profile-overview-tab`
- Consumes: `useAncVisitsForPregnancy` from `@/lib/patients/use-patients`

- [ ] **Step 1: Update the page**

Apply these changes to `src/app/dashboard/nurse/patients/[id]/page.tsx`:

**a) Add import at top (after existing imports):**
```tsx
import { ProfileOverviewTab } from "@/components/patients/profile-overview-tab";
```

**b) Add `useAncVisitsForPregnancy` to the existing hook imports from `@/lib/patients/use-patients`:**
```tsx
import {
  usePatient,
  useVisitsForPatient,
  usePregnancyForPatient,
  useAncVisitsForPregnancy,
} from "@/lib/patients/use-patients";
```

**c) Replace the `TABS` constant:**
```tsx
const TABS = [
  "Overview",
  "Patient Details",
  "Signs & Symptoms",
  "New Assessment",
  "Pregnancy",
  "Classification",
  "Visit History",
] as const;
```

**d) Inside `PatientDetailContent`, add `useAncVisitsForPregnancy` call after the existing hooks:**
```tsx
const ancVisits = useAncVisitsForPregnancy(pregnancy?.id ?? "");
```

**e) Change the default tab state from `"Patient Details"` to `"Overview"`:**
```tsx
const [activeTab, setActiveTab] = useState<Tab>("Overview");
```

**f) Add the red alert banner. Insert this block directly before the existing first `<div>` (the ID/actions header row) inside the returned JSX:**
```tsx
{currentRisk === "red" && (
  <div className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white shadow-sm">
    <span>⚠</span>
    <span>
      HIGH RISK — This patient is currently classified Red. Immediate review
      recommended.
    </span>
  </div>
)}
```

**g) Add the Overview tab render block inside the tab content section, before the existing `{activeTab === "Patient Details" && ...}` block:**
```tsx
{activeTab === "Overview" && (
  <ProfileOverviewTab
    patient={patient}
    visits={visits}
    pregnancy={pregnancy}
    ancVisits={ancVisits}
    onAction={(tab) => setActiveTab(tab as Tab)}
  />
)}
```

- [ ] **Step 2: Verify build and lint**

```bash
pnpm build 2>&1 | tail -10 && pnpm lint 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/dashboard/nurse/patients/[id]/page.tsx"
git commit -m "feat: wire Overview tab and red alert banner into patient detail page (issue #14)"
```

---

### Task 3: Browser verification

**Files:** none changed.

- [ ] **Step 1: Confirm dev server port**

```bash
for p in 3000 3001 3002; do
  code=$(curl -s -o /dev/null -m 2 -w "%{http_code}" http://localhost:$p/login)
  echo "$p: $code"
done
```

Use the port returning `200`.

- [ ] **Step 2: Run Playwright verification script**

Create and run `/tmp/verify-profile.js`:

```js
const { chromium } = require("playwright-core");
const PORT = process.env.PORT || "3001";
const PW = "/tmp/claude-1000/-home-ebenezer-Projects-ubuntumed/26eef4ec-72f8-4b49-8c57-c7aec9f6f036/scratchpad/pw-verify";

(async () => {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/google-chrome",
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();
  page.on("pageerror", (err) => console.log("PAGEERROR:", err.message));

  // Login
  await page.goto(`http://localhost:${PORT}/login`, { waitUntil: "networkidle" });
  await page.getByPlaceholder("Enter your password").fill("nurse123");
  await page.getByRole("button", { name: /log in/i }).click();
  await page.waitForLoadState("networkidle");

  // Open patient list
  await page.getByRole("link", { name: /patient registry/i }).click();
  await page.waitForLoadState("networkidle");

  // Open first patient — should land on Overview tab (skeleton for 300ms then real content)
  await page.locator("a[href^='/dashboard/nurse/patients/patient-']").first().click();
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `${PW}/40-profile-skeleton.png` });

  // Wait for skeleton to resolve
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${PW}/41-profile-overview.png` });

  // Verify Overview tab content visible
  const overviewText = await page.locator("text=Current risk").count();
  console.log("Risk card visible:", overviewText > 0);
  const demoText = await page.locator("text=Demographics").count();
  console.log("Demographics card visible:", demoText > 0);
  const actionText = await page.locator("text=New Assessment").count();
  console.log("Quick actions visible:", actionText > 0);

  // Click "New Assessment" quick action — should switch to New Assessment tab
  await page.getByRole("button", { name: "New Assessment" }).first().click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${PW}/42-quick-action-assessment.png` });
  const wizardVisible = await page.locator("text=VITAL SIGNS").count();
  console.log("Switched to New Assessment tab:", wizardVisible > 0);

  // Find a RED patient to verify alert banner
  // Run a new assessment with convulsions to make current patient red, then back to overview
  const numInputs = page.locator("input[type=number]");
  const vals = ["130", "90", "37.2", "82", "18", "68", "160"];
  for (let i = 0; i < vals.length; i++) await numInputs.nth(i).fill(vals[i]);
  const wizardNext = () =>
    page.locator("button:not([disabled])").filter({ hasText: /^Next$/ });
  await wizardNext().click();
  await page.waitForTimeout(300);
  await page.getByLabel(/convulsions/i).check();
  await wizardNext().click();
  await page.waitForTimeout(300);
  await wizardNext().click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: /submit assessment/i }).click();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: /back to patient/i }).click();
  await page.waitForTimeout(300);
  // Now navigate to Overview tab
  await page.getByRole("button", { name: "Overview" }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${PW}/43-red-patient-overview.png` });
  const redBanner = await page.locator("text=HIGH RISK").count();
  console.log("Red alert banner visible:", redBanner > 0);

  await browser.close();
  console.log("DONE — screenshots 40-43 written");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

Run:
```bash
node /tmp/verify-profile.js; echo "EXIT:$?"
```

Expected: `EXIT:0`, all four console booleans print `true`.

- [ ] **Step 4: Push and close issue**

```bash
git push origin main
gh issue close 14 --comment "Implemented: Overview tab is now the default landing tab on /dashboard/nurse/patients/[id], with risk card, demographics, active pregnancy summary, latest assessment snapshot, quick actions, and red alert banner. Screenshots 40-43 verified."
```

---

## Self-Review

**Spec coverage:**
- ✓ Overview tab as default — Task 2 (TABS[0] = "Overview", useState default)
- ✓ Patient info card (demographics) — Task 1, Demographics SectionCard
- ✓ Current risk level large, prominent — Task 1, RiskBadge size="lg" in Risk card
- ✓ Active pregnancy summary — Task 1, Active pregnancy SectionCard
- ✓ Latest assessment snapshot — Task 1, Latest assessment SectionCard
- ✓ Quick actions: New Assessment, View History, New Referral stub — Task 1, Quick actions row
- ✓ Red alert banner for RED patients — Task 2, `currentRisk === "red"` banner
- ✓ Skeleton loaders — Task 1, 300ms `useEffect` loading state
- ✓ `useAncVisitsForPregnancy` wired — Task 2

**Placeholder scan:** No TBDs. All code blocks complete. ✓

**Type consistency:**
- `onAction: (tab: string) => void` in ProfileOverviewTab — page casts `tab as Tab` safely ✓
- `RiskBadge` size `"lg"` is valid (accepts `"sm" | "md" | "lg"`) ✓
- `useAncVisitsForPregnancy(pregnancy?.id ?? "")` — empty string returns `[]` (safe) ✓
- `visits[0]` is `Visit | undefined` — guarded with `?? null` ✓
