# Topbar patient search — design

## Problem

The topbar's "Search patients, cases…" box (`src/components/dashboard/topbar.tsx:49-52`) is a static `<span>`, not an input. It does nothing. The patient list page (`/dashboard/nurse/patients`) already has working name/ID/risk filters — the topbar box is the only broken search surface.

## Scope

Nurse role only. `th`, `hc`, `central`, and `dh` dashboards have no patient list/detail routes built yet, so there's nothing for their topbar box to search. For those roles the box stays exactly as it is today (static, non-interactive).

## Behavior

- Topbar renders a real controlled `<input>` when `user.role === "nurse"`.
- Typing 2+ characters opens a dropdown beneath the box listing patients whose **name or short ID** (`shortId(patient.id)`, e.g. `PT-12AB34CD`) contains the query (case-insensitive substring match), capped at 6 results, each row showing the patient's name, initials avatar, and a small `RiskBadge` for their latest risk level.
- Clicking a result row navigates to `/dashboard/nurse/patients/{id}` and clears/closes the search box.
- Pressing Enter, or clicking a "View all results for '{query}'" row pinned to the bottom of the dropdown, navigates to `/dashboard/nurse/patients?q={query}` and closes the dropdown.
- Zero matches: dropdown shows "No patients found."
- Clicking outside the dropdown or pressing Escape closes it; typed text is preserved (Escape again, or backspacing to empty, doesn't need to clear it — closing just hides the list).
- Fewer than 2 characters: dropdown stays closed, no filtering work done.

## Data flow

- Reuse the existing `usePatients()` and `useVisits()` hooks (`src/lib/patients/use-patients.ts`) — same pattern `red-case-alert.tsx` and the patients page already use to resolve each patient's latest risk level.
- `shortId()` currently lives as an unexported helper inside `src/app/dashboard/nurse/patients/page.tsx`. Move it to `src/lib/format.ts` (alongside `getInitials`/`relativeTime`) and import it from both the patients page and the topbar, so the ID-matching logic isn't duplicated.

## Patients page: `q` param support

- `/dashboard/nurse/patients` reads `useSearchParams().get("q")` on mount and uses it as the initial value of its existing `nameFilter` state, so arriving from "View all results" lands on a pre-filtered list. (ID-vs-name ambiguity isn't worth resolving here — `q` only seeds `nameFilter`; if the query matches by ID, the user can see the result via the dropdown match instead of needing the full list pre-filtered by ID.)

## Component shape

- New small client component `src/components/dashboard/patient-search.tsx` encapsulating the input + dropdown + filtering + navigation logic, rendered conditionally from `topbar.tsx` for the nurse role. Keeps `topbar.tsx` focused on layout/role-switching and isolates the new stateful logic.

## Non-goals

- No search across cases/referrals/visits — patients by name or ID only, matching what the existing patients-page filters already do.
- No keyboard arrow-key navigation within the dropdown (click or Enter-to-view-all only) — out of scope for this slice.
- No debouncing — patient counts are small (demo/seed-data scale), filtering on every keystroke is fine.
