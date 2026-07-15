# Gynecologist Recommendations (Slice 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a Gynecologist leave a specialist recommendation on an Orange/Yellow patient's record, let the responsible ANC Nurse respond, and notify each side via the existing derived-alert bell — spec sections 6–8 of the Gynecologist spec.

**Architecture:** New `Recommendation` entity persisted exactly like `Referral` (localStorage-backed module cache in `storage.ts`, `useSyncExternalStore` hooks in `use-patients.ts`). One new tab on the existing shared patient detail page. Two new derived alert branches in the existing `useNotificationAlerts`.

**Tech Stack:** Next.js App Router, React 19, TypeScript strict, Tailwind v4, pnpm. No test runner — verify with `pnpm exec tsc --noEmit`, `pnpm exec eslint .`, `pnpm build`, plus manual walkthrough.

## Global Constraints

- Never use `git add -A`/`git add .` — stage explicit paths only.
- Do not commit unless the user explicitly asks.
- No read/unread persistence — alerts derive from `status`/`acknowledgedByGynecologistAt` fields on the `Recommendation` record itself, same convention as the rest of the notification system.
- Verify with `pnpm exec tsc --noEmit` (ignore stale `.next/types/*`) and `pnpm exec eslint <changed files>` after every task; `pnpm build` at the end.

---

### Task 1: `Recommendation` type and storage persistence

**Files:**
- Modify: `src/lib/patients/types.ts`
- Modify: `src/lib/patients/storage.ts`

**Interfaces:**
- Produces: `Recommendation` type; `subscribeToRecommendations`, `getRecommendationsSnapshot`, `getServerRecommendationsSnapshot`, `addRecommendation`, `updateRecommendation` — mirroring the existing `Referral` functions exactly.

- [ ] **Step 1: Add the `Recommendation` type**

In `src/lib/patients/types.ts`, add after the `Referral` interface (after line 105, before `export interface Pregnancy`):
```ts
export type RecommendationStatus = "open" | "responded";

export interface Recommendation {
  id: string;
  patientId: string;
  createdAt: string;
  createdByGynecologist: string;
  createdByFacility: string;
  riskLevelAtCreation: RiskLevel;
  message: string;
  status: RecommendationStatus;
  nurseResponse?: string;
  respondedByNurse?: string;
  respondedAt?: string;
  acknowledgedByGynecologistAt?: string;
}
```

- [ ] **Step 2: Add storage persistence**

In `src/lib/patients/storage.ts`:

1. Update the type import at the top:
```ts
import type { Patient, Visit, Referral, Pregnancy, Recommendation } from "./types";
```

2. Add a key, cache, and listener set alongside the existing referral ones:
```ts
const RECOMMENDATIONS_KEY = "ubuntumed.recommendations";
let recommendationsCache: Recommendation[] | null = null;
const recommendationListeners = new Set<() => void>();
```

3. Add a shape guard next to `isCurrentShapeReferral`:
```ts
function isCurrentShapeRecommendation(rec: Recommendation): boolean {
  return (
    typeof rec.createdAt === "string" &&
    typeof rec.createdByGynecologist === "string" &&
    typeof rec.message === "string"
  );
}
```

4. Add a loader next to `loadReferrals`:
```ts
function loadRecommendations(): Recommendation[] {
  if (recommendationsCache) return recommendationsCache;
  const stored = readList<Recommendation>(RECOMMENDATIONS_KEY);
  const usable = stored && stored.every(isCurrentShapeRecommendation) ? stored : null;
  recommendationsCache = usable ?? [];
  if (!usable) writeList(RECOMMENDATIONS_KEY, recommendationsCache);
  return recommendationsCache;
}
```

5. Add the public API next to the matching referral exports:
```ts
export function subscribeToRecommendations(onChange: () => void) {
  recommendationListeners.add(onChange);
  return () => recommendationListeners.delete(onChange);
}

export function getRecommendationsSnapshot(): Recommendation[] {
  return loadRecommendations();
}

export function getServerRecommendationsSnapshot(): Recommendation[] {
  return [];
}

export function addRecommendation(recommendation: Recommendation) {
  recommendationsCache = [...loadRecommendations(), recommendation];
  writeList(RECOMMENDATIONS_KEY, recommendationsCache);
  recommendationListeners.forEach((listener) => listener());
}

export function updateRecommendation(id: string, updates: Partial<Recommendation>) {
  recommendationsCache = loadRecommendations().map((r) =>
    r.id === id ? { ...r, ...updates } : r,
  );
  writeList(RECOMMENDATIONS_KEY, recommendationsCache);
  recommendationListeners.forEach((listener) => listener());
}
```

- [ ] **Step 3: Verify**

Run: `pnpm exec tsc --noEmit 2>&1 | grep -v ".next/types"`
Run: `pnpm exec eslint src/lib/patients/types.ts src/lib/patients/storage.ts`

---

### Task 2: Hooks and mutators in `use-patients.ts`

**Files:**
- Modify: `src/lib/patients/use-patients.ts`

**Interfaces:**
- Consumes: storage functions from Task 1, existing `getCurrentUserSnapshot`, `useLatestRiskLevel`, `useActiveEmergencyPatientIds`.
- Produces: `useRecommendationsForPatient(patientId)`, `createRecommendation(patientId, message)`, `respondToRecommendation(id, response)`, `acknowledgeRecommendation(id)`. Widens `NotificationAlert.type` and `useNotificationAlerts`.

- [ ] **Step 1: Import the new storage functions and type**

Add to the existing `import { ... } from "./storage";` block:
```ts
  subscribeToRecommendations,
  getRecommendationsSnapshot,
  getServerRecommendationsSnapshot,
  addRecommendation,
  updateRecommendation,
```
Add to the existing `import type { ... } from "./types";` block:
```ts
  Recommendation,
```

- [ ] **Step 2: Add the hooks and mutators**

Add near `useReferrals`/`useActiveEmergencyReferral` (after `useActiveEmergencyPatientIds`, before `useActiveEmergencyReferral` — placement doesn't matter functionally since these are function declarations, but keep referral-adjacent code grouped):

```ts
export function useRecommendationsForPatient(patientId: string): Recommendation[] {
  const all = useSyncExternalStore(
    subscribeToRecommendations,
    getRecommendationsSnapshot,
    getServerRecommendationsSnapshot,
  );
  return useMemo(
    () =>
      all
        .filter((r) => r.patientId === patientId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [all, patientId],
  );
}

export function createRecommendation(patientId: string, message: string, riskLevel: RiskLevel): Recommendation {
  const { name, facility } = getCurrentUserSnapshot();
  const recommendation: Recommendation = {
    id: `recommendation-${crypto.randomUUID()}`,
    patientId,
    createdAt: new Date().toISOString(),
    createdByGynecologist: name,
    createdByFacility: facility,
    riskLevelAtCreation: riskLevel,
    message,
    status: "open",
  };
  addRecommendation(recommendation);
  return recommendation;
}

export function respondToRecommendation(id: string, response: string): Recommendation {
  const { name } = getCurrentUserSnapshot();
  updateRecommendation(id, {
    status: "responded",
    nurseResponse: response,
    respondedByNurse: name,
    respondedAt: new Date().toISOString(),
  });
  return getRecommendationsSnapshot().find((r) => r.id === id)!;
}

export function acknowledgeRecommendation(id: string): Recommendation {
  updateRecommendation(id, { acknowledgedByGynecologistAt: new Date().toISOString() });
  return getRecommendationsSnapshot().find((r) => r.id === id)!;
}
```

Note: `useSyncExternalStore` and `useMemo` are already imported in this file (used throughout); `crypto.randomUUID()` matches the pattern already used in `getOrCreateEmergencyReferral`/`createReferral`.

- [ ] **Step 3: Extend `NotificationAlert` and `useNotificationAlerts`**

Widen the type (in the same edit as Slice 1's additions, now a five-member union):
```ts
  type: "lab_request" | "lab_completed" | "referral_pending" | "referral_accepted" | "recommendation_open" | "recommendation_responded";
```

Add a `useRecommendations()`-style read inside `useNotificationAlerts` (add a plain `useSyncExternalStore` call for all recommendations, not patient-scoped, since alerts need to scan every patient) and two new branches. Full updated function:

```ts
export function useNotificationAlerts(role: string): NotificationAlert[] {
  const visits = useVisits();
  const patients = usePatients();
  const pregnancies = usePregnancies();
  const referrals = useReferrals();
  const recommendations = useSyncExternalStore(
    subscribeToRecommendations,
    getRecommendationsSnapshot,
    getServerRecommendationsSnapshot,
  );
  const currentUser = getCurrentUserSnapshot();

  return useMemo(() => {
    const alerts: NotificationAlert[] = [];
    const pregnancyIdMap = new Map(pregnancies.map((p) => [p.id, p]));

    for (const v of visits) {
      // ...existing lab_request / lab_completed logic, unchanged...
    }

    if (role === "gynecologist") {
      // ...existing referral_pending / referral_accepted logic, unchanged...
    }

    if (role === "nurse") {
      for (const rec of recommendations) {
        if (rec.status !== "open") continue;
        const patient = patients.find((p) => p.id === rec.patientId);
        if (!patient) continue;
        alerts.push({
          id: `recommendation-open-${rec.id}`,
          type: "recommendation_open",
          patientId: patient.id,
          patientName: `${patient.firstName} ${patient.lastName}`,
          title: "New Specialist Recommendation",
          message: `${rec.createdByGynecologist} left a note for ${patient.firstName} ${patient.lastName}.`,
          date: rec.createdAt.slice(0, 10),
          priority: "Urgent",
        });
      }
    }

    if (role === "gynecologist") {
      for (const rec of recommendations) {
        if (
          rec.status === "responded" &&
          !rec.acknowledgedByGynecologistAt &&
          rec.createdByGynecologist === currentUser.name
        ) {
          const patient = patients.find((p) => p.id === rec.patientId);
          if (!patient) continue;
          alerts.push({
            id: `recommendation-responded-${rec.id}`,
            type: "recommendation_responded",
            patientId: patient.id,
            patientName: `${patient.firstName} ${patient.lastName}`,
            title: "Nurse Responded to Your Recommendation",
            message: `${rec.respondedByNurse} responded regarding ${patient.firstName} ${patient.lastName}.`,
            date: (rec.respondedAt ?? rec.createdAt).slice(0, 10),
            priority: "Normal",
          });
        }
      }
    }

    return alerts.sort((a, b) => {
      if (a.priority === "Emergency" && b.priority !== "Emergency") return -1;
      if (a.priority !== "Emergency" && b.priority === "Emergency") return 1;
      return b.date.localeCompare(a.date);
    });
  }, [visits, patients, pregnancies, referrals, recommendations, role, currentUser.facility, currentUser.name]);
}
```

Do not duplicate the existing `role === "gynecologist"` referral block — there are now two separate `if (role === "gynecologist")` blocks (referrals, then recommendations later after the nurse block) plus the pre-existing one; keep them as written above, don't merge, to keep this diff minimal and matching the Slice 1 code structure already in the file.

- [ ] **Step 4: Verify**

Run: `pnpm exec tsc --noEmit 2>&1 | grep -v ".next/types"`
Run: `pnpm exec eslint src/lib/patients/use-patients.ts`

---

### Task 3: "Specialist Notes" tab component

**Files:**
- Create: `src/components/patients/specialist-notes-tab.tsx`

**Interfaces:**
- Consumes: `useRecommendationsForPatient`, `createRecommendation`, `respondToRecommendation`, `acknowledgeRecommendation` from Task 2; `useAuth()` for the current user's role/name; `RiskBadge` (existing component).

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import {
  useRecommendationsForPatient,
  createRecommendation,
  respondToRecommendation,
  acknowledgeRecommendation,
} from "@/lib/patients/use-patients";
import { RiskBadge } from "@/components/patients/risk-badge";
import { relativeTime } from "@/lib/format";
import type { RiskLevel } from "@/lib/patients/types";

export function SpecialistNotesTab({
  patientId,
  currentRiskLevel,
}: {
  patientId: string;
  currentRiskLevel: RiskLevel;
}) {
  const { user } = useAuth();
  const recommendations = useRecommendationsForPatient(patientId);
  const [showAddForm, setShowAddForm] = useState(false);
  const [message, setMessage] = useState("");
  const [responseDrafts, setResponseDrafts] = useState<Record<string, string>>({});

  function handleAdd() {
    if (!message.trim()) return;
    createRecommendation(patientId, message.trim(), currentRiskLevel);
    setMessage("");
    setShowAddForm(false);
  }

  function handleRespond(id: string) {
    const response = responseDrafts[id]?.trim();
    if (!response) return;
    respondToRecommendation(id, response);
    setResponseDrafts((prev) => ({ ...prev, [id]: "" }));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Specialist Notes
        </p>
        {user?.role === "gynecologist" && !showAddForm && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="rounded-lg bg-[#0f766e] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-800"
          >
            Add Recommendation
          </button>
        )}
      </div>

      {showAddForm && (
        <div className="flex flex-col gap-2.5 rounded-xl border border-teal-300 bg-teal-50 p-4 dark:border-teal-800 dark:bg-teal-950/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-400">
              New recommendation for this {currentRiskLevel} case
            </span>
            <RiskBadge level={currentRiskLevel} size="sm" />
          </div>
          <textarea
            required
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Recommend follow-up actions, treatment adjustments, or monitoring instructions…"
            className="resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => { setShowAddForm(false); setMessage(""); }}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAdd}
              className="rounded-lg bg-[#0f766e] px-3 py-2 text-sm font-medium text-white hover:bg-teal-800"
            >
              Send Recommendation
            </button>
          </div>
        </div>
      )}

      {recommendations.length === 0 ? (
        <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          No specialist recommendations yet.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {recommendations.map((rec) => (
            <div key={rec.id} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {rec.createdByGynecologist}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {rec.createdByFacility} · {relativeTime(rec.createdAt)}
                  </p>
                </div>
                <RiskBadge level={rec.riskLevelAtCreation} size="sm" />
              </div>
              <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{rec.message}</p>

              {rec.status === "responded" ? (
                <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/50">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Response from {rec.respondedByNurse}
                  </p>
                  <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{rec.nurseResponse}</p>
                  {user?.role === "gynecologist" &&
                    rec.createdByGynecologist === user.name &&
                    !rec.acknowledgedByGynecologistAt && (
                      <button
                        type="button"
                        onClick={() => acknowledgeRecommendation(rec.id)}
                        className="mt-2 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                      >
                        Acknowledge
                      </button>
                    )}
                </div>
              ) : user?.role === "nurse" ? (
                <div className="mt-3 flex flex-col gap-2">
                  <textarea
                    rows={2}
                    value={responseDrafts[rec.id] ?? ""}
                    onChange={(e) =>
                      setResponseDrafts((prev) => ({ ...prev, [rec.id]: e.target.value }))
                    }
                    placeholder="Respond after implementing this recommendation…"
                    className="resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                  />
                  <button
                    type="button"
                    onClick={() => handleRespond(rec.id)}
                    className="self-end rounded-lg bg-[#0f766e] px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800"
                  >
                    Send Response
                  </button>
                </div>
              ) : (
                <p className="mt-3 text-xs text-zinc-400">Awaiting nurse response.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `pnpm exec tsc --noEmit 2>&1 | grep -v ".next/types"` — expect an error only in this new file if `currentRiskLevel` prop isn't wired yet (Task 4 wires it); if the component itself has no internal type errors, that's sufficient for this step.
Run: `pnpm exec eslint src/components/patients/specialist-notes-tab.tsx`

---

### Task 4: Wire the tab into the patient detail page

**Files:**
- Modify: `src/app/dashboard/nurse/patients/[id]/page.tsx`

**Interfaces:**
- Consumes: `SpecialistNotesTab` from Task 3. Uses the existing `currentRisk` variable already computed on this page (`const currentRisk = activeReferral ? "red" : (allVisits[0]?.riskLevel ?? "green");` from Slice 1).

- [ ] **Step 1: Add the tab to `TABS`**

```ts
const TABS = [
  "Overview",
  "Patient Details",
  "Signs & Symptoms",
  "Pregnancy",
  "Visit History",
  "New Assessment",
  "AI Prediction",
  "Specialist Notes",
] as const;
```

- [ ] **Step 2: Import the component**

Add alongside the other tab imports:
```ts
import { SpecialistNotesTab } from "@/components/patients/specialist-notes-tab";
```

- [ ] **Step 3: Render it**

After the `{activeTab === "AI Prediction" && (...)}` block (immediately before the closing `</div>` that ends the tab-content container, i.e. right before the "Add a comment" block), add:
```tsx
        {activeTab === "Specialist Notes" && (
          <SpecialistNotesTab patientId={patient.id} currentRiskLevel={currentRisk} />
        )}
```

- [ ] **Step 4: Verify**

Run: `pnpm exec tsc --noEmit 2>&1 | grep -v ".next/types"`
Run: `pnpm exec eslint "src/app/dashboard/nurse/patients/[id]/page.tsx" src/components/patients/specialist-notes-tab.tsx`

---

### Task 5: Full verification and manual walkthrough

**Files:** none (verification only)

- [ ] **Step 1: Full typecheck, lint, build**

Run: `pnpm exec tsc --noEmit 2>&1 | grep -v ".next/types"` — expect no output.
Run: `pnpm exec eslint .` — expect no errors.
Run: `pnpm build` — expect success.

- [ ] **Step 2: Manual walkthrough**

Against the running dev server:
1. Log in as `gynecologist-mutesi`. Open an Orange or Yellow patient (via Risk Classification) at Bugesera District Hospital. Go to "Specialist Notes" → confirm "Add Recommendation" is visible, submit one.
2. Log in as `nurse-kagame` (same facility). Confirm the bell shows "New Specialist Recommendation"; open the patient, confirm the response textarea appears under the open recommendation; submit a response.
3. Confirm the alert disappears from the nurse's bell after responding.
4. Log back in as `gynecologist-mutesi`. Confirm "Nurse Responded to Your Recommendation" appears in the bell; open the patient, confirm the response is visible with an "Acknowledge" button; click it.
5. Confirm the alert clears from the gynecologist's bell after acknowledging.

- [ ] **Step 3: Report results**

Summarize pass/fail for each walkthrough step. Do not commit unless explicitly asked.
