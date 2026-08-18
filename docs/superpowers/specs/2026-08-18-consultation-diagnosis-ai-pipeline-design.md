# Consultation-to-Discharge Assessment Pipeline Design

**Repos affected:** `ubuntumed` (frontend), `Antenatal-api` (backend)

---

## Problem

Today, "New Assessment" only covers Vitals → Symptoms → Labs → Summary, and finalization (`FinalizeAssessmentBlocker`) shows a fake, always-on, client-side-simulated AI panel with no real send action. Diagnosis, prescriptions (Treatment), Consumables, and Vaccination already exist as backend modules and frontend components, but they're only reachable later, per-visit, from the expanded row on the Visit History tab — disconnected from the assessment itself.

The reference system (eBuzima) models a single visit encounter as one pipeline: Consultation → Investigation → Final Diagnosis → Treatment → Consumables → Followup → Vaccination → Discharge. This spec brings our assessment flow into that same shape, using pieces we've already built, and wires up the real (currently dead) backend AI-prediction endpoint in place of the fake client-side simulation.

---

## Scope Decisions

- **Consultation step edits the shared Pregnancy history record** (the same fields shown in the "Medical History" tab), not a new per-visit snapshot table. Pre-filled with current values; submitting updates the Pregnancy record directly. One source of truth.
- **"Send to AI" is an explicit nurse action**, not automatic — matches the user's requirement that both the no-labs and labs-ordered paths funnel into the same review-and-send moment.
- **No-labs and labs-ordered visits share one AI Review screen.** Today only the labs-ordered path has any review screen (`FinalizeAssessmentBlocker`); the no-labs path currently finishes immediately from `SummaryStep`. That shortcut is removed — every visit goes through AI Review.
- **The AI backend endpoint (`POST /predictions/visits/:visitId/run`) already exists and its contract doesn't change.** Since no external AI service is deployed, `predict()` gets a rule-based fallback (ported from the existing frontend `computePrediction` logic) instead of returning `null`. When a real AI service exists later, only the internals of `predict()` change.
- **Diagnosis, Treatment (prescriptions), Consumables, and Vaccination become wizard steps**, filled in immediately after AI Review, in that order, matching the reference pipeline.
- **The wizard becomes the only editor for Diagnosis/Treatment/Consumables/Vaccination for a given visit.** The existing sections on Visit History's expanded row (`visit-diagnosis-section.tsx`, `visit-pharmacy-section.tsx`) become **read-only displays** of what was entered during the assessment — no duplicate editors for the same visit's data.
- **Discharge = the existing finalize action**, renamed/reframed as the pipeline's last step: sets `assessmentFinalized: true`, unlocks the patient profile. No new "discharge" data model — reuses what `FinalizeAssessmentBlocker`'s "Complete Visit & Unlock Profile" already does.
- **Followup step reuses the existing `followUpPlan` text field** already captured today in the finalize flow — not a new scheduling feature.
- **No new tests** — this codebase has no test suite (established convention); verification is `tsc`/`lint`/`build` plus live curl smoke tests against the running backend, as done throughout this project.

---

## Flow (every visit)

```
Vitals → Symptoms → Consultation → Labs choice → Summary/Notes
                                                      │
                       ┌──────────────────────────────┴───────────────────────────┐
                       │ No labs needed                          Labs ordered      │
                       ▼                                              ▼            │
                 AI Review (immediate)                    AwaitingLabsBlocker      │
                       │                                  (unchanged; waits for    │
                       │                                   labStatus: completed)   │
                       │                                              │            │
                       │◄─────────────────────────────────────────────┘            │
                       ▼                                                           │
              Final Diagnosis → Treatment → Consumables → Followup → Vaccination → Discharge
```

- **Consultation**: medical/obstetric history checklist, pre-filled from the pregnancy's current values, editable. Submitting updates the Pregnancy record.
- **Labs choice** (existing, unchanged UI): "No lab tests needed" vs "Order laboratory tests."
- **AI Review** (new; replaces `FinalizeAssessmentBlocker`'s Step 1): shows the full package — vitals, symptoms, consultation history, notes, and the lab results table when present. Has an explicit **Send to AI** button.
- **Final Diagnosis → Treatment → Consumables → Followup → Vaccination**: each a wizard step, reusing the existing per-feature components/forms (`visit-diagnosis-section.tsx`'s create-diagnosis form, the pharmacy prescription form, the consumable-usage form, the vaccination form), now presented sequentially instead of being tucked into Visit History.
- **Discharge**: the existing Treatment & Action Plan submission (treatment notes + follow-up plan, pre-filled from the AI recommendation) — submitting finalizes the visit.

---

## Backend changes (`Antenatal-api`)

### `RiskPrediction` schema — add `recommendation` field

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
  recommendation        String?   // NEW — short clinician-facing follow-up suggestion
  createdAt             DateTime  @default(now())

  alerts Alert[]

  @@map("risk_predictions")
}
```

Migration follows the established hand-written-SQL + manual `_prisma_migrations` registration pattern used throughout this project (Prisma CLI can't reach the DB from this sandbox).

### `ai-prediction.service.ts` — rule-based fallback in `predict()`

- Current behavior: POSTs `PredictionInput` to `${aiServiceUrl}/predict`; on any HTTP failure, logs a warning and returns `null` (no DB write).
- New behavior: on HTTP failure (connection refused, timeout, non-2xx), instead of returning `null`, compute a `PredictionResult` locally using a rule-based engine ported from the frontend's `src/lib/patients/ai-prediction.ts` `computePrediction` logic (weighted symptom/vitals scoring → risk probabilities + risk level), plus derive a short `recommendation` string from the same weighted factors (e.g., the existing "AI-derived follow-up suggestion" logic already used by `FinalizeAssessmentBlocker` today).
- `modelVersion` for the fallback path is tagged distinctly (e.g. `"rule-based-fallback-v1"`) so it's clear in stored records which predictions came from the real service vs. the fallback, once a real service exists.
- `runForVisit()`'s upsert shape gains the `recommendation` field; contract of the two existing endpoints (`POST /predictions/visits/:visitId/run`, `GET /predictions/assessments/:assessmentId`) is otherwise unchanged.

---

## Frontend changes (`ubuntumed`)

### New: `src/components/patients/assessment/consultation-step.tsx`

- Reuses the same checklist fields/options as `new-pregnancy-modal.tsx`'s history section (`EMPTY_HISTORY`, `HistoryCheckbox`).
- Pre-filled from `usePregnanciesForPatient` → open pregnancy's current history fields.
- On step submit, calls `updatePregnancy(pregnancyId, { ...historyFields })` (same mutation already used for obstetric counts) — no new API needed.

### `assessment-wizard.tsx`

- Insert Consultation as a new step between Symptoms and Labs.
- Extend step navigation/`maxReachedStep` to include the new downstream steps (AI Review, Final Diagnosis, Treatment, Consumables, Followup, Vaccination) so the whole pipeline lives in one wizard rather than wizard-then-separate-blocker-components. `AwaitingLabsBlocker` remains a full-page blocker (interrupts the wizard while waiting), matching today's behavior.

### `summary-step.tsx`

- Drops the `treatment`/`followUpPlan` fields entirely (they move to the new Followup/Discharge steps) — becomes notes-only review + submit.

### New: `src/components/patients/assessment/ai-review-step.tsx`

- Replaces `FinalizeAssessmentBlocker`'s Step 1.
- Renders vitals, symptoms, consultation history, notes, and (conditionally) the lab results table with comment boxes — unchanged from today's Step 1 content, minus the automatic simulated panel.
- **Send to AI** button calls a new frontend API function hitting `POST /predictions/visits/:visitId/run`; displays the returned `predictedRiskLevel` (as today's color badge) and `recommendation` text once the call resolves.
- Existing red-risk auto-escalation (`escalateVisitIfCritical`) now triggers off the real returned `predictedRiskLevel` instead of the client-simulated `computePrediction`.

### New steps: `final-diagnosis-step.tsx`, `treatment-step.tsx`, `consumables-step.tsx`, `vaccination-step.tsx`

- Each wraps the existing creation forms already built for Visit History's expanded row (diagnosis creation, prescription creation, consumable-usage creation, vaccination recording) — same mutations (`createDiagnosis`, `createPrescription`, `createConsumableUsage`, `recordVaccination`), just presented as sequential wizard steps scoped to the visit being finalized.

### `finalize-assessment-blocker.tsx`

- Step 2 (Followup/Discharge: treatment notes + follow-up plan, pre-filled from the AI recommendation) is kept, now the pipeline's final step. Submitting still sets `assessmentFinalized: true` and unlocks the patient profile — unchanged mechanism.

### Visit History tab (`visit-history-tab.tsx`, `visit-diagnosis-section.tsx`, `visit-pharmacy-section.tsx`)

- Their forms are removed; they become **read-only** displays of whatever was recorded during the assessment for that visit — no more inline "add" forms there.
- **The expanded row becomes a complete record of everything the nurse did during that visit**, not just today's partial diagnosis/pharmacy sections. It must show, in the same pipeline order the nurse filled them in:
  1. Vitals & symptoms recorded
  2. Consultation history as it stood at that visit (read from the visit's linked pregnancy history at finalize time — see note below)
  3. Lab results (if ordered), with any comments
  4. AI risk level + recommendation returned for that visit
  5. Final diagnosis (diagnosis list)
  6. Treatment (prescriptions)
  7. Consumables used
  8. Follow-up plan
  9. Vaccination given
  10. Discharge/finalization notes
- **Consultation history display caveat:** since Consultation edits the shared Pregnancy record (no per-visit snapshot table, per the earlier scope decision), the Visit History row shows the pregnancy's history *as it is now*, not necessarily as it was at that exact visit if it was edited again in a later visit. This is an accepted tradeoff of the "single source of truth" decision — flagged here so it isn't mistaken for a bug later. If exact point-in-time history-per-visit turns out to matter, that would require reopening the earlier "shared record vs. snapshot" decision.

### `page.tsx` gating logic

- Today: `isWaitingForLabs` (labStatus pending/in_progress) vs `needsFinalization` (labStatus completed && !assessmentFinalized) are the only two blocking states.
- New: a visit with no labs ordered and not yet finalized also needs to land on the pipeline (AI Review onward) immediately after Summary submission — the wizard itself carries the nurse through AI Review → ... → Discharge in one continuous session for the no-labs path, so no new blocking page state is needed there. Only the labs-ordered path still needs the interrupt-and-resume via `AwaitingLabsBlocker` (visit created, wizard exits, nurse returns later once labs land, wizard/blocker resumes at AI Review).

---

## Error handling

- If the "Send to AI" call fails outright (network error, 500), show an inline retry — the nurse is not blocked from proceeding to Final Diagnosis and finishing the pipeline manually without an AI recommendation (matches existing tolerance for AI-service-down scenarios; `followUpPlan` just isn't pre-filled in that case).
- Rule-based fallback in `predict()` never throws — same no-throw contract as today's real-service failure path — so `runForVisit()` always returns a usable result now instead of occasionally returning `null`.

---

## Testing

No test suite exists in either repo. Verification: `npx tsc --noEmit` (both repos), `pnpm lint`, `pnpm build` (frontend), and live curl smoke tests against the running dev backend for the migrated schema and the `predict()` fallback path — consistent with how every other feature in this session was verified.
