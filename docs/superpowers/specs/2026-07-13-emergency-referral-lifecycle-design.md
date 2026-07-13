# Emergency Referral Lifecycle — Design

## Problem

Today, an emergency danger-sign flag (Signs & Symptoms → `createEmergencyVisit`) auto-creates an already-`"active"` referral in one step. There is no pending state, no receiving-facility scoping, no record of who accepted it, and no way to follow up and close the case with an outcome. `Referral.status` is a literal type with a single possible value (`"active"`), so a real lifecycle cannot exist without changing the type.

This redesign makes the emergency referral a first-class lifecycle: **pending → accepted → closed**, scoped to the receiving facility, owned by the nurse who accepts it, and closed with a recovered/died outcome statement.

Two small, unrelated cleanups are bundled in because they touch the same pages this work already modifies:
- Reorder the patient-detail tabs and drop the `Classification` tab.
- Surface the already-existing but currently-dead `Visit.treatment` / `Visit.followUpPlan` fields in the UI.

## Scope decision: which referrals get the lifecycle

Any visit that classifies RED — whether via the Signs & Symptoms danger-sign flow or via a routine/unscheduled visit's regular symptom-based classification (`classifyRiskLevel`) — goes through the same pending → accepted → closed lifecycle. There is no special case for "routine visit turned red"; it's treated identically to a declared emergency, per explicit instruction.

Referrals created via the existing `CreateReferralModal` (a manually-triggered, nurse-initiated action from the patient detail page, not a system-detected RED classification) keep today's behavior: created directly as `"accepted"`, no separate accept step. That's a different, already-working feature this redesign doesn't touch.

## Data model

`src/lib/patients/types.ts` — `Referral` is replaced:

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

`acceptedAt` (previously "when the referral record was created") is replaced by `createdAt` for the creation timestamp; `acceptedAt` now means what it says — when the pending referral was accepted. This ripples into every existing reader of `referral.acceptedAt` (Referral Log page, DH dashboard, red-case-alert), which is expected — those all get updated as part of this work.

## Demo users

Add one new demo user so the accept flow is actually testable without a backend:

```ts
{
  id: "nurse-kagame",
  name: "Nurse Kagame",
  title: "In charge of ANC",
  facility: "Bugesera District Hospital",
  role: "nurse",
  facilityLevel: "dh",
  password: "nurse123",
}
```

`Role`/`DemoUser` types need no changes — `"nurse"` role at a `"dh"` facility already fits the existing shape.

## Facility routing for emergency referrals

`createEmergencyVisit` needs to know where to route the referral. Rather than a general routing table (out of scope — there's no facility hierarchy model in this app), a small fixed lookup covers the one HC→DH relationship that exists in demo data:

```ts
const REFERRAL_ROUTING: Record<string, string> = {
  "Nyamata Health Center": "Bugesera District Hospital",
};
const DEFAULT_RECEIVING_FACILITY = "Bugesera District Hospital";
```

If the current user's facility isn't in the table, default to Bugesera District Hospital (the only receiving facility with a demo nurse who can act on it). This is a deliberate placeholder — a real facility-hierarchy model is backend territory.

## Workflow

1. **Any visit classifies RED** — either Signs & Symptoms flags an emergency (`createEmergencyVisit`) or a routine/unscheduled visit's `recordVisit` computes `riskLevel === "red"` via `classifyRiskLevel`. Both paths call a shared helper, `maybeCreateEmergencyReferral(patientId, reason)`, which:
   - Skips creating anything if the patient already has an **open** referral (`status === "pending"` or `"accepted"`) — no duplicate spam on repeat red visits.
   - Otherwise creates a `Referral` with `status: "pending"`, `receivingFacility` from the routing lookup, `referredByNurse`/`referredByFacility` from `getCurrentUserSnapshot()`, `urgency: "emergency"`, `reason` (the danger-sign summary for the emergency path, or a generated string like `"Classified RED during {type} visit"` for the routine path).
2. **Receiving facility's nurse** (e.g. Nurse Kagame at Bugesera District Hospital) sees it in `RedCaseAlertPanel`, which is simplified to directly read pending referrals scoped to `receivingFacility === currentUser.facility` — replacing its current ad-hoc "any red-risk patient without an existing referral" derivation from raw visit data. Nurses at other facilities (including the one that originated it) no longer see it here.
3. **Accept**: clicking Accept in the existing `ConfirmModal`/`PatientEmergencyInfoModal` flow calls a new `acceptEmergencyReferral(referralId)` (replacing the old `acceptReferral` which fabricated new records from scratch) — transitions the matched referral to `status: "accepted"`, stamps `acceptedAt`/`acceptedByNurse`/`acceptedByFacility` from the current user snapshot.
4. **Follow-up & close**: the Referral Log page (`nurse/referrals`) gains a status filter (Pending / Accepted / Closed / All) and, for referrals where `status === "accepted"` and `acceptedByNurse === currentUser.name`, a "Close Case" action opening a small modal: outcome (`recovered`/`died`, required) + outcome statement (textarea, required). Submitting calls `closeReferral(referralId, { outcome, outcomeStatement })`, setting `status: "closed"`, `closedAt`.
5. Closed referrals remain visible in the Referral Log (read-only, showing outcome + statement) for historical record — nothing is deleted.

## Storage layer changes

`src/lib/patients/storage.ts`:
- `addReferral` stays (used for the routine/urgent auto-accepted path and for the initial pending emergency referral).
- New `updateReferral(referralId, updates: Partial<Referral>)`, following the exact pattern of the existing `updatePregnancy`/`updatePatient`.

`src/lib/patients/use-patients.ts`:
- `acceptReferral` is removed — it was a bare-bones "create an already-active referral from just a patientId" helper with two different callers that turn out to want different things (see below). Nothing calls it under the new model.
- New `maybeCreateEmergencyReferral(patientId: string, reason: string): Referral | null` — the shared "create a pending referral if one doesn't already exist" helper described in Workflow step 1. Returns `null` if an open referral already exists (no-op).
- New `acceptEmergencyReferral(referralId: string): Referral` — finds the referral, guards that `status === "pending"`, calls `updateReferral` with the accepted fields (from `getCurrentUserSnapshot()`).
- New `closeReferral(referralId: string, data: { outcome: ReferralOutcome; outcomeStatement: string }): Referral` — guards that `status === "accepted"`, calls `updateReferral` with the closed fields.
- `createEmergencyVisit` calls `maybeCreateEmergencyReferral(patientId, summary)` instead of `acceptReferral`.
- `recordVisit` calls `maybeCreateEmergencyReferral(patientId, ...)` when the computed `riskLevel === "red"` (all visit types, not just emergency — `recordVisit` doesn't currently take a `patientId` param since `Visit` is keyed by `pregnancyId`; it derives `patientId` by looking up the pregnancy).
- `CreateReferralModal`'s direct `addReferral` call is updated to match the new `Referral` shape (`createdAt` instead of `acceptedAt`, `status: "accepted"`, plus `referredByNurse`/`referredByFacility` from `getCurrentUserSnapshot()`) — this is the one path that still auto-accepts, per the scope decision above.

## UI changes

- `red-case-alert.tsx`: rewritten to read `useReferrals().filter(r => r.status === "pending" && r.receivingFacility === currentUser.facility)` directly, instead of deriving "red patients without an active referral" from raw visit data (`acceptedPatientIds`/`redCases` logic is removed entirely — the referral itself is now the source of truth for what's pending). Accept button calls `acceptEmergencyReferral(referral.id)`.
- `nurse/referrals/page.tsx`: add a status filter control; add a "Close Case" button + modal for accepted-and-mine rows; display outcome/statement for closed rows.
- `patient-emergency-info-modal.tsx`: no structural change, still reads `latestVisit`/`patient`; the "Accept" button it already exposes now drives the new `acceptEmergencyReferral` path via the parent, keyed by referral id instead of patient id.
- `create-referral-modal.tsx`: updated to construct the new `Referral` shape directly (see storage-layer changes above).

## Bundled cleanup #1: tab reorder

`src/app/dashboard/nurse/patients/[id]/page.tsx` — `TABS` becomes:

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

`Classification` tab and its rendering branch are removed from this page. The standalone `/dashboard/nurse/risk-classification` page (patients grouped by risk tier, a different feature) is untouched.

## Bundled cleanup #2: surface `treatment`/`followUpPlan`

- `summary-step.tsx`: add a "Treatment provided" text input and a "Follow-up plan" text input, included in the `recordVisit` call.
- `visit-history-tab.tsx`: show `visit.treatment`/`visit.followUpPlan` in the expanded detail row (alongside notes/labs), when present.
- `pregnancy-timeline.tsx`: show the same two fields in the expanded assessment detail, when present.

## Out of scope (explicitly deferred)

- Laboratory Nurse role and lab request round-trip (separate subsystem, per your earlier decision).
- Notification system, in-app or email (separate subsystem, per your earlier decision).
- Any general facility-hierarchy/routing model beyond the one hardcoded HC→DH relationship above — that belongs to backend integration.
- Per-visit AI prediction and doctor/gynecologist recommendation fields (not part of this subsystem).
