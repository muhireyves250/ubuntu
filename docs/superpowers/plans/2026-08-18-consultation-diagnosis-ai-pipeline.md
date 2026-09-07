# Consultation-to-Discharge Assessment Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn "New Assessment" into a full per-visit pipeline (Vitals → Symptoms → Consultation → Labs → AI Review → Final Diagnosis → Treatment → Consumables → Followup → Vaccination → Discharge), wire the real (currently dead) backend AI-prediction endpoint in place of the fake client-side simulation, and make Visit History a read-only record of everything done during each visit.

**Architecture:** Two repos change together. Backend (`Antenatal-api`) gets a `recommendation` text column on `RiskPrediction` and a rule-based fallback inside `AiPredictionService.predict()` so `POST /predictions/visits/:visitId/run` returns a usable result today without a real ML service. Frontend (`ubuntumed`) gains a `Consultation` wizard step (writes back to the shared Pregnancy history record), a real `Send to AI` review step, and four new wizard steps (Final Diagnosis, Treatment, Consumables, Vaccination) that reuse the exact mutations already used by Visit History's per-visit sections — those sections then become read-only.

**Tech Stack:** NestJS + Prisma (backend), Next.js App Router + TypeScript + React Query (frontend). No test suite in either repo.

**Spec:** `docs/superpowers/specs/2026-08-18-consultation-diagnosis-ai-pipeline-design.md`

## Global Constraints

- No test suite exists in either repo. Verification per task is `npx tsc --noEmit` (both repos), `pnpm lint` + `pnpm build` (frontend), and live curl smoke tests against the running dev backend where the task touches an API contract.
- Backend schema changes use the established hand-written-migration pattern: write SQL matching Prisma's `YYYYMMDDHHMMSS_description/migration.sql` naming, apply via `PGPASSWORD=npg_BdwtL1Ua4fIV psql "postgresql://neondb_owner:npg_BdwtL1Ua4fIV@ep-odd-boat-at7q9vmi-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require" -f <file>`, then manually insert into `_prisma_migrations` (id via `gen_random_uuid()::text`, checksum via `sha256sum`), then `npx prisma generate` (Prisma CLI itself cannot reach the DB from this sandbox).
- The Consultation step edits the **shared Pregnancy history record** — no new per-visit history table.
- Diagnosis/Treatment/Consumables/Vaccination become wizard-only editors; Visit History's expanded row becomes read-only for these.
- `RiskLevel` is `GREEN`/`YELLOW`/`ORANGE`/`RED` (uppercase) in the Prisma enum, `"green"`/`"yellow"`/`"orange"`/`"red"` (lowercase) in frontend types — every task touching both sides must map between them (see existing `RISK_LEVEL_TO_FRONTEND` pattern in `src/lib/patients/patient-api.ts`).

---

### Task 1: Backend — `recommendation` field on `RiskPrediction` + rule-based fallback in `predict()`

**Files:**
- Modify: `/home/ebenezer/Projects/ubuntu/Antenatal-api/prisma/schema.prisma` (`RiskPrediction` model, line 632)
- Create: `/home/ebenezer/Projects/ubuntu/Antenatal-api/prisma/migrations/20260818170000_add_risk_prediction_recommendation/migration.sql`
- Modify: `/home/ebenezer/Projects/ubuntu/Antenatal-api/src/modules/ai-prediction/ai-prediction.service.ts`

**Interfaces:**
- Produces: `PredictionResult` gains `recommendation: string` (consumed by Task 3's frontend API layer, which maps it straight through — no shape change needed there beyond adding the field).
- Produces: `runForVisit()`'s return shape (the upserted `RiskPrediction` row) now always includes `recommendation: string | null` — Task 3 reads this field directly.
- Produces: a new `GET /predictions/visits/:visitId` endpoint returning the same shape as `runForVisit()`'s upsert (or `null` if no prediction has been run yet for that visit) — consumed by Task 2's `useRiskPredictionForVisit` and by Task 8's Visit History display, so a prediction persisted in an earlier session is still visible later without re-running it.

- [ ] **Step 1: Add the schema field**

Edit `prisma/schema.prisma` — in the `RiskPrediction` model, add `recommendation` right after `modelVersion`:

```prisma
model RiskPrediction {
  id                    String    @id @default(cuid())
  visitId               String    @unique
  visit                 Visit     @relation(fields: [visitId], references: [id])
  predictedRiskLevel    RiskLevel
  eclampsiaProb         Float
  hemorrhageProb        Float
  maternalDeathProb     Float
  emergencyReferralProb Float
  withinHours           Int
  modelVersion          String
  recommendation        String?
  createdAt             DateTime  @default(now())

  alerts Alert[]

  @@map("risk_predictions")
}
```

- [ ] **Step 2: Write and apply the migration**

Create `prisma/migrations/20260818170000_add_risk_prediction_recommendation/migration.sql`:

```sql
ALTER TABLE "risk_predictions" ADD COLUMN "recommendation" TEXT;
```

Apply it:

```bash
cd /home/ebenezer/Projects/ubuntu/Antenatal-api
PGPASSWORD=npg_BdwtL1Ua4fIV psql "postgresql://neondb_owner:npg_BdwtL1Ua4fIV@ep-odd-boat-at7q9vmi-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require" -f prisma/migrations/20260818170000_add_risk_prediction_recommendation/migration.sql
```

Register it in `_prisma_migrations` (mirror the exact pattern used for every prior migration this session — compute checksum with `sha256sum` on the migration.sql file, generate id with `gen_random_uuid()::text`, `INSERT INTO "_prisma_migrations" (id, checksum, migration_name, started_at, finished_at, applied_steps_count) VALUES (...)`), then:

```bash
npx prisma generate
```

- [ ] **Step 3: Run `npx tsc --noEmit -p .` to confirm the generated client compiles**

Expected: no errors (schema-only change, `recommendation` not yet referenced in code).

- [ ] **Step 4: Add the rule-based fallback engine to `ai-prediction.service.ts`**

Replace the whole file with:

```ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { RiskLevel } from '@prisma/client';
import { PrismaService } from '@shared/prisma/prisma.service';
import { firstValueFrom } from 'rxjs';

export interface PredictionInput {
  systolic?: number;
  diastolic?: number;
  hemoglobin?: number;
  platelets?: number;
  bloodSugar?: number;
  symptoms: string[];
  gestationalAge?: number;
  previousEclampsia: boolean;
}

export interface PredictionResult {
  predictedRiskLevel: string;
  eclampsiaProb: number;
  hemorrhageProb: number;
  maternalDeathProb: number;
  emergencyReferralProb: number;
  withinHours: number;
  modelVersion: string;
  recommendation: string;
}

// Rule-based stand-in for the real ML service. Mirrors the frontend's
// client-side simulation (src/lib/patients/ai-prediction.ts in the
// ubuntumed repo) so results stay consistent with what nurses saw before
// this feature existed. Swap this out for a second HTTP call once a real
// AI service is deployed — predict()'s public contract doesn't change.
function computeFallbackPrediction(input: PredictionInput): PredictionResult {
  const symptoms = new Set(input.symptoms.map((s) => s.toLowerCase()));

  let eclampsiaProb = 0;
  let hemorrhageProb = 0;
  let maternalDeathProb = 0;
  let emergencyReferralProb = 0;

  if (input.systolic != null && input.diastolic != null) {
    if (input.systolic >= 160 || input.diastolic >= 110) {
      eclampsiaProb = Math.max(eclampsiaProb, 0.72);
      emergencyReferralProb = Math.max(emergencyReferralProb, 0.7);
    } else if (input.systolic >= 140 || input.diastolic >= 90) {
      eclampsiaProb = Math.max(eclampsiaProb, 0.28);
    }
  }
  if (input.hemoglobin != null && input.hemoglobin < 7) {
    hemorrhageProb = Math.max(hemorrhageProb, 0.88);
    emergencyReferralProb = Math.max(emergencyReferralProb, 0.85);
  }
  if (input.previousEclampsia) {
    eclampsiaProb = Math.max(eclampsiaProb, eclampsiaProb + 0.2, 0.2);
  }
  if (symptoms.has('convulsions')) {
    eclampsiaProb = Math.max(eclampsiaProb, 0.95);
    emergencyReferralProb = Math.max(emergencyReferralProb, 0.96);
  }
  if (symptoms.has('bleeding') || symptoms.has('pph')) {
    hemorrhageProb = Math.max(hemorrhageProb, 0.85);
    emergencyReferralProb = Math.max(emergencyReferralProb, 0.88);
  }
  if (symptoms.has('difficulty-breathing') || symptoms.has('chest-pain')) {
    emergencyReferralProb = Math.max(emergencyReferralProb, 0.7);
  }

  maternalDeathProb = Math.min(
    0.98,
    eclampsiaProb * 0.3 + hemorrhageProb * 0.35 + emergencyReferralProb * 0.15,
  );

  const maxRisk = Math.max(
    eclampsiaProb,
    hemorrhageProb,
    maternalDeathProb,
    emergencyReferralProb,
  );

  let predictedRiskLevel: RiskLevel = RiskLevel.GREEN;
  if (maxRisk >= 0.75) predictedRiskLevel = RiskLevel.RED;
  else if (maxRisk >= 0.5) predictedRiskLevel = RiskLevel.ORANGE;
  else if (maxRisk >= 0.2) predictedRiskLevel = RiskLevel.YELLOW;

  const withinHours =
    predictedRiskLevel === RiskLevel.RED
      ? 2
      : predictedRiskLevel === RiskLevel.ORANGE
        ? 12
        : predictedRiskLevel === RiskLevel.YELLOW
          ? 48
          : 168;

  const recommendationParts: string[] = [];
  if (eclampsiaProb >= 0.7) {
    recommendationParts.push(
      'Prioritize blood pressure monitoring every 4 hours; assess for magnesium sulfate protocol.',
    );
  }
  if (hemorrhageProb >= 0.7) {
    recommendationParts.push(
      'Prioritize blood cross-matching and establish IV access.',
    );
  }
  if (emergencyReferralProb >= 0.8) {
    recommendationParts.push(
      'Prepare for immediate escalation and notify the receiving facility.',
    );
  }
  if (recommendationParts.length === 0) {
    recommendationParts.push('Follow routine antenatal care intervals.');
  }

  return {
    predictedRiskLevel,
    eclampsiaProb,
    hemorrhageProb,
    maternalDeathProb,
    emergencyReferralProb,
    withinHours,
    modelVersion: 'rule-based-fallback-v1',
    recommendation: recommendationParts.join(' '),
  };
}

@Injectable()
export class AiPredictionService {
  private readonly logger = new Logger(AiPredictionService.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async predict(input: PredictionInput): Promise<PredictionResult> {
    const baseUrl = this.config.get<string>('app.aiServiceUrl');
    try {
      const { data } = await firstValueFrom(
        this.http.post<PredictionResult>(`${baseUrl}/predict`, input),
      );
      return data;
    } catch (err) {
      this.logger.warn(
        `AI service unavailable, using rule-based fallback: ${(err as Error).message}`,
      );
      return computeFallbackPrediction(input);
    }
  }

  async runForVisit(visitId: string) {
    const visit = await this.prisma.visit.findUnique({
      where: { id: visitId },
      include: {
        vitalSigns: true,
        labResults: { orderBy: { createdAt: 'desc' }, take: 1 },
        symptoms: { select: { name: true } },
        pregnancy: {
          select: {
            previousEclampsia: true,
            edd: true,
          },
        },
      },
    });

    if (!visit) return null;

    const labs = visit.labResults[0];
    const gestationalAge = visit.pregnancy?.edd
      ? Math.round(
          ((visit.pregnancy.edd.getTime() - Date.now()) /
            (1000 * 60 * 60 * 24 * 7)) *
            -1 +
            40,
        )
      : undefined;

    const input: PredictionInput = {
      systolic: visit.vitalSigns?.systolic ?? undefined,
      diastolic: visit.vitalSigns?.diastolic ?? undefined,
      hemoglobin: labs?.hemoglobin ?? undefined,
      platelets: labs?.platelets ?? undefined,
      bloodSugar: labs?.bloodSugar ?? undefined,
      symptoms: visit.symptoms.map((s) => s.name),
      gestationalAge:
        gestationalAge !== undefined && gestationalAge > 0
          ? gestationalAge
          : undefined,
      previousEclampsia: visit.pregnancy?.previousEclampsia ?? false,
    };

    const result = await this.predict(input);

    const stored = await this.prisma.riskPrediction.upsert({
      where: { visitId },
      create: {
        visitId,
        predictedRiskLevel: result.predictedRiskLevel as RiskLevel,
        eclampsiaProb: result.eclampsiaProb,
        hemorrhageProb: result.hemorrhageProb,
        maternalDeathProb: result.maternalDeathProb,
        emergencyReferralProb: result.emergencyReferralProb,
        withinHours: result.withinHours,
        modelVersion: result.modelVersion,
        recommendation: result.recommendation,
      },
      update: {
        predictedRiskLevel: result.predictedRiskLevel as RiskLevel,
        eclampsiaProb: result.eclampsiaProb,
        hemorrhageProb: result.hemorrhageProb,
        maternalDeathProb: result.maternalDeathProb,
        emergencyReferralProb: result.emergencyReferralProb,
        withinHours: result.withinHours,
        modelVersion: result.modelVersion,
        recommendation: result.recommendation,
      },
    });

    return stored;
  }

  async findByVisitId(visitId: string) {
    return this.prisma.riskPrediction.findUnique({ where: { visitId } });
  }

  async findByAssessmentId(assessmentId: string) {
    const assessment = await this.prisma.riskAssessment.findUnique({
      where: { id: assessmentId },
      select: { visitId: true, riskLevel: true },
    });

    if (!assessment) throw new NotFoundException('Risk assessment not found');

    const prediction = await this.prisma.riskPrediction.findUnique({
      where: { visitId: assessment.visitId },
    });

    return {
      assessmentId,
      currentRisk: assessment.riskLevel,
      predictions: prediction
        ? {
            eclampsiaRisk: prediction.eclampsiaProb,
            hemorrhageRisk: prediction.hemorrhageProb,
            maternalDeathRisk: prediction.maternalDeathProb,
            emergencyReferralRisk: prediction.emergencyReferralProb,
          }
        : null,
      deteriorationWindow: prediction ? `${prediction.withinHours}h` : null,
      generatedAt: prediction?.createdAt ?? null,
    };
  }
}
```

Note: `predict()`'s return type changed from `Promise<PredictionResult | null>` to `Promise<PredictionResult>` (it never returns `null` anymore — the fallback always produces a result), and `runForVisit()` no longer has an `if (!result) return null;` early-return after calling `predict()`, since `result` is now always defined.

- [ ] **Step 5: Add the `GET /predictions/visits/:visitId` endpoint**

Modify `/home/ebenezer/Projects/ubuntu/Antenatal-api/src/modules/ai-prediction/ai-prediction.controller.ts` — add a new route above the existing `findByAssessmentId` route:

```ts
@Get('visits/:visitId')
@Roles(...CLINICAL_ROLES)
@ApiOperation({ summary: 'Get the stored AI prediction for a visit, if one has been run' })
findByVisitId(@Param('visitId') visitId: string) {
  return this.aiPredictionService.findByVisitId(visitId);
}
```

(`Get` is already imported from `@nestjs/common` alongside `Controller, Param, Post` — add it to that import if not already present.)

- [ ] **Step 6: Verify**

```bash
cd /home/ebenezer/Projects/ubuntu/Antenatal-api
npx tsc --noEmit -p .
```

Expected: no errors.

- [ ] **Step 7: Live smoke test**

With the dev server running (`nest start --watch`), log in and hit the endpoint for a real visit that has vitals/symptoms recorded:

```bash
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d '{"email":"uwase@ubuntumed.rw","password":"nurse123"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['accessToken'])")
curl -s -X POST "http://localhost:4000/api/predictions/visits/<a-real-visit-id>/run" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

Expected: JSON response with `predictedRiskLevel`, all four probability fields, `withinHours`, `modelVersion: "rule-based-fallback-v1"`, and a non-empty `recommendation` string — no `null` response, no 500.

Then confirm the GET endpoint returns the same stored row:

```bash
curl -s "http://localhost:4000/api/predictions/visits/<the-same-visit-id>" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

Expected: same prediction data as the POST response above.

- [ ] **Step 8: Commit**

```bash
cd /home/ebenezer/Projects/ubuntu/Antenatal-api
git add prisma/schema.prisma prisma/migrations/20260818170000_add_risk_prediction_recommendation src/modules/ai-prediction/ai-prediction.service.ts src/modules/ai-prediction/ai-prediction.controller.ts
git commit -m "feat: add rule-based AI prediction fallback and GET-by-visit endpoint"
```

---

### Task 2: Frontend — `risk-prediction-api.ts` + hooks/mutation

**Files:**
- Create: `/home/ebenezer/Projects/ubuntu/ubuntumed/src/lib/patients/risk-prediction-api.ts`
- Modify: `/home/ebenezer/Projects/ubuntu/ubuntumed/src/lib/patients/use-patients.ts`

**Interfaces:**
- Consumes: Task 1's `POST /predictions/visits/:visitId/run` response shape (`predictedRiskLevel: "GREEN"|"YELLOW"|"ORANGE"|"RED"`, `eclampsiaProb`, `hemorrhageProb`, `maternalDeathProb`, `emergencyReferralProb`, `withinHours`, `modelVersion`, `recommendation`, `createdAt`).
- Produces: `RiskPrediction` frontend type, `useRiskPredictionForVisit(visitId): RiskPrediction | null`, `runAiPrediction(visitId): Promise<RiskPrediction>` — consumed by Task 5's `AiReviewStep`.

- [ ] **Step 1: Create the API file**

```ts
// src/lib/patients/risk-prediction-api.ts
import { apiFetch } from "@/lib/api/client";
import { getStoredAccessToken } from "@/lib/auth/auth-context";
import type { RiskLevel } from "./types";

export interface RiskPrediction {
  visitId: string;
  predictedRiskLevel: RiskLevel;
  eclampsiaProb: number;
  hemorrhageProb: number;
  maternalDeathProb: number;
  emergencyReferralProb: number;
  withinHours: number;
  modelVersion: string;
  recommendation: string;
  createdAt: string;
}

interface BackendRiskPrediction {
  visitId: string;
  predictedRiskLevel: "GREEN" | "YELLOW" | "ORANGE" | "RED";
  eclampsiaProb: number;
  hemorrhageProb: number;
  maternalDeathProb: number;
  emergencyReferralProb: number;
  withinHours: number;
  modelVersion: string;
  recommendation: string | null;
  createdAt: string;
}

const RISK_LEVEL_TO_FRONTEND: Record<string, RiskLevel> = {
  GREEN: "green",
  YELLOW: "yellow",
  ORANGE: "orange",
  RED: "red",
};

function toFrontendRiskPrediction(p: BackendRiskPrediction): RiskPrediction {
  return {
    visitId: p.visitId,
    predictedRiskLevel: RISK_LEVEL_TO_FRONTEND[p.predictedRiskLevel] ?? "green",
    eclampsiaProb: p.eclampsiaProb,
    hemorrhageProb: p.hemorrhageProb,
    maternalDeathProb: p.maternalDeathProb,
    emergencyReferralProb: p.emergencyReferralProb,
    withinHours: p.withinHours,
    modelVersion: p.modelVersion,
    recommendation: p.recommendation ?? "",
    createdAt: p.createdAt,
  };
}

export async function runAiPredictionApi(visitId: string): Promise<RiskPrediction> {
  const token = getStoredAccessToken();
  const p = await apiFetch<BackendRiskPrediction>(`/predictions/visits/${visitId}/run`, {
    method: "POST",
    token: token ?? undefined,
  });
  return toFrontendRiskPrediction(p);
}

export async function fetchRiskPredictionForVisit(visitId: string): Promise<RiskPrediction | null> {
  const token = getStoredAccessToken();
  const p = await apiFetch<BackendRiskPrediction | null>(`/predictions/visits/${visitId}`, {
    token: token ?? undefined,
  });
  return p ? toFrontendRiskPrediction(p) : null;
}
```

- [ ] **Step 2: Add the hook + mutation wrapper to `use-patients.ts`**

Add the import near the other feature-API imports (alongside the `billing-api` import at line 34):

```ts
import { runAiPredictionApi, fetchRiskPredictionForVisit, type RiskPrediction } from "./risk-prediction-api";
```

Add near `useInvoiceForVisit`/`generateInvoice` (after line 316), matching that exact pattern:

```ts
export function useRiskPredictionForVisit(visitId: string): RiskPrediction | null {
  const { data } = useQuery({
    queryKey: ["risk-prediction", "visit", visitId],
    queryFn: () => fetchRiskPredictionForVisit(visitId),
    enabled: !!visitId,
  });
  return data ?? null;
}

export async function runAiPrediction(visitId: string): Promise<RiskPrediction> {
  const prediction = await runAiPredictionApi(visitId);
  queryClient.setQueryData(["risk-prediction", "visit", visitId], prediction);
  return prediction;
}
```

`useRiskPredictionForVisit` fetches the real persisted prediction via `GET /predictions/visits/:visitId` (added in Task 1 Step 5), so a prediction run in an earlier session is still visible later — not just cache-only within the current session. `runAiPrediction` still eagerly writes the fresh result into the same query key via `setQueryData` so the AI Review step updates instantly without waiting on a refetch.

- [ ] **Step 3: Verify**

```bash
cd /home/ebenezer/Projects/ubuntu/ubuntumed
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/patients/risk-prediction-api.ts src/lib/patients/use-patients.ts
git commit -m "feat: add frontend API layer for real AI risk predictions"
```

---

### Task 3: Frontend — widen pregnancy-history update path + build `ConsultationStep`

**Files:**
- Modify: `/home/ebenezer/Projects/ubuntu/ubuntumed/src/lib/patients/pregnancy-api.ts` (`PregnancyUpdatableFields` interface)
- Create: `/home/ebenezer/Projects/ubuntu/ubuntumed/src/components/patients/assessment/consultation-step.tsx`

**Interfaces:**
- Consumes: `PregnancyMedicalHistory` type (`src/lib/patients/types.ts`), `usePregnanciesForPatient` (already in `use-patients.ts`), `updatePregnancy(pregnancyId, updates)` (already in `use-patients.ts`).
- Produces: `ConsultationStep({ pregnancyId, onSaved }: { pregnancyId: string; onSaved: () => void })` — a step component with its own internal "Save & Continue" action (unlike the other pure-controlled wizard steps, this one persists immediately on submit since it edits a shared record, not visit-local state) — consumed by Task 6's wizard restructuring.

- [ ] **Step 1: Widen `PregnancyUpdatableFields`**

In `src/lib/patients/pregnancy-api.ts`, change:

```ts
export interface PregnancyUpdatableFields {
  partnerAccompanied?: boolean;
  gravidity?: number;
  parity?: number;
  termDeliveries?: number;
  prematureDeliveriesCount?: number;
  numberOfAbortions?: number;
  aliveChildren?: number;
  ageOfLastBornYears?: number;
  monthsOfLastBorn?: number;
}
```

to:

```ts
import type { PregnancyMedicalHistory } from "./types";

export interface PregnancyUpdatableFields extends PregnancyMedicalHistory {
  partnerAccompanied?: boolean;
  gravidity?: number;
  parity?: number;
  termDeliveries?: number;
  prematureDeliveriesCount?: number;
  numberOfAbortions?: number;
  aliveChildren?: number;
  ageOfLastBornYears?: number;
  monthsOfLastBorn?: number;
}
```

(Add the `import type { Pregnancy } from "./types"`-adjacent `PregnancyMedicalHistory` import at the top of the file if `Pregnancy`/other types aren't already imported from `"./types"` there — check the file's existing imports first and merge into the existing `import type { ... } from "./types"` line rather than adding a duplicate import statement.)

- [ ] **Step 2: Verify `updatePregnancyApi`'s PATCH body passes these through untouched**

Read `updatePregnancyApi` in the same file — it does `body: updates` directly (no field allow-list), so no further change is needed there; the wider type is sufficient.

- [ ] **Step 3: Build `ConsultationStep`**

```tsx
// src/components/patients/assessment/consultation-step.tsx
"use client";

import { useState } from "react";
import { usePregnanciesForPatient, updatePregnancy } from "@/lib/patients/use-patients";
import type { PregnancyMedicalHistory, ScreeningResult } from "@/lib/patients/types";

const HISTORY_CHECKBOX_FIELDS: { key: keyof PregnancyMedicalHistory; label: string }[] = [
  { key: "historySurgicalOrCervicalTrauma", label: "Surgical history or cervical trauma or cerclage" },
  { key: "historyGynecologicalProblem", label: "History of gynecological problem" },
  { key: "currentlyOnMedication", label: "Currently taking medicines" },
  { key: "historyDiabetes", label: "History of diabetes" },
  { key: "historyLungDisease", label: "Lung disease history" },
  { key: "historyHypertension", label: "History or current hypertension" },
  { key: "alcoholUse", label: "Alcohol use" },
  { key: "historyKidneyProblems", label: "History of kidney problems" },
  { key: "tobaccoUse", label: "Tobacco use" },
  { key: "historyHeartDisease", label: "History of heart disease" },
  { key: "historyPretermDelivery", label: "History of preterm delivery" },
  { key: "historyMacrosomia", label: "History of macrosomia (birth weight >= 4kg)" },
  { key: "historyCongenitalMalformation", label: "History of congenital fetal malformation" },
  { key: "historyMultiplePregnancy", label: "History of multiple pregnancy" },
  { key: "historyAntepartumBleeding", label: "History of antepartum or postpartum bleeding" },
  { key: "recurrentPregnancyLoss", label: "Recurrent pregnancy loss (3+ times)" },
  { key: "familyPlanningBeforePregnancy", label: "Used family planning before this pregnancy" },
  { key: "historyLowBirthWeightDelivery", label: "History of delivery with birth weight < 2.5kg" },
];

function HistoryCheckbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-zinc-300 text-teal-700 focus:ring-teal-600"
      />
      {label}
    </label>
  );
}

export function ConsultationStep({
  patientId,
  onSaved,
}: {
  patientId: string;
  onSaved: () => void;
}) {
  const pregnancies = usePregnanciesForPatient(patientId);
  const openPregnancy = pregnancies.find((p) => p.status === "open");

  const [history, setHistory] = useState<Partial<PregnancyMedicalHistory>>(() =>
    openPregnancy
      ? Object.fromEntries(HISTORY_CHECKBOX_FIELDS.map((f) => [f.key, !!openPregnancy[f.key]]))
      : {},
  );
  const [hivTestResult, setHivTestResult] = useState<ScreeningResult | "">(
    openPregnancy?.hivTestResult ?? "",
  );
  const [stiScreeningResult, setStiScreeningResult] = useState<ScreeningResult | "">(
    openPregnancy?.stiScreeningResult ?? "",
  );
  const [torchScreeningNotes, setTorchScreeningNotes] = useState(
    openPregnancy?.torchScreeningNotes ?? "",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(key: keyof PregnancyMedicalHistory) {
    setHistory((current) => ({ ...current, [key]: !current[key] }));
  }

  async function handleSave() {
    if (!openPregnancy) return;
    setError(null);
    setIsSaving(true);
    try {
      await updatePregnancy(openPregnancy.id, {
        ...history,
        hivTestResult: hivTestResult || undefined,
        stiScreeningResult: stiScreeningResult || undefined,
        torchScreeningNotes: torchScreeningNotes || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save consultation history");
    } finally {
      setIsSaving(false);
    }
  }

  if (!openPregnancy) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        This patient has no active pregnancy on record.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Consultation — General Information
      </p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Pre-filled from this patient&apos;s medical history. Confirm or update anything that has
        changed since the last visit — saving here updates the Medical History tab too.
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        {HISTORY_CHECKBOX_FIELDS.map((f) => (
          <HistoryCheckbox
            key={f.key}
            label={f.label}
            checked={!!history[f.key]}
            onChange={() => toggle(f.key)}
          />
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          HIV Test
          <select
            value={hivTestResult}
            onChange={(e) => setHivTestResult(e.target.value as ScreeningResult | "")}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
            <option value="">Not recorded</option>
            <option value="negative">Negative</option>
            <option value="positive">Positive</option>
            <option value="unknown">Unknown</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          STI Screening
          <select
            value={stiScreeningResult}
            onChange={(e) => setStiScreeningResult(e.target.value as ScreeningResult | "")}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
            <option value="">Not recorded</option>
            <option value="negative">Negative</option>
            <option value="positive">Positive</option>
            <option value="unknown">Unknown</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 sm:col-span-2">
          TORCH Screening Notes
          <input
            type="text"
            value={torchScreeningNotes}
            onChange={(e) => setTorchScreeningNotes(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </label>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={isSaving}
        onClick={handleSave}
        className="w-full rounded-xl bg-[#0f766e] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? "Saving…" : "Save & Continue"}
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Verify**

```bash
cd /home/ebenezer/Projects/ubuntu/ubuntumed
npx tsc --noEmit
```

Expected: no errors. If `PregnancyMedicalHistory` is missing any field referenced above, check `src/lib/patients/types.ts` (read earlier in this session) and adjust field names to match exactly.

- [ ] **Step 5: Commit**

```bash
git add src/lib/patients/pregnancy-api.ts src/components/patients/assessment/consultation-step.tsx
git commit -m "feat: add Consultation assessment step editing shared pregnancy history"
```

---

### Task 4: Frontend — extract `AiReviewStep` with real "Send to AI" action

**Files:**
- Create: `/home/ebenezer/Projects/ubuntu/ubuntumed/src/components/patients/assessment/ai-review-step.tsx`

**Interfaces:**
- Consumes: `useRiskPredictionForVisit`, `runAiPrediction` (Task 2), `computePrediction`/`AiPrediction` type only for the vitals/symptoms/labs *display* portions being carried over unchanged from `FinalizeAssessmentBlocker`'s existing `AssessmentSummaryStep` (NOT for the risk numbers anymore — those now come from the real prediction), `escalateVisitIfCritical` (existing).
- Produces: `AiReviewStep({ patient, visit, onConfirm }: { patient: Patient; visit: Visit; onConfirm: (prediction: RiskPrediction) => void })` — consumed by Task 6.

- [ ] **Step 1: Write the component**

This is `finalize-assessment-blocker.tsx`'s existing `AssessmentSummaryStep` (read in full earlier in this session), restructured so the AI panel requires an explicit click instead of running automatically via `computePrediction`, and using the real `RiskPrediction` once it exists:

```tsx
// src/components/patients/assessment/ai-review-step.tsx
"use client";

import { Fragment, useState } from "react";
import { IconActivity, IconAlert } from "@/components/dashboard/icons";
import type { Patient, Visit, LabTestResult, Referral } from "@/lib/patients/types";
import type { RiskPrediction } from "@/lib/patients/risk-prediction-api";
import { SYMPTOM_CHECKLIST } from "@/lib/patients/symptom-checklist";
import { runAiPrediction, useRiskPredictionForVisit, escalateVisitIfCritical } from "@/lib/patients/use-patients";
import { queryClient } from "@/lib/query-client";
import { LabResultCommentBox } from "@/components/patients/lab-result-comment-box";

function InterpretationBadge({ value }: { value: LabTestResult["interpretation"] }) {
  if (value === "Normal") {
    return (
      <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
        Normal
      </span>
    );
  }
  if (value === "Abnormal") {
    return (
      <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
        Abnormal
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-0.5 text-[10px] font-extrabold text-red-700 dark:bg-red-950/40 dark:text-red-400 animate-pulse">
      Critical
    </span>
  );
}

function RiskMeter({ pct, label }: { pct: number; label: string }) {
  const isRed = pct >= 75;
  const isAmber = pct >= 40 && pct < 75;
  const barColor = isRed ? "bg-red-600" : isAmber ? "bg-amber-500" : "bg-teal-600";
  const textColor = isRed
    ? "text-red-700 dark:text-red-400"
    : isAmber
      ? "text-amber-700 dark:text-amber-400"
      : "text-teal-700 dark:text-teal-400";
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between text-xs font-semibold">
        <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
        <span className={`font-mono font-bold ${textColor}`}>{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div className={`h-full rounded-full transition-all duration-300 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-zinc-100 py-1.5 text-sm dark:border-zinc-800">
      <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className="font-semibold text-zinc-950 dark:text-zinc-50">{value}</span>
    </div>
  );
}

const RISK_BANNER_CONFIG = {
  red: { bg: "bg-red-50 border-red-300 dark:bg-red-950/20 dark:border-red-900/60", text: "text-red-800 dark:text-red-300", badge: "bg-red-600 text-white", label: "RED CASE — OBSTETRIC EMERGENCY", icon: "🚨" },
  orange: { bg: "bg-orange-50 border-orange-300 dark:bg-orange-950/20 dark:border-orange-900/60", text: "text-orange-800 dark:text-orange-300", badge: "bg-orange-600 text-white", label: "ORANGE CASE — HIGH COMPLICATION RISK", icon: "⚠" },
  yellow: { bg: "bg-yellow-50 border-yellow-300 dark:bg-yellow-950/20 dark:border-yellow-900/60", text: "text-yellow-800 dark:text-yellow-300", badge: "bg-amber-500 text-white", label: "YELLOW CASE — ELEVATED RISK", icon: "⚡" },
  green: { bg: "bg-teal-50 border-teal-300 dark:bg-teal-950/20 dark:border-teal-900/60", text: "text-teal-800 dark:text-teal-300", badge: "bg-teal-600 text-white", label: "GREEN CASE — LOW CLINICAL RISK", icon: "✓" },
};

export function AiReviewStep({
  patient,
  visit,
  onConfirm,
}: {
  patient: Patient;
  visit: Visit;
  onConfirm: (prediction: RiskPrediction) => void;
}) {
  const labResults: LabTestResult[] = visit.labResults ?? [];
  const existingPrediction = useRiskPredictionForVisit(visit.id);
  const [prediction, setPrediction] = useState<RiskPrediction | null>(null);
  const shownPrediction = prediction ?? existingPrediction;
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [escalation, setEscalation] = useState<Referral | null>(null);

  async function handleSendToAi() {
    setError(null);
    setIsRunning(true);
    try {
      const result = await runAiPrediction(visit.id);
      setPrediction(result);
      if (result.predictedRiskLevel === "red") {
        const referral = await escalateVisitIfCritical(visit, "red");
        setEscalation(referral);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach AI prediction service. You may still proceed manually.");
    } finally {
      setIsRunning(false);
    }
  }

  const symptomLabels = visit.symptomIds
    .map((id) => SYMPTOM_CHECKLIST.find((s) => s.id === id)?.label ?? id)
    .filter(Boolean);

  const v = visit.labs;
  const config = shownPrediction ? RISK_BANNER_CONFIG[shownPrediction.predictedRiskLevel] : null;

  const getHbStyle = (val: number | undefined) => {
    if (val == null) return "text-zinc-950 dark:text-zinc-50";
    if (val < 7) return "text-red-600 font-bold dark:text-red-400";
    if (val < 11) return "text-amber-600 font-semibold dark:text-amber-400";
    return "text-zinc-950 dark:text-zinc-50";
  };

  return (
    <div className="flex flex-col gap-4">
      {config && (
        <div className={`flex items-center justify-between rounded-xl border p-4 shadow-sm ${config.bg} ${config.text}`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{config.icon}</span>
            <div className="text-sm">
              <span className="font-extrabold uppercase tracking-wide">{config.label}</span>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                For patient <strong className="font-bold text-zinc-800 dark:text-zinc-200">{patient.firstName} {patient.lastName}</strong>
              </p>
            </div>
          </div>
          <span className={`rounded-lg px-3 py-1.5 text-xs font-black uppercase tracking-wider ${config.badge}`}>
            {shownPrediction!.predictedRiskLevel} CASE
          </span>
        </div>
      )}

      {escalation && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-300 bg-red-50 p-4 text-red-800 shadow-sm dark:border-red-700 dark:bg-red-950/30 dark:text-red-300">
          <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="text-sm">
            <p className="text-xs font-bold uppercase tracking-wide">Emergency referral created</p>
            <p className="mt-1 text-xs opacity-90">
              An automatic referral to {escalation.receivingFacility} was created because the AI flagged this visit as red risk.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-5 items-stretch">
        <div className="lg:col-span-3 overflow-hidden rounded-xl border border-zinc-300 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900 flex flex-col">
          <div className="flex items-center gap-2 border-b border-zinc-300 bg-[#ffeedb] px-4 py-2.5 dark:border-zinc-700 dark:bg-orange-950/40">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-teal-700 dark:bg-zinc-900 dark:text-teal-400">
              <IconActivity className="h-4 w-4" />
            </span>
            <h3 className="font-bold text-sm text-zinc-950 dark:text-zinc-50">Clinical Assessment Summary</h3>
          </div>
          <div className="p-4 flex-1 flex flex-col gap-4 overflow-y-auto max-h-[50vh] scrollbar-thin">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1.5">
                Vitals &amp; Physical Indicators
              </p>
              {v ? (
                <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                  {v.bpSystolic != null && v.bpDiastolic != null && (
                    <Field label="Blood Pressure" value={`${v.bpSystolic}/${v.bpDiastolic} mmHg`} />
                  )}
                  {v.hemoglobin != null && (
                    <Field label="Hemoglobin (Hb)" value={<span className={getHbStyle(v.hemoglobin)}>{v.hemoglobin} g/dL</span>} />
                  )}
                  {v.bloodSugar != null && <Field label="Blood Glucose" value={`${v.bloodSugar} mmol/L`} />}
                  {v.temperature != null && <Field label="Temperature" value={`${v.temperature} °C`} />}
                  {v.pulse != null && <Field label="Pulse Rate" value={`${v.pulse} bpm`} />}
                  {v.weight != null && <Field label="Weight" value={`${v.weight} kg`} />}
                </div>
              ) : (
                <p className="text-xs text-zinc-400 italic">No vital parameters recorded.</p>
              )}
            </div>

            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-2">
                Signs &amp; Symptoms
              </p>
              {symptomLabels.length === 0 ? (
                <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">No symptoms checked by nurse.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {symptomLabels.map((lbl) => (
                    <span key={lbl} className="rounded bg-zinc-100 border border-zinc-200 px-2 py-0.5 text-[10px] font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      {lbl}
                    </span>
                  ))}
                </div>
              )}
              {visit.notes && (
                <div className="mt-2 bg-zinc-50 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800 dark:bg-zinc-950/20 text-xs italic text-zinc-600 dark:text-zinc-400">
                  <span className="font-bold not-italic block text-[10px] mb-0.5 text-zinc-700 dark:text-zinc-300">Nurse Notes:</span>
                  {visit.notes}
                </div>
              )}
            </div>

            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-2">
                Laboratory Test Results
              </p>
              {labResults.length === 0 ? (
                <p className="text-xs text-zinc-400 italic">No laboratory files are linked to this visit.</p>
              ) : (
                <div className="overflow-hidden border border-zinc-200 rounded-lg dark:border-zinc-800">
                  <table className="w-full text-left text-xs divide-y divide-zinc-200 dark:divide-zinc-800">
                    <thead className="bg-[#ffeedb] text-[9px] font-bold uppercase tracking-wider text-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-400">
                      <tr>
                        <th className="px-3 py-2">Test Name</th>
                        <th className="px-3 py-2">Result</th>
                        <th className="px-3 py-2">Unit</th>
                        <th className="px-3 py-2">Interpreter</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-900">
                      {labResults.map((r) => (
                        <Fragment key={r.id}>
                          <tr>
                            <td className="px-3 py-2 font-medium text-zinc-900 dark:text-zinc-50">{r.testName}</td>
                            <td className="px-3 py-2 font-mono">{r.result}</td>
                            <td className="px-3 py-2 text-zinc-500">{r.unit}</td>
                            <td className="px-3 py-2"><InterpretationBadge value={r.interpretation} /></td>
                          </tr>
                          <tr>
                            <td colSpan={4} className="px-3 pb-3">
                              <LabResultCommentBox
                                result={r}
                                onPosted={() => queryClient.invalidateQueries({ queryKey: ["visits", "pregnancy", visit.pregnancyId] })}
                              />
                            </td>
                          </tr>
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 overflow-hidden rounded-xl border border-zinc-300 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900 flex flex-col">
          <div className="flex items-center gap-2 border-b border-zinc-300 bg-[#ffeedb] px-4 py-2.5 dark:border-zinc-700 dark:bg-orange-950/40">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-teal-800 text-[10px] font-extrabold dark:bg-zinc-900 dark:text-teal-400">
              AI
            </span>
            <h3 className="font-bold text-sm text-zinc-950 dark:text-zinc-50">AI Diagnostic Intelligence</h3>
          </div>
          <div className="p-4 flex-1 flex flex-col gap-4 overflow-y-auto max-h-[50vh] scrollbar-thin">
            {!shownPrediction ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Run the AI model against this visit&apos;s vitals, symptoms, consultation history, and labs.
                </p>
                {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
                <button
                  type="button"
                  disabled={isRunning}
                  onClick={handleSendToAi}
                  className="rounded-xl bg-[#0f766e] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRunning ? "Sending…" : "Send to AI"}
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <RiskMeter pct={Math.round(shownPrediction.eclampsiaProb * 100)} label="Eclampsia" />
                  <RiskMeter pct={Math.round(shownPrediction.hemorrhageProb * 100)} label="Hemorrhage" />
                  <RiskMeter pct={Math.round(shownPrediction.maternalDeathProb * 100)} label="Maternal Death" />
                  <RiskMeter pct={Math.round(shownPrediction.emergencyReferralProb * 100)} label="Emergency Referral" />
                </div>
                <div className="rounded-lg border border-teal-200 bg-teal-50/40 p-3 dark:border-teal-900/25 dark:bg-teal-950/25 mt-auto">
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-teal-700 dark:text-teal-400 block mb-1">
                    AI Recommendation
                  </span>
                  <p className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300 font-medium">
                    {shownPrediction.recommendation}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        disabled={!shownPrediction}
        onClick={() => shownPrediction && onConfirm(shownPrediction)}
        className="w-full rounded-xl bg-[#0f766e] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Continue to Final Diagnosis →
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

```bash
cd /home/ebenezer/Projects/ubuntu/ubuntumed
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/patients/assessment/ai-review-step.tsx
git commit -m "feat: add AI Review assessment step with explicit Send to AI action"
```

---

### Task 5: Frontend — wizard wrapper steps for Final Diagnosis, Treatment, Consumables, Vaccination

**Files:**
- Create: `/home/ebenezer/Projects/ubuntu/ubuntumed/src/components/patients/assessment/final-diagnosis-step.tsx`
- Create: `/home/ebenezer/Projects/ubuntu/ubuntumed/src/components/patients/assessment/treatment-step.tsx`
- Create: `/home/ebenezer/Projects/ubuntu/ubuntumed/src/components/patients/assessment/consumables-step.tsx`
- Create: `/home/ebenezer/Projects/ubuntu/ubuntumed/src/components/patients/assessment/vaccination-step.tsx`

**Interfaces:**
- Consumes: `useDiagnosesForVisit`/`createDiagnosis`, `usePrescriptionsForVisit`/`createPrescription`, `useConsumablesForVisit`/`createConsumableUsage`, `useVaccinationsForPregnancy`/`recordVaccination`, `useInventory` (all already in `use-patients.ts`, exact signatures read earlier this session).
- Produces: four step components, each `({ visitId or pregnancyId, onContinue }: { ...; onContinue: () => void })` — consumed by Task 6.

- [ ] **Step 1: `final-diagnosis-step.tsx`**

Wraps the existing diagnosis-creation form from `visit-diagnosis-section.tsx` (read earlier), adding a "Continue" button since this is now a wizard step, not an always-visible inline section:

```tsx
// src/components/patients/assessment/final-diagnosis-step.tsx
"use client";

import { useState } from "react";
import { useDiagnosesForVisit, createDiagnosis } from "@/lib/patients/use-patients";

export function FinalDiagnosisStep({ visitId, onContinue }: { visitId: string; onContinue: () => void }) {
  const diagnoses = useDiagnosesForVisit(visitId);
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [diagnosisType, setDiagnosisType] = useState("Principal");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    setError(null);
    setIsSubmitting(true);
    try {
      await createDiagnosis({ visitId, code, title, diagnosisType });
      setCode("");
      setTitle("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save diagnosis");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Final Diagnosis
      </p>

      {diagnoses.length === 0 ? (
        <p className="text-sm text-zinc-400">No diagnosis recorded yet.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {diagnoses.map((d) => (
            <span key={d.id} title={d.caseStatus} className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800 dark:bg-teal-950/30 dark:text-teal-400">
              {d.code} — {d.title}
              {d.diagnosisType === "Principal" ? "" : ` (${d.diagnosisType})`}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
        {error && <p className="w-full text-xs text-red-600 dark:text-red-400">{error}</p>}
        <input
          type="text"
          placeholder="ICD-11 code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-28 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
        <input
          type="text"
          placeholder="Diagnosis title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="min-w-40 flex-1 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
        <select
          value={diagnosisType}
          onChange={(e) => setDiagnosisType(e.target.value)}
          className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="Principal">Principal</option>
          <option value="Secondary">Secondary</option>
        </select>
        <button
          type="button"
          disabled={isSubmitting || !code || !title}
          onClick={handleAdd}
          className="rounded-lg bg-[#0f766e] px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Saving…" : "Add"}
        </button>
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="w-full rounded-xl bg-[#0f766e] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-800"
      >
        Continue to Treatment →
      </button>
    </div>
  );
}
```

- [ ] **Step 2: `treatment-step.tsx`**

Wraps the existing `PrescriptionForm` logic from `visit-pharmacy-section.tsx` (prescriptions only — consumables move to their own step):

```tsx
// src/components/patients/assessment/treatment-step.tsx
"use client";

import { useState } from "react";
import { usePrescriptionsForVisit, createPrescription, useInventory } from "@/lib/patients/use-patients";

export function TreatmentStep({ visitId, onContinue }: { visitId: string; onContinue: () => void }) {
  const prescriptions = usePrescriptionsForVisit(visitId);
  const inventory = useInventory();
  const drugCatalog = inventory.filter((i) => i.category === "drug");
  const [inventoryItemId, setInventoryItemId] = useState("");
  const [drugName, setDrugName] = useState("");
  const [frequency, setFrequency] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [quantity, setQuantity] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    setError(null);
    setIsSubmitting(true);
    try {
      const selected = drugCatalog.find((d) => d.id === inventoryItemId);
      await createPrescription({
        visitId,
        inventoryItemId: inventoryItemId || undefined,
        drugName: selected?.name ?? drugName,
        frequency: frequency || undefined,
        durationDays: durationDays ? Number(durationDays) : undefined,
        quantity: quantity ? Number(quantity) : undefined,
      });
      setDrugName("");
      setFrequency("");
      setDurationDays("");
      setQuantity("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save prescription");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Treatment — Prescriptions
      </p>

      {prescriptions.length === 0 ? (
        <p className="text-sm text-zinc-400">No medications recorded yet.</p>
      ) : (
        <ul className="flex flex-col gap-1 text-sm">
          {prescriptions.map((p) => (
            <li key={p.id}>
              {p.drugName}
              {p.frequency ? ` — ${p.frequency}` : ""}
              {p.durationDays ? ` for ${p.durationDays} days` : ""}
              {p.quantity ? ` (qty ${p.quantity})` : ""}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <select
            value={inventoryItemId}
            onChange={(e) => { setInventoryItemId(e.target.value); setDrugName(""); }}
            className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
            <option value="">Not in catalog…</option>
            {drugCatalog.map((d) => (
              <option key={d.id} value={d.id}>{d.name} ({d.quantityOnHand} {d.unit} in stock)</option>
            ))}
          </select>
          {!inventoryItemId && (
            <input type="text" placeholder="Drug name" value={drugName} onChange={(e) => setDrugName(e.target.value)} className="min-w-32 flex-1 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50" />
          )}
          <input type="text" placeholder="Frequency" value={frequency} onChange={(e) => setFrequency(e.target.value)} className="w-28 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50" />
          <input type="number" min={1} placeholder="Days" value={durationDays} onChange={(e) => setDurationDays(e.target.value)} className="w-20 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50" />
          <input type="number" min={1} placeholder="Qty" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-20 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50" />
          <button
            type="button"
            disabled={isSubmitting || (!inventoryItemId && !drugName)}
            onClick={handleAdd}
            className="rounded-lg bg-[#0f766e] px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Saving…" : "Add"}
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="w-full rounded-xl bg-[#0f766e] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-800"
      >
        Continue to Consumables →
      </button>
    </div>
  );
}
```

- [ ] **Step 3: `consumables-step.tsx`**

Same pattern, wrapping `ConsumableForm` from `visit-pharmacy-section.tsx`:

```tsx
// src/components/patients/assessment/consumables-step.tsx
"use client";

import { useState } from "react";
import { useConsumablesForVisit, createConsumableUsage, useInventory } from "@/lib/patients/use-patients";

export function ConsumablesStep({ visitId, onContinue }: { visitId: string; onContinue: () => void }) {
  const consumables = useConsumablesForVisit(visitId);
  const inventory = useInventory();
  const consumableCatalog = inventory.filter((i) => i.category === "consumable");
  const [inventoryItemId, setInventoryItemId] = useState("");
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    setError(null);
    setIsSubmitting(true);
    try {
      const selected = consumableCatalog.find((c) => c.id === inventoryItemId);
      await createConsumableUsage({
        visitId,
        inventoryItemId: inventoryItemId || undefined,
        itemName: selected?.name ?? itemName,
        quantity: Number(quantity),
      });
      setItemName("");
      setQuantity("1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save consumable usage");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Consumables Used
      </p>

      {consumables.length === 0 ? (
        <p className="text-sm text-zinc-400">No consumables recorded yet.</p>
      ) : (
        <ul className="flex flex-col gap-1 text-sm">
          {consumables.map((c) => (
            <li key={c.id}>{c.itemName} — qty {c.quantity}{c.unit ? ` ${c.unit}` : ""}</li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <select
            value={inventoryItemId}
            onChange={(e) => { setInventoryItemId(e.target.value); setItemName(""); }}
            className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
            <option value="">Not in catalog…</option>
            {consumableCatalog.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.quantityOnHand} {c.unit} in stock)</option>
            ))}
          </select>
          {!inventoryItemId && (
            <input type="text" placeholder="Item name" value={itemName} onChange={(e) => setItemName(e.target.value)} className="min-w-28 flex-1 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50" />
          )}
          <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-20 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50" />
          <button
            type="button"
            disabled={isSubmitting || (!inventoryItemId && !itemName)}
            onClick={handleAdd}
            className="rounded-lg bg-[#0f766e] px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Saving…" : "Add"}
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="w-full rounded-xl bg-[#0f766e] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-800"
      >
        Continue to Followup →
      </button>
    </div>
  );
}
```

- [ ] **Step 4: `vaccination-step.tsx`**

Wraps `VaccinationCard`'s existing form (which is already pregnancy-scoped, not visit-scoped — reuse the component directly rather than re-implementing its form):

```tsx
// src/components/patients/assessment/vaccination-step.tsx
"use client";

import { VaccinationCard } from "@/components/patients/pregnancy/vaccination-card";

export function VaccinationStep({ pregnancyId, onContinue }: { pregnancyId: string; onContinue: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Vaccination
      </p>
      <VaccinationCard pregnancyId={pregnancyId} />
      <button
        type="button"
        onClick={onContinue}
        className="w-full rounded-xl bg-[#0f766e] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-800"
      >
        Continue to Discharge →
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Verify**

```bash
cd /home/ebenezer/Projects/ubuntu/ubuntumed
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/patients/assessment/final-diagnosis-step.tsx src/components/patients/assessment/treatment-step.tsx src/components/patients/assessment/consumables-step.tsx src/components/patients/assessment/vaccination-step.tsx
git commit -m "feat: add Final Diagnosis, Treatment, Consumables, Vaccination assessment steps"
```

---

### Task 6: Frontend — restructure `AssessmentWizard`, trim `SummaryStep`, rewrite `FinalizeAssessmentBlocker` as the Followup/Discharge step

**Files:**
- Modify: `/home/ebenezer/Projects/ubuntu/ubuntumed/src/components/patients/assessment-wizard.tsx`
- Modify: `/home/ebenezer/Projects/ubuntu/ubuntumed/src/components/patients/assessment/summary-step.tsx`
- Modify: `/home/ebenezer/Projects/ubuntu/ubuntumed/src/components/patients/finalize-assessment-blocker.tsx`

**Interfaces:**
- Consumes: `ConsultationStep` (Task 3), `AiReviewStep` (Task 4), `FinalDiagnosisStep`/`TreatmentStep`/`ConsumablesStep`/`VaccinationStep` (Task 5), `RiskPrediction` type (Task 2).
- Produces: `AssessmentWizard` now carries the no-labs path all the way through Discharge in one sitting; `FinalizeAssessmentBlocker` (used for the labs-ordered path, still triggered from `page.tsx` once labs complete) now runs the same Final-Diagnosis → Treatment → Consumables → Followup/Discharge → Vaccination sequence instead of jumping straight from AI review to a single Treatment&Action-Plan form. Both paths converge on the same step components so there is exactly one implementation of each step.

- [ ] **Step 1: Trim `SummaryStep`**

Remove the `treatment`/`followUpPlan` state, fields, and payload fields entirely — this step becomes notes-only review + submit. In `src/components/patients/assessment/summary-step.tsx`:

Remove lines for `const [treatment, setTreatment] = useState("");` and `const [followUpPlan, setFollowUpPlan] = useState("");`.

Change the `recordVisit` call to drop `treatment`/`followUpPlan`:

```ts
const visit = await recordVisit({
  pregnancyId,
  type,
  scheduledWeek,
  ancNumber,
  symptomIds: symptoms,
  notes,
  labs: hasVisitLabs ? visitLabs : undefined,
  labStatus: labsOrdered ? "pending" : undefined,
});
```

Remove the entire `{!labsOrdered && (...)}` JSX block that rendered the "Treatment provided" and "Follow-up plan" inputs (both fields move to the new Followup/Discharge step inside `FinalizeAssessmentBlocker`).

Change the submit button label — it's always going to AI Review next now, never truly "done" from this step:

```tsx
<button
  type="submit"
  disabled={isSubmitting}
  className="w-full rounded-xl bg-[#0f766e] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
>
  {isSubmitting ? "Submitting…" : labsOrdered ? "Submit Request to Laboratory" : "Continue to AI Review"}
</button>
```

- [ ] **Step 2: Rewrite `FinalizeAssessmentBlocker` to run the full downstream pipeline**

Replace the whole file. This keeps the exact same external contract (`{ patient, visit, onFinalized }`) that `page.tsx` already calls, but internally now sequences AI Review → Final Diagnosis → Treatment → Consumables → Followup/Discharge → Vaccination (vaccination last, since it's pregnancy-scoped and not required before finalizing):

```tsx
// src/components/patients/finalize-assessment-blocker.tsx
"use client";

import { useState } from "react";
import type { Patient, Visit } from "@/lib/patients/types";
import type { RiskPrediction } from "@/lib/patients/risk-prediction-api";
import { AiReviewStep } from "@/components/patients/assessment/ai-review-step";
import { FinalDiagnosisStep } from "@/components/patients/assessment/final-diagnosis-step";
import { TreatmentStep } from "@/components/patients/assessment/treatment-step";
import { ConsumablesStep } from "@/components/patients/assessment/consumables-step";
import { VaccinationStep } from "@/components/patients/assessment/vaccination-step";

const STEPS = [
  "AI Review",
  "Final Diagnosis",
  "Treatment",
  "Consumables",
  "Followup",
  "Vaccination",
] as const;
type Step = (typeof STEPS)[number];

function FollowupDischargeStep({
  visit,
  recommendation,
  onFinalized,
}: {
  visit: Visit;
  recommendation: string;
  onFinalized: (visitId: string, treatment: string, followUpPlan: string) => Promise<void>;
}) {
  const [treatment, setTreatment] = useState("");
  const [followUpPlan, setFollowUpPlan] = useState(recommendation);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await onFinalized(visit.id, treatment.trim(), followUpPlan.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to finalize assessment. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Followup &amp; Discharge
      </p>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Treatment Summary
        <textarea
          rows={3}
          required
          value={treatment}
          onChange={(e) => setTreatment(e.target.value)}
          placeholder="e.g. Prescribed oral iron supplements, scheduled urgent blood transfusion transfer…"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Follow-up Plan
        <span className="text-xs font-normal text-zinc-400 dark:text-zinc-500">
          Pre-filled from the AI recommendation — edit as needed.
        </span>
        <textarea
          rows={3}
          required
          value={followUpPlan}
          onChange={(e) => setFollowUpPlan(e.target.value)}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </label>
      {error && (
        <p className="rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-[#0f766e] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Finalizing…" : "Continue to Vaccination →"}
      </button>
    </form>
  );
}

export function FinalizeAssessmentBlocker({
  patient,
  visit,
  onFinalized,
}: {
  patient: Patient;
  visit: Visit;
  onFinalized: (visitId: string, treatment: string, followUpPlan: string) => Promise<void>;
}) {
  const [step, setStep] = useState<Step>("AI Review");
  const [prediction, setPrediction] = useState<RiskPrediction | null>(null);
  const [finalized, setFinalized] = useState(false);

  const stepIndex = STEPS.indexOf(step);

  return (
    <div className="flex flex-col gap-4">
      <div className="scrollbar-hidden flex w-fit gap-1 overflow-x-auto rounded-full border border-zinc-300 bg-[#ffeedb] p-1 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
        {STEPS.map((s, i) => (
          <span
            key={s}
            className={`rounded-full px-4 py-1.5 text-xs font-medium ${
              i === stepIndex
                ? "bg-[#0f766e] text-white shadow-sm"
                : i < stepIndex
                  ? "text-zinc-600 dark:text-zinc-300"
                  : "text-zinc-400 dark:text-zinc-600"
            }`}
          >
            {i + 1}. {s}
          </span>
        ))}
      </div>

      {step === "AI Review" && (
        <AiReviewStep
          patient={patient}
          visit={visit}
          onConfirm={(pred) => {
            setPrediction(pred);
            setStep("Final Diagnosis");
          }}
        />
      )}
      {step === "Final Diagnosis" && (
        <FinalDiagnosisStep visitId={visit.id} onContinue={() => setStep("Treatment")} />
      )}
      {step === "Treatment" && (
        <TreatmentStep visitId={visit.id} onContinue={() => setStep("Consumables")} />
      )}
      {step === "Consumables" && (
        <ConsumablesStep visitId={visit.id} onContinue={() => setStep("Followup")} />
      )}
      {step === "Followup" && !finalized && (
        <FollowupDischargeStep
          visit={visit}
          recommendation={prediction?.recommendation ?? ""}
          onFinalized={async (visitId, treatment, followUpPlan) => {
            await onFinalized(visitId, treatment, followUpPlan);
            setFinalized(true);
            setStep("Vaccination");
          }}
        />
      )}
      {step === "Vaccination" && (
        <VaccinationStep pregnancyId={visit.pregnancyId} onContinue={() => { /* no-op: last step, unlocked already */ }} />
      )}
    </div>
  );
}
```

Note: `onFinalized` (the existing `finalizeAssessment` call from `page.tsx`) still runs at the "Followup" step, same as today — that's what sets `assessmentFinalized: true` and unlocks the patient profile. Vaccination stays reachable as the true last step but doesn't block unlocking, since it's optional per visit.

- [ ] **Step 3: Restructure `AssessmentWizard` to carry the no-labs path through the same downstream pipeline**

In `src/components/patients/assessment-wizard.tsx`, insert `ConsultationStep` after Symptoms and before Labs, and route the wizard's own completion (`savedVisit` set) into `FinalizeAssessmentBlocker` instead of showing the current "Assessment Result" screen directly — this makes the no-labs path go through AI Review → … → Discharge in the same sitting, matching the labs-ordered path's post-unlock experience:

```tsx
"use client";

import { useState } from "react";
import {
  VitalSignsStep,
  emptyVitalSigns,
  isVitalSignsComplete,
  type VitalSigns,
} from "@/components/patients/assessment/vital-signs-step";
import { SymptomsStep } from "@/components/patients/assessment/symptoms-step";
import { ConsultationStep } from "@/components/patients/assessment/consultation-step";
import { LabsStep } from "@/components/patients/assessment/labs-step";
import { SummaryStep } from "@/components/patients/assessment/summary-step";
import { FinalizeAssessmentBlocker } from "@/components/patients/finalize-assessment-blocker";
import { finalizeAssessment } from "@/lib/patients/use-patients";
import type { Patient, Visit } from "@/lib/patients/types";

const STEPS = [
  { number: 1, label: "Vitals" },
  { number: 2, label: "Symptoms" },
  { number: 3, label: "Consultation" },
  { number: 4, label: "Labs" },
  { number: 5, label: "Summary" },
] as const;

type StepNumber = (typeof STEPS)[number]["number"];

export function AssessmentWizard({
  patient,
  patientId,
  pregnancyId,
  type,
  scheduledWeek,
  ancNumber,
  onSubmitted,
}: {
  patient: Patient;
  patientId: string;
  pregnancyId: string;
  type: "scheduled" | "unscheduled";
  scheduledWeek?: number;
  ancNumber?: number;
  onSubmitted?: () => void;
}) {
  const [currentStep, setCurrentStep] = useState<StepNumber>(1);
  const [maxReachedStep, setMaxReachedStep] = useState<StepNumber>(1);
  const [vitals, setVitals] = useState<VitalSigns>(emptyVitalSigns());
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [labsOrdered, setLabsOrdered] = useState(false);
  const [savedVisit, setSavedVisit] = useState<Visit | null>(null);

  const canAdvance = currentStep === 1 ? isVitalSignsComplete(vitals) : true;

  function handleVitalsChange(field: keyof VitalSigns, value: string) {
    setVitals((current) => ({ ...current, [field]: value }));
  }

  function goToStep(step: StepNumber) {
    if (step > maxReachedStep) return;
    setCurrentStep(step);
  }

  function goNext() {
    if (!canAdvance) return;
    setCurrentStep((step) => {
      const next = step < 5 ? ((step + 1) as StepNumber) : step;
      setMaxReachedStep((reached) => (next > reached ? next : reached));
      return next;
    });
  }

  function goBack() {
    setCurrentStep((step) => (step > 1 ? ((step - 1) as StepNumber) : step));
  }

  function reset() {
    setCurrentStep(1);
    setMaxReachedStep(1);
    setVitals(emptyVitalSigns());
    setSymptoms([]);
    setLabsOrdered(false);
    setSavedVisit(null);
  }

  // A visit that didn't need labs is unlocked for the full Final
  // Diagnosis → … → Discharge pipeline immediately. A visit that needs
  // labs exits the wizard here — page.tsx shows AwaitingLabsBlocker, then
  // FinalizeAssessmentBlocker once labs land (same component, reused).
  if (savedVisit && !labsOrdered) {
    return (
      <FinalizeAssessmentBlocker
        patient={patient}
        visit={savedVisit}
        onFinalized={finalizeAssessment}
      />
    );
  }

  if (savedVisit && labsOrdered) {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Sent to the laboratory nurse.
        </p>
        <p className="max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
          This visit will continue automatically once lab results are submitted.
        </p>
        <button
          type="button"
          onClick={() => { reset(); onSubmitted?.(); }}
          className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Back to Patient
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="scrollbar-hidden flex w-fit gap-1 overflow-x-auto rounded-full border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
        {STEPS.map((step) => {
          const reachable = step.number <= maxReachedStep;
          return (
            <button
              key={step.number}
              type="button"
              onClick={() => goToStep(step.number)}
              disabled={!reachable}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${
                currentStep === step.number
                  ? "bg-[#0f766e] text-white shadow-sm shadow-teal-700/20"
                  : reachable
                    ? "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    : "text-zinc-400 dark:text-zinc-600"
              }`}
            >
              {step.number}. {step.label}
            </button>
          );
        })}
      </div>

      {currentStep === 1 && (
        <VitalSignsStep values={vitals} onChange={handleVitalsChange} />
      )}
      {currentStep === 2 && (
        <SymptomsStep selectedIds={symptoms} onChange={setSymptoms} />
      )}
      {currentStep === 3 && (
        <ConsultationStep patientId={patientId} onSaved={goNext} />
      )}
      {currentStep === 4 && (
        <LabsStep labsOrdered={labsOrdered} onChange={setLabsOrdered} />
      )}
      {currentStep === 5 && (
        <SummaryStep
          vitals={vitals}
          symptoms={symptoms}
          labsOrdered={labsOrdered}
          pregnancyId={pregnancyId}
          type={type}
          scheduledWeek={scheduledWeek}
          ancNumber={ancNumber}
          onRecorded={setSavedVisit}
        />
      )}

      {currentStep !== 3 && currentStep !== 5 && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={goBack}
            disabled={currentStep === 1}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300"
          >
            Back
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={!canAdvance}
            className="rounded-lg bg-[#0f766e] px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
```

Note: `currentStep !== 3` excludes the Consultation step from the shared Back/Next footer since `ConsultationStep` has its own "Save & Continue" button that calls `goNext` directly (it needs to persist to the backend before advancing, unlike the other pure-client-state steps).

- [ ] **Step 4: Update the caller in `page.tsx`**

`page.tsx`'s `AssessmentWizard` invocation (around line 356, read earlier this session) currently passes `pregnancyId`, `type`, `scheduledWeek`, `ancNumber`, `onSubmitted`. Add `patient={patient}` and `patientId={patient.id}`:

```tsx
<AssessmentWizard
  patient={patient}
  patientId={patient.id}
  pregnancyId={openPregnancy.id}
  type={assessmentContext.type}
  scheduledWeek={assessmentContext.scheduledWeek}
  ancNumber={assessmentContext.ancNumber}
  onSubmitted={() => setAssessmentContext(null)}
/>
```

- [ ] **Step 5: Verify**

```bash
cd /home/ebenezer/Projects/ubuntu/ubuntumed
npx tsc --noEmit
pnpm lint
pnpm build
```

Expected: all three pass clean.

- [ ] **Step 6: Manual flow check (no test suite — this is the closest thing to an integration test)**

Start the dev server if not already running, log in as a nurse, open a patient with an open pregnancy, start "New Assessment," and walk through: Vitals → Symptoms → Consultation (verify it pre-fills from Medical History and saving updates that tab) → Labs → choose "No lab tests needed" → Summary → confirm it lands on AI Review → click "Send to AI" → confirm risk badge + recommendation appear → Continue through Final Diagnosis → Treatment → Consumables → Followup (submit) → Vaccination. Confirm the patient profile unlocks after the Followup step submits (same unlock behavior as before this change).

- [ ] **Step 7: Commit**

```bash
git add src/components/patients/assessment-wizard.tsx src/components/patients/assessment/summary-step.tsx src/components/patients/finalize-assessment-blocker.tsx src/app/dashboard/nurse/patients/\[id\]/page.tsx
git commit -m "feat: restructure assessment wizard into full consultation-to-discharge pipeline"
```

---

### Task 7: Frontend — make Visit History's Diagnosis/Pharmacy sections read-only

**Files:**
- Modify: `/home/ebenezer/Projects/ubuntu/ubuntumed/src/components/patients/visit-diagnosis-section.tsx`
- Modify: `/home/ebenezer/Projects/ubuntu/ubuntumed/src/components/patients/visit-pharmacy-section.tsx`

**Interfaces:**
- Consumes: `useDiagnosesForVisit`, `usePrescriptionsForVisit`, `useConsumablesForVisit` (unchanged reads).
- Produces: same two component names/props (`VisitDiagnosisSection({ visitId, readOnly })`, `VisitPharmacySection({ visitId, readOnly })`) so `visit-history-tab.tsx`'s existing call sites need no changes — only their internals lose the "add" forms.

- [ ] **Step 1: Strip the add-form from `VisitDiagnosisSection`**

Replace the whole file with a read-only version — same display, no form, no `readOnly` branching needed internally (though the prop stays in the signature so callers don't need to change):

```tsx
// src/components/patients/visit-diagnosis-section.tsx
"use client";

import { useDiagnosesForVisit } from "@/lib/patients/use-patients";

export function VisitDiagnosisSection({
  visitId,
}: {
  visitId: string;
  readOnly?: boolean;
}) {
  const diagnoses = useDiagnosesForVisit(visitId);

  return (
    <div>
      <span className="font-medium text-zinc-400">Diagnosis: </span>
      {diagnoses.length === 0 ? (
        <span className="text-zinc-400">None recorded</span>
      ) : (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {diagnoses.map((d) => (
            <span
              key={d.id}
              title={d.caseStatus}
              className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800 dark:bg-teal-950/30 dark:text-teal-400"
            >
              {d.code} — {d.title}
              {d.diagnosisType === "Principal" ? "" : ` (${d.diagnosisType})`}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
```

Diagnosis, treatment, and consumables are now recorded during the assessment (Final Diagnosis / Treatment / Consumables wizard steps) — this view is read-only.

- [ ] **Step 2: Strip the add-forms from `VisitPharmacySection`**

```tsx
// src/components/patients/visit-pharmacy-section.tsx
"use client";

import { usePrescriptionsForVisit, useConsumablesForVisit } from "@/lib/patients/use-patients";

export function VisitPharmacySection({
  visitId,
}: {
  visitId: string;
  readOnly?: boolean;
}) {
  const prescriptions = usePrescriptionsForVisit(visitId);
  const consumables = useConsumablesForVisit(visitId);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <span className="font-medium text-zinc-400">Medications: </span>
        {prescriptions.length === 0 ? (
          <span className="text-zinc-400">None recorded</span>
        ) : (
          <ul className="mt-1 flex flex-col gap-0.5">
            {prescriptions.map((p) => (
              <li key={p.id}>
                {p.drugName}
                {p.frequency ? ` — ${p.frequency}` : ""}
                {p.durationDays ? ` for ${p.durationDays} days` : ""}
                {p.quantity ? ` (qty ${p.quantity})` : ""}
                {p.forPartner ? " · Partner" : ""}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <span className="font-medium text-zinc-400">Consumables: </span>
        {consumables.length === 0 ? (
          <span className="text-zinc-400">None recorded</span>
        ) : (
          <ul className="mt-1 flex flex-col gap-0.5">
            {consumables.map((c) => (
              <li key={c.id}>
                {c.itemName} — qty {c.quantity}
                {c.unit ? ` ${c.unit}` : ""}
                {c.forPartner ? " · Partner" : ""}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify**

```bash
cd /home/ebenezer/Projects/ubuntu/ubuntumed
npx tsc --noEmit
pnpm lint
pnpm build
```

Expected: all clean. `readOnly` prop is now unused inside both components (kept only so call sites in `visit-history-tab.tsx` don't need edits) — this is intentional and not a lint violation since it's a destructured-but-declared TypeScript prop type, not an unused variable.

- [ ] **Step 4: Commit**

```bash
git add src/components/patients/visit-diagnosis-section.tsx src/components/patients/visit-pharmacy-section.tsx
git commit -m "refactor: make Visit History diagnosis/pharmacy sections read-only"
```

---

### Task 8: Frontend — show the AI prediction and consultation snapshot in Visit History's expanded row

**Files:**
- Modify: `/home/ebenezer/Projects/ubuntu/ubuntumed/src/components/patients/visit-history-tab.tsx`

**Interfaces:**
- Consumes: `useRiskPredictionForVisit(visitId)` (Task 2), `VisitDiagnosisSection`/`VisitPharmacySection` (Task 7, already rendered here per the existing expanded-row layout), `usePregnanciesForPatient`/pregnancy history fields (already available wherever this tab has `pregnancy` in scope).

- [ ] **Step 1: Read the current expanded-row layout**

```bash
grep -n "VisitDiagnosisSection\|VisitPharmacySection\|treatment\|followUpPlan" /home/ebenezer/Projects/ubuntu/ubuntumed/src/components/patients/visit-history-tab.tsx
```

Locate exactly where the expanded row currently renders `VisitDiagnosisSection` and `VisitPharmacySection` (Task 7 kept their prop signatures identical, so these call sites don't need to change) and where/whether `visit.treatment` and `visit.followUpPlan` are already displayed (per the spec, this must already be true — item #8 "Follow-up plan" and #10 "Discharge/finalization notes" as `visit.treatment`/`visit.followUpPlan` are the same fields the earlier 2026-06-30 assessment-wizard spec already wired into this tab's history view). Confirm this before writing new code, so nothing already covered gets duplicated.

- [ ] **Step 2: Add an AI Prediction sub-section**

Immediately before or after the existing `VisitDiagnosisSection` call inside the expanded row, add:

```tsx
function VisitAiPredictionSection({ visitId }: { visitId: string }) {
  const prediction = useRiskPredictionForVisit(visitId);
  if (!prediction) {
    return (
      <div>
        <span className="font-medium text-zinc-400">AI Assessment: </span>
        <span className="text-zinc-400">Not run for this visit</span>
      </div>
    );
  }
  return (
    <div>
      <span className="font-medium text-zinc-400">AI Assessment: </span>
      <span className="font-semibold uppercase text-zinc-700 dark:text-zinc-300">
        {prediction.predictedRiskLevel}
      </span>
      <p className="mt-1 text-zinc-600 dark:text-zinc-400">{prediction.recommendation}</p>
    </div>
  );
}
```

Add the import (`useRiskPredictionForVisit` from `@/lib/patients/use-patients`) and render `<VisitAiPredictionSection visitId={visit.id} />` in the expanded row, in pipeline order — after the lab results block and before `VisitDiagnosisSection`, matching the spec's ordering (vitals/symptoms → consultation → labs → AI → diagnosis → treatment → consumables → followup → vaccination → discharge).

- [ ] **Step 3: Add a Consultation-history sub-section**

Add (in the same file, near the other sub-sections):

```tsx
function VisitConsultationSection({ pregnancy }: { pregnancy: Pregnancy }) {
  const notedHistory = ([
    ["Surgical/cervical trauma", pregnancy.historySurgicalOrCervicalTrauma],
    ["Diabetes", pregnancy.historyDiabetes],
    ["Hypertension", pregnancy.historyHypertension],
    ["Heart disease", pregnancy.historyHeartDisease],
    ["Kidney problems", pregnancy.historyKidneyProblems],
  ] as const).filter(([, value]) => value).map(([label]) => label);

  return (
    <div>
      <span className="font-medium text-zinc-400">Consultation history: </span>
      {notedHistory.length === 0 ? (
        <span className="text-zinc-400">No notable history flagged</span>
      ) : (
        <span className="text-zinc-700 dark:text-zinc-300">{notedHistory.join(", ")}</span>
      )}
      {pregnancy.hivTestResult && (
        <span className="ml-2 text-zinc-700 dark:text-zinc-300">· HIV: {pregnancy.hivTestResult}</span>
      )}
    </div>
  );
}
```

Render `<VisitConsultationSection pregnancy={pregnancy} />` before the lab results block in the expanded row (`pregnancy` must already be in scope in this file — it's how `VaccinationCard`/other pregnancy-scoped pieces get their `pregnancyId` today; if only `pregnancyId` is in scope at this call site, use `usePregnanciesForPatient` or whatever hook this file already uses to resolve the full `Pregnancy` object, matching its existing pattern). Per the spec's documented caveat, this shows the pregnancy's **current** history values, not a frozen snapshot from that exact visit date — the sub-section's label should stay "Consultation history" (not "Consultation history at this visit") to avoid implying point-in-time accuracy it doesn't have.

- [ ] **Step 4: Verify**

```bash
cd /home/ebenezer/Projects/ubuntu/ubuntumed
npx tsc --noEmit
pnpm lint
pnpm build
```

Expected: all clean.

- [ ] **Step 5: Manual check**

Open Visit History for a patient with at least one visit that has gone through the new pipeline (from Task 6's manual flow check) — confirm the expanded row now shows, in order: vitals/symptoms (already existing), consultation history, labs (already existing), AI risk + recommendation, diagnosis (already existing), treatment/prescriptions (already existing), consumables (already existing), follow-up plan (already existing), vaccination — covering everything the spec's "complete visit record" list requires.

- [ ] **Step 6: Commit**

```bash
git add src/components/patients/visit-history-tab.tsx
git commit -m "feat: show AI prediction and consultation history in Visit History"
```

---

## Final Verification (after all tasks)

```bash
cd /home/ebenezer/Projects/ubuntu/Antenatal-api && npx tsc --noEmit -p .
cd /home/ebenezer/Projects/ubuntu/ubuntumed && npx tsc --noEmit && pnpm lint && pnpm build
```

Then walk through the manual flow check from Task 6 Step 6 once more end-to-end, including the labs-ordered branch: start an assessment, order labs, confirm `AwaitingLabsBlocker` shows, submit lab results as the lab nurse, confirm the patient record unblocks into `FinalizeAssessmentBlocker` starting at AI Review, and complete the pipeline through to Vaccination.
