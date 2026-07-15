# Gynecologist Role — Slice 2: Orange/Yellow Specialist Recommendations

## Goal

Give the Gynecologist a way to review Orange/Yellow risk pregnancies and leave a specialist recommendation the responsible ANC Nurse can see and respond to — spec sections 6–8. This builds on Slice 1 (role, dashboard, emergency referral co-management), which is already implemented.

## Out of scope for this slice

- Emergency case documentation fields beyond existing `treatment`/`followUpPlan` (diagnosis, procedures, imaging, admission, delivery detail) — still deferred.
- Audit log.
- Full notification payload detail (patient ID, gestational age, AI classification inline in the alert) — alerts stay short-message, same as today's lab/referral alerts.
- A dedicated recommendations queue page — this slice is patient-page-only; Risk Classification (already gynecologist-accessible from Slice 1) is the entry point for finding Orange/Yellow patients.

## Data model

New `Recommendation` type in `src/lib/patients/types.ts`:
```ts
export interface Recommendation {
  id: string;
  patientId: string;
  createdAt: string;
  createdByGynecologist: string;
  createdByFacility: string;
  riskLevelAtCreation: RiskLevel;
  message: string;
  status: "open" | "responded";
  nurseResponse?: string;
  respondedByNurse?: string;
  respondedAt?: string;
  acknowledgedByGynecologistAt?: string;
}
```

Persisted the same way as `Referral` — a `storage.ts` module-level cache + localStorage key `ubuntumed.recommendations`, `useSyncExternalStore`-backed.

## UI

New tab, **"Specialist Notes"**, added to the shared patient detail page's `TABS` array (`src/app/dashboard/nurse/patients/[id]/page.tsx`), visible to both roles (no per-role tab filtering needed — nurses already see other roles' data on this shared page):

- Lists all `Recommendation`s for this patient, most recent first.
- If `user.role === "gynecologist"`: an "Add Recommendation" button opens a small inline form (message textarea; risk level auto-filled from the patient's current effective risk level via the existing `useLatestRiskLevel`/`useActiveEmergencyPatientIds` logic, read-only display not an input).
- Each recommendation card: message, author, facility, timestamp, risk level badge.
  - If `status === "open"` and `user.role === "nurse"`: an inline response textarea + submit button → sets `status: "responded"`, `nurseResponse`, `respondedByNurse`, `respondedAt`.
  - If `status === "responded"`: shows the nurse's response beneath the original message.
  - If `status === "responded" && !acknowledgedByGynecologistAt` and `user.role === "gynecologist"` and `createdByGynecologist === user.name`: an "Acknowledge" button → sets `acknowledgedByGynecologistAt`.

## Notifications (extend `useNotificationAlerts`, same derived pattern as Slice 1)

- `role === "nurse"`: one alert per `Recommendation` with `status === "open"` — "New Specialist Recommendation" / `${createdByGynecologist} left a note for ${patientName}`.
- `role === "gynecologist"`: one alert per `Recommendation` where `status === "responded" && !acknowledgedByGynecologistAt && createdByGynecologist === currentUser.name` — "Nurse Responded to Your Recommendation".

Both route to the patient page (existing `handleAlertClick` else-branch already does this for any type other than `lab_request`).

## New functions in `use-patients.ts`

- `useRecommendationsForPatient(patientId): Recommendation[]`
- `createRecommendation(patientId, message, riskLevel): Recommendation`
- `respondToRecommendation(id, response): Recommendation`
- `acknowledgeRecommendation(id): Recommendation`
- Extend `NotificationAlert.type` with `"recommendation_open" | "recommendation_responded"`, extend `useNotificationAlerts`.

## File-level summary

- `src/lib/patients/types.ts` — add `Recommendation`.
- `src/lib/patients/storage.ts` — add recommendations persistence (mirrors referrals: cache, listeners, load/save, subscribe, snapshot, server-snapshot, add, update).
- `src/lib/patients/use-patients.ts` — the four new functions above + notification alert extension.
- `src/components/patients/specialist-notes-tab.tsx` (new) — the tab UI described above.
- `src/app/dashboard/nurse/patients/[id]/page.tsx` — add `"Specialist Notes"` to `TABS`, render the new tab.
- `src/components/dashboard/notification-panel.tsx` — no change needed (existing else-branch already routes any non-`lab_request` type to the patient page).

## Testing

`pnpm exec tsc --noEmit`, `pnpm exec eslint .`, `pnpm build`, plus manual walkthrough: as Dr. Mutesi, open an Orange/Yellow patient → Specialist Notes → add a recommendation → confirm it appears; log in as the nurse at that facility → confirm the alert appears → respond → confirm it clears from the nurse's alerts; log back in as Dr. Mutesi → confirm the "nurse responded" alert appears → acknowledge → confirm it clears.
