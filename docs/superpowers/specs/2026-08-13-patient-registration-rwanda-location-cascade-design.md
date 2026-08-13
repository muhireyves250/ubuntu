# Patient Registration: Rwanda Location Cascade — Design

## Context

Patient registration and editing (`src/components/patients/register-patient-modal.tsx:193-219`,
`src/components/patients/edit-patient-modal.tsx:33-37,198-214`) currently capture
District, Sector, Cell, Village, and Isibo as five free-text `<input>` fields —
no validation, no dropdown, no Province or Country field at all. The backend
`Patient` model (`Antenatal-api/prisma/schema.prisma:266-270`) mirrors this:
`district`, `sector`, `cell`, `village`, `isibo` all plain `String`, no `province`.

Rwanda's administrative divisions (Province → District → Sector → Cell → Village)
are available as a public static dataset:
[`github.com/ngabovictor/Rwanda`](https://github.com/ngabovictor/Rwanda) — a
~350KB JSON file, license "use it however you want," structured as
`{ [province]: { [district]: { [sector]: { [cell]: string[] /* villages */ } } } }`.
It is **not** a live API — there is no server to call.

This replaces the free-text District/Sector/Cell/Village entry with cascading
dropdowns driven by that dataset, adds a Province field (persisted) and a
Country field (Rwanda-only, UI step, not persisted), and leaves Isibo exactly
as free text since the dataset has no unit below Village.

## Goals

- Eliminate typos/invalid values in District, Sector, Cell, Village by
  constraining them to Rwanda's real administrative hierarchy.
- Add a real, saved `province` field to the patient record.
- Add a "choose Rwanda" step matching the request, without inventing a
  multi-country field the system will never use.
- Never lose or crash on existing patient records whose stored
  district/sector/cell/village don't match this dataset (Rwanda's admin
  boundaries were restructured in 2006 — old records may have renamed values).

## Non-Goals

- No live/third-party API calls at runtime — the dataset is vendored into the
  frontend repo, matching the app's existing pattern of only ever calling its
  own backend.
- No multi-country support. Country is a fixed, non-persisted "Rwanda" step.
- No change to Isibo (stays free text) or to any other patient field.
- No backend change beyond the single new `province` column — no new
  endpoints, no restructuring of the existing Patient DTOs beyond adding one
  field.
- No migration/backfill of `province` for existing patients — old records
  simply have `province: null` until edited and saved again.

## Data

Vendor a copy of `data.json` into
`src/lib/locations/rwanda-locations.json` (frontend repo), plus
`src/lib/locations/rwanda.ts` exporting pure, synchronous lookups:

```ts
export function getProvinces(): string[];
export function getDistricts(province: string): string[];
export function getSectors(province: string, district: string): string[];
export function getCells(province: string, district: string, sector: string): string[];
export function getVillages(province: string, district: string, sector: string, cell: string): string[];
export function findProvinceForDistrict(district: string): string | undefined;
```

Both the JSON and the helper module are loaded via dynamic `import()` inside
the registration/edit modals only — not part of the main app bundle — since
this data is only ever needed on those two forms.

## Frontend Form

In both `register-patient-modal.tsx` and `edit-patient-modal.tsx`, the
Address fieldset becomes:

1. **Country** — a `<select>` with one option, "Rwanda", pre-selected.
   Real interactive element (satisfies "choose Rwanda"), but its value is
   never included in the submit payload — nothing to send, it can't vary.
2. **Province** — `<select>`, options from `getProvinces()`. Always enabled
   (Country is effectively fixed).
3. **District** — `<select>`, options from `getDistricts(province)`.
   Disabled until Province is chosen. Changing Province clears District/
   Sector/Cell/Village.
4. **Sector** — `<select>`, options from `getSectors(province, district)`.
   Disabled until District is chosen. Changing District clears Sector/Cell/
   Village.
5. **Cell** — `<select>`, options from `getCells(province, district, sector)`.
   Disabled until Sector is chosen. Changing Sector clears Cell/Village.
6. **Village** — `<select>`, options from `getVillages(province, district, sector, cell)`.
   Disabled until Cell is chosen.
7. **Isibo** — unchanged free-text `<input>`.

Submit payload gains one field: `address.province: string`. Everything else
in the payload shape is unchanged.

### Edit form: legacy data handling

Existing patients have `district`/`sector`/`cell`/`village` but no
`province`. On open, `edit-patient-modal.tsx` calls
`findProvinceForDistrict(patient.address.district)` to pre-select Province;
if that district isn't found in the dataset (renamed/legacy value), Province
starts unselected and District falls back to displaying the patient's raw
stored value as an injected extra `<option>` (so opening the form for an old
record never blanks out or discards their existing address) — the user can
either leave it as-is (submits the original string unchanged) or pick a real
value from the cascade to correct it.

## Backend

`Antenatal-api/prisma/schema.prisma`: add `province String?` to `Patient`
(nullable — existing rows have no value and this is not backfilled). One
migration. Update the Patient create/update DTOs and response mapper to
accept and return `province`. No other backend logic changes.

## Error Handling

- Dataset fails to load (dynamic import error, e.g. build artifact missing):
  fall back to plain free-text inputs for Province/District/Sector/Cell/
  Village for that session, logged via existing error-handling conventions —
  registration must never be fully blocked by this dataset failing to load.
- Legacy district/sector/cell/village values not present in the dataset:
  handled as described above (kept visible, not discarded).

## Testing

- Frontend: `pnpm lint`, `tsc --noEmit`, `pnpm build` (no test suite exists
  in this repo). Manual: register a new patient through the full cascade,
  confirm each level narrows to only valid children and resets correctly
  when a parent changes; edit a pre-existing patient (created before this
  change) and confirm the form opens without crashing and without losing
  their existing address values; confirm `province` is present after
  save-and-reload.
- Backend: existing `jest` suite + build, confirming the migration applies
  cleanly and the DTOs round-trip `province`.

## Out of Scope / Explicit Deferrals

- Live/third-party API integration (dataset is static and vendored instead).
- Multi-country support.
- Backfilling `province` for existing patients.
- Changing Isibo from free text.
