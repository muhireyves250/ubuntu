# Patient Registration Rwanda Location Cascade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the free-text District/Sector/Cell/Village patient-address inputs with cascading dropdowns driven by a vendored Rwanda administrative-divisions dataset, add a persisted `province` field end-to-end (frontend + backend), and add a non-persisted "Rwanda" Country step. Isibo stays free text, unchanged.

**Architecture:** Backend gets one new `province` column (Prisma migration + DTO + select-list addition) so it round-trips through the existing Patient CRUD with no other backend logic changes. Frontend vendors a static JSON dataset and a pure-lookup helper module, then wires five cascading `<select>` elements into both the register and edit patient modals, replacing the current free-text inputs.

**Tech Stack:** NestJS + Prisma + PostgreSQL (Antenatal-api), Next.js + TypeScript + React (ubuntumed), no test framework in the frontend repo, `jest` in the backend repo.

## Global Constraints

- No live/third-party API calls at runtime — the Rwanda dataset is vendored as a static file in the frontend repo (spec: Non-Goals).
- No multi-country support — Country is a fixed "Rwanda" UI step, never sent to the backend (spec: Non-Goals, Frontend Form §1).
- Isibo is not touched — stays a free-text input on both forms (spec: Non-Goals).
- No backfill of `province` for existing patients — old rows get an empty string via migration default, not retroactively populated (spec: Non-Goals — the spec said nullable/no-backfill; see the correction below for why this plan uses `NOT NULL DEFAULT ''` instead of nullable).
- Existing patient records whose stored district/sector/cell/village don't match the dataset must never be discarded or crash the edit form (spec: Error Handling).

## Correction vs. the design spec

The spec proposed `province String?` (nullable) on the Prisma model. The existing codebase has a direct precedent for adding a required text column to the same non-empty `patients` table — migration `20260802130037_add_isibo_and_user_location` added `isibo` as `TEXT NOT NULL DEFAULT ''`, not nullable. This plan follows that established convention instead: `province String @default("")`, matching `isibo`'s existing style exactly, so the field behaves consistently with its siblings (never `null`, just possibly empty for pre-existing rows) rather than introducing the only nullable field in the address group.

---

### Task 1: Backend — Prisma migration adding `province`

**Files:**
- Modify: `Antenatal-api/prisma/schema.prisma:266` (insert `province` field into the `Patient` model, right before `district`)
- Create: `Antenatal-api/prisma/migrations/<timestamp>_add_patient_province/migration.sql`

**Interfaces:**
- Produces: a `province` column on the `patients` table (`TEXT NOT NULL DEFAULT ''`), which Task 2/3 will expose through the DTO and select-list.

- [ ] **Step 1: Add the field to the Prisma schema**

In `Antenatal-api/prisma/schema.prisma`, find:
```prisma
model Patient {
  id                           String     @id @default(cuid())
  nationalId                   String     @unique
  firstName                    String
  lastName                     String
  dateOfBirth                  DateTime
  phone                        String?
  altPhone                     String?
  district                     String
```
Change to:
```prisma
model Patient {
  id                           String     @id @default(cuid())
  nationalId                   String     @unique
  firstName                    String
  lastName                     String
  dateOfBirth                  DateTime
  phone                        String?
  altPhone                     String?
  province                     String     @default("")
  district                     String
```

- [ ] **Step 2: Generate the migration**

Run (from `Antenatal-api/`):
```bash
npx prisma migrate dev --name add_patient_province
```
Expected: Prisma creates `prisma/migrations/<timestamp>_add_patient_province/migration.sql` containing:
```sql
-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "province" TEXT NOT NULL DEFAULT '';
```
and applies it to your local dev database without error.

- [ ] **Step 3: Verify the build still compiles**

Run: `cd Antenatal-api && npx tsc --noEmit`
Expected: no errors (the Prisma client regenerates as part of `migrate dev`, picking up the new field automatically).

- [ ] **Step 4: Commit**

```bash
cd Antenatal-api
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(patients): add province column to Patient"
```

---

### Task 2: Backend — expose `province` on the create/update DTOs

**Files:**
- Modify: `Antenatal-api/src/modules/patients/dto/create-patient.dto.ts:40` (insert `province` field before `district`)

**Interfaces:**
- Consumes: nothing new.
- Produces: `CreatePatientDto.province: string` (required) — `UpdatePatientDto` (in `update-patient.dto.ts`) automatically inherits it as optional via its existing `PartialType(OmitType(CreatePatientDto, ['nationalId']))` definition, so that file needs no edit.

- [ ] **Step 1: Add the `province` field to `CreatePatientDto`**

In `Antenatal-api/src/modules/patients/dto/create-patient.dto.ts`, find:
```ts
@ApiProperty({ example: 'Bugesera' })
@IsString()
@IsNotEmpty()
district: string;
```
Change to:
```ts
@ApiProperty({ example: 'East' })
@IsString()
@IsNotEmpty()
province: string;

@ApiProperty({ example: 'Bugesera' })
@IsString()
@IsNotEmpty()
district: string;
```

- [ ] **Step 2: Verify it compiles**

Run: `cd Antenatal-api && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd Antenatal-api
git add src/modules/patients/dto/create-patient.dto.ts
git commit -m "feat(patients): accept province on patient create/update DTOs"
```

---

### Task 3: Backend — return `province` in API responses

**Files:**
- Modify: `Antenatal-api/src/modules/patients/patients.service.ts:22` (add `province: true,` to `PATIENT_SELECT`, right after `district: true,`)

**Interfaces:**
- Consumes: the `province` column from Task 1.
- Produces: `province` present on every Patient object returned by `findAll`/`findOne`/`create`/`update` — Task 6 (frontend `BackendPatient` type) depends on this being present in the JSON response.

- [ ] **Step 1: Add `province` to the select list**

In `Antenatal-api/src/modules/patients/patients.service.ts`, find:
```ts
  district: true,
  sector: true,
```
Change to:
```ts
  province: true,
  district: true,
  sector: true,
```
(inserted as the first field of the address group, matching the field order used in `create-patient.dto.ts` from Task 2).

- [ ] **Step 2: Verify it compiles and existing tests pass**

Run: `cd Antenatal-api && npx tsc --noEmit && npx jest`
Expected: no compile errors; existing patient test suite passes unchanged (no existing test asserts on the exact shape of `PATIENT_SELECT`, so this is additive).

- [ ] **Step 3: Manual smoke check**

With the backend running locally (`npm run start:dev`), `POST /api/patients` with a body that includes `"province": "East"` alongside the existing required fields, and confirm the response JSON includes `"province": "East"`. Then `GET /api/patients/:id` for that patient and confirm `province` is present there too.

- [ ] **Step 4: Commit**

```bash
cd Antenatal-api
git add src/modules/patients/patients.service.ts
git commit -m "feat(patients): return province in patient API responses"
```

---

### Task 4: Frontend — vendor the Rwanda dataset and lookup helpers

**Files:**
- Create: `ubuntumed/src/lib/locations/rwanda-locations.json`
- Create: `ubuntumed/src/lib/locations/rwanda.ts`

**Interfaces:**
- Produces:
  ```ts
  export function getProvinces(): string[];
  export function getDistricts(province: string): string[];
  export function getSectors(province: string, district: string): string[];
  export function getCells(province: string, district: string, sector: string): string[];
  export function getVillages(province: string, district: string, sector: string, cell: string): string[];
  export function findProvinceForDistrict(district: string): string | undefined;
  ```
  Tasks 7 and 8 import these via `await import("@/lib/locations/rwanda")` inside the modal components.

- [ ] **Step 1: Vendor the dataset**

Run (from `ubuntumed/`):
```bash
mkdir -p src/lib/locations
gh api repos/ngabovictor/Rwanda/contents/data.json --jq '.content' | base64 -d > src/lib/locations/rwanda-locations.json
python3 -c "import json; json.load(open('src/lib/locations/rwanda-locations.json'))" && echo "valid JSON"
```
Expected: `valid JSON` printed, and `src/lib/locations/rwanda-locations.json` is ~200KB, top-level keys `East`, `Kigali`, `North`, `South`, `West` (5 provinces, confirmed against the live dataset during design).

- [ ] **Step 2: Write the lookup helper module**

Create `ubuntumed/src/lib/locations/rwanda.ts`:
```ts
import rwandaLocations from "./rwanda-locations.json";

// Province -> District -> Sector -> Cell -> Village[]
type RwandaLocationTree = Record<string, Record<string, Record<string, Record<string, string[]>>>>;

const LOCATIONS = rwandaLocations as RwandaLocationTree;

export function getProvinces(): string[] {
  return Object.keys(LOCATIONS).sort();
}

export function getDistricts(province: string): string[] {
  return Object.keys(LOCATIONS[province] ?? {}).sort();
}

export function getSectors(province: string, district: string): string[] {
  return Object.keys(LOCATIONS[province]?.[district] ?? {}).sort();
}

export function getCells(province: string, district: string, sector: string): string[] {
  return Object.keys(LOCATIONS[province]?.[district]?.[sector] ?? {}).sort();
}

export function getVillages(
  province: string,
  district: string,
  sector: string,
  cell: string,
): string[] {
  return [...(LOCATIONS[province]?.[district]?.[sector]?.[cell] ?? [])].sort();
}

export function findProvinceForDistrict(district: string): string | undefined {
  return Object.keys(LOCATIONS).find((province) =>
    Object.prototype.hasOwnProperty.call(LOCATIONS[province], district),
  );
}
```

- [ ] **Step 3: Verify it compiles**

Run: `cd ubuntumed && npx tsc --noEmit`
Expected: no errors. (`resolveJsonModule` is already enabled in `tsconfig.json:12`, so importing the `.json` file typechecks with no config change needed.)

- [ ] **Step 4: Commit**

```bash
cd ubuntumed
git add src/lib/locations/rwanda-locations.json src/lib/locations/rwanda.ts
git commit -m "feat(locations): vendor Rwanda administrative divisions dataset"
```

---

### Task 5: Frontend — thread `province` through the Patient type and API mapping

**Files:**
- Modify: `ubuntumed/src/lib/patients/types.ts:12-18` (add `province` to `Patient.address`)
- Modify: `ubuntumed/src/lib/patients/patient-api.ts:13-17` (add `province` to `BackendPatient`), `:52` (`toFrontendPatient`), `:80-84` (`toBackendCreatePayload`), `:134-141` (`updatePatientApi`'s manual flatten)

**Interfaces:**
- Consumes: the backend `province` field from Task 3.
- Produces: `Patient.address.province: string`, consumed by Tasks 7 and 8's form components and submit payloads.

- [ ] **Step 1: Add `province` to the `Patient` type**

In `ubuntumed/src/lib/patients/types.ts`, find:
```ts
  address: {
    district: string;
    sector: string;
    cell: string;
    village: string;
    isibo: string;
  };
```
Change to:
```ts
  address: {
    province: string;
    district: string;
    sector: string;
    cell: string;
    village: string;
    isibo: string;
  };
```

- [ ] **Step 2: Add `province` to `BackendPatient`**

In `ubuntumed/src/lib/patients/patient-api.ts`, find the `BackendPatient` interface's address fields:
```ts
  district: string;
  sector: string;
  cell: string;
  village: string;
  isibo: string;
```
Change to:
```ts
  province: string;
  district: string;
  sector: string;
  cell: string;
  village: string;
  isibo: string;
```

- [ ] **Step 3: Map it in `toFrontendPatient`**

Find:
```ts
address: { district: p.district, sector: p.sector, cell: p.cell, village: p.village, isibo: p.isibo },
```
Change to:
```ts
address: { province: p.province, district: p.district, sector: p.sector, cell: p.cell, village: p.village, isibo: p.isibo },
```

- [ ] **Step 4: Map it in `toBackendCreatePayload`**

Find:
```ts
    district: data.address.district,
    sector: data.address.sector,
    cell: data.address.cell,
    village: data.address.village,
    isibo: data.address.isibo,
```
Change to:
```ts
    province: data.address.province,
    district: data.address.district,
    sector: data.address.sector,
    cell: data.address.cell,
    village: data.address.village,
    isibo: data.address.isibo,
```

- [ ] **Step 5: Map it in `updatePatientApi`**

Find:
```ts
  if (updates.address) {
    body.district = updates.address.district;
    body.sector = updates.address.sector;
    body.cell = updates.address.cell;
    body.village = updates.address.village;
    body.isibo = updates.address.isibo;
    delete body.address;
  }
```
Change to:
```ts
  if (updates.address) {
    body.province = updates.address.province;
    body.district = updates.address.district;
    body.sector = updates.address.sector;
    body.cell = updates.address.cell;
    body.village = updates.address.village;
    body.isibo = updates.address.isibo;
    delete body.address;
  }
```

- [ ] **Step 6: Verify it compiles**

Run: `cd ubuntumed && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
cd ubuntumed
git add src/lib/patients/types.ts src/lib/patients/patient-api.ts
git commit -m "feat(patients): thread province through the frontend Patient type and API layer"
```

---

### Task 6: Frontend — cascading location fields in the register modal

**Files:**
- Modify: `ubuntumed/src/components/patients/register-patient-modal.tsx:37-42` (state), `:76-118` (submit payload), `:193-219` (Address fieldset JSX)

**Interfaces:**
- Consumes: `getProvinces`, `getDistricts`, `getSectors`, `getCells`, `getVillages` from `@/lib/locations/rwanda` (Task 4); `Patient.address.province` (Task 5).
- Produces: nothing consumed by later tasks — self-contained.

- [ ] **Step 1: Replace the address state with cascade state**

Find:
```tsx
// Address
const [district, setDistrict] = useState("");
const [sector, setSector] = useState("");
const [cell, setCell] = useState("");
const [village, setVillage] = useState("");
const [isibo, setIsibo] = useState("");
```
Change to:
```tsx
// Address
const [province, setProvince] = useState("");
const [district, setDistrict] = useState("");
const [sector, setSector] = useState("");
const [cell, setCell] = useState("");
const [village, setVillage] = useState("");
const [isibo, setIsibo] = useState("");
const [locations, setLocations] = useState<typeof import("@/lib/locations/rwanda") | null>(null);

useEffect(() => {
  import("@/lib/locations/rwanda").then(setLocations);
}, []);

const provinces = locations?.getProvinces() ?? [];
const districts = province && locations ? locations.getDistricts(province) : [];
const sectors = province && district && locations ? locations.getSectors(province, district) : [];
const cells = province && district && sector && locations ? locations.getCells(province, district, sector) : [];
const villages =
  province && district && sector && cell && locations
    ? locations.getVillages(province, district, sector, cell)
    : [];

function handleProvinceChange(value: string) {
  setProvince(value);
  setDistrict("");
  setSector("");
  setCell("");
  setVillage("");
}

function handleDistrictChange(value: string) {
  setDistrict(value);
  setSector("");
  setCell("");
  setVillage("");
}

function handleSectorChange(value: string) {
  setSector(value);
  setCell("");
  setVillage("");
}

function handleCellChange(value: string) {
  setCell(value);
  setVillage("");
}
```
`useEffect` is already imported at the top of this file (`import { useEffect, useState } from "react";`), so no import change is needed.

- [ ] **Step 2: Add `province` to the submit payload**

Find:
```tsx
address: {
  district: district.trim(),
  sector: sector.trim(),
  cell: cell.trim(),
  village: village.trim(),
  isibo: isibo.trim(),
},
```
Change to:
```tsx
address: {
  province,
  district,
  sector,
  cell,
  village,
  isibo: isibo.trim(),
},
```
(province/district/sector/cell/village are now `<select>`-sourced values, not free text, so `.trim()` is no longer needed on them — only `isibo` remains a free-text input.)

- [ ] **Step 3: Replace the Address fieldset JSX**

Find the Address `fieldset` (the block containing the 5 free-text `<input>`s for District/Sector/Cell/Village/Isibo, lines ~193-219) and replace its contents with:
```tsx
<label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
  Country *
  <select value="Rwanda" disabled className={inputCls}>
    <option value="Rwanda">Rwanda</option>
  </select>
</label>
<label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
  Province *
  <select
    required
    value={province}
    onChange={(e) => handleProvinceChange(e.target.value)}
    className={inputCls}
  >
    <option value="" disabled>Select province</option>
    {provinces.map((p) => (
      <option key={p} value={p}>{p}</option>
    ))}
  </select>
</label>
<label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
  District *
  <select
    required
    disabled={!province}
    value={district}
    onChange={(e) => handleDistrictChange(e.target.value)}
    className={inputCls}
  >
    <option value="" disabled>Select district</option>
    {districts.map((d) => (
      <option key={d} value={d}>{d}</option>
    ))}
  </select>
</label>
<label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
  Sector *
  <select
    required
    disabled={!district}
    value={sector}
    onChange={(e) => handleSectorChange(e.target.value)}
    className={inputCls}
  >
    <option value="" disabled>Select sector</option>
    {sectors.map((s) => (
      <option key={s} value={s}>{s}</option>
    ))}
  </select>
</label>
<label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
  Cell *
  <select
    required
    disabled={!sector}
    value={cell}
    onChange={(e) => handleCellChange(e.target.value)}
    className={inputCls}
  >
    <option value="" disabled>Select cell</option>
    {cells.map((c) => (
      <option key={c} value={c}>{c}</option>
    ))}
  </select>
</label>
<label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
  Village *
  <select
    required
    disabled={!cell}
    value={village}
    onChange={(e) => setVillage(e.target.value)}
    className={inputCls}
  >
    <option value="" disabled>Select village</option>
    {villages.map((v) => (
      <option key={v} value={v}>{v}</option>
    ))}
  </select>
</label>
<label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
  Isibo *
  <input type="text" required value={isibo} onChange={(e) => setIsibo(e.target.value)} className={inputCls} />
</label>
```
(`inputCls` is the existing shared class-name constant already used by the other fields in this file — reuse it for the new `<select>`s so styling matches.)

- [ ] **Step 4: Verify it compiles**

Run: `cd ubuntumed && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual smoke check**

Run: `cd ubuntumed && pnpm dev`. Open the register-patient modal. Confirm: Country shows "Rwanda" (disabled, single option). Province dropdown lists exactly `East, Kigali, North, South, West`. Choosing a province populates District with only that province's districts; choosing a district populates Sector; and so on through Village. Changing Province after District/Sector/etc. are set clears all four downstream fields. Submitting creates a patient whose record (check via `GET /api/patients/:id` or the patient detail view) includes the chosen `province`.

- [ ] **Step 6: Commit**

```bash
cd ubuntumed
git add src/components/patients/register-patient-modal.tsx
git commit -m "feat(patients): cascading Rwanda location dropdowns in patient registration"
```

---

### Task 7: Frontend — cascading location fields in the edit modal (with legacy-data fallback)

**Files:**
- Modify: `ubuntumed/src/components/patients/edit-patient-modal.tsx:33-37` (state), `:79-118` (submit payload), `:191-217` (Address fieldset JSX)

**Interfaces:**
- Consumes: everything from Task 6 (same helper functions, same `inputCls`), plus `findProvinceForDistrict` from `@/lib/locations/rwanda` (Task 4) for legacy-data initialization.
- Produces: nothing consumed by later tasks — self-contained.

- [ ] **Step 1: Replace address state with cascade state, seeded from the existing patient and with legacy fallback**

Find:
```tsx
const [district, setDistrict] = useState(patient.address.district);
const [sector, setSector] = useState(patient.address.sector);
const [cell, setCell] = useState(patient.address.cell);
const [village, setVillage] = useState(patient.address.village);
const [isibo, setIsibo] = useState(patient.address.isibo);
```
Change to:
```tsx
const [province, setProvince] = useState(patient.address.province);
const [district, setDistrict] = useState(patient.address.district);
const [sector, setSector] = useState(patient.address.sector);
const [cell, setCell] = useState(patient.address.cell);
const [village, setVillage] = useState(patient.address.village);
const [isibo, setIsibo] = useState(patient.address.isibo);
const [locations, setLocations] = useState<typeof import("@/lib/locations/rwanda") | null>(null);

useEffect(() => {
  import("@/lib/locations/rwanda").then((mod) => {
    setLocations(mod);
    // Patients created before this feature have no stored province and may
    // have a district value that predates Rwanda's 2006 administrative
    // reform — resolve what we can, but never overwrite a province the
    // patient already has.
    if (!province) {
      const resolved = mod.findProvinceForDistrict(district);
      if (resolved) setProvince(resolved);
    }
  });
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

const knownDistricts = province && locations ? locations.getDistricts(province) : [];
const districts = knownDistricts.includes(district) || !district ? knownDistricts : [district, ...knownDistricts];
const knownSectors = province && district && locations ? locations.getSectors(province, district) : [];
const sectors = knownSectors.includes(sector) || !sector ? knownSectors : [sector, ...knownSectors];
const knownCells = province && district && sector && locations ? locations.getCells(province, district, sector) : [];
const cells = knownCells.includes(cell) || !cell ? knownCells : [cell, ...knownCells];
const knownVillages =
  province && district && sector && cell && locations
    ? locations.getVillages(province, district, sector, cell)
    : [];
const villages = knownVillages.includes(village) || !village ? knownVillages : [village, ...knownVillages];
const provinces = locations?.getProvinces() ?? [];

function handleProvinceChange(value: string) {
  setProvince(value);
  setDistrict("");
  setSector("");
  setCell("");
  setVillage("");
}

function handleDistrictChange(value: string) {
  setDistrict(value);
  setSector("");
  setCell("");
  setVillage("");
}

function handleSectorChange(value: string) {
  setSector(value);
  setCell("");
  setVillage("");
}

function handleCellChange(value: string) {
  setCell(value);
  setVillage("");
}
```
This is the same cascade logic as the register modal (Task 6), plus the `knownX`/`x` pairs that inject the patient's existing raw value as an extra `<option>` when it isn't found in the dataset — satisfying the spec's requirement to never discard a legacy value the form can't otherwise represent.

- [ ] **Step 2: Add `province` to the submit payload**

Find the address object in the submit handler (mirrors the register modal's, around lines 79-118):
```tsx
address: {
  district: district.trim(),
  sector: sector.trim(),
  cell: cell.trim(),
  village: village.trim(),
  isibo: isibo.trim(),
},
```
Change to:
```tsx
address: {
  province,
  district,
  sector,
  cell,
  village,
  isibo: isibo.trim(),
},
```

- [ ] **Step 3: Replace the Address fieldset JSX**

Same structure as Task 6 Step 3, using this file's `districts`/`sectors`/`cells`/`villages`/`provinces` variables (which include the legacy-value fallback) instead of the register modal's. Labels here have no trailing `*` on their text (matching this file's existing convention — inputs stay `required`), e.g.:
```tsx
<label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
  Country
  <select value="Rwanda" disabled className={inputCls}>
    <option value="Rwanda">Rwanda</option>
  </select>
</label>
<label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
  Province
  <select required value={province} onChange={(e) => handleProvinceChange(e.target.value)} className={inputCls}>
    <option value="" disabled>Select province</option>
    {provinces.map((p) => (
      <option key={p} value={p}>{p}</option>
    ))}
  </select>
</label>
```
(repeat the same disabled-until-parent-chosen pattern from Task 6 for District/Sector/Cell/Village, reading from this file's `districts`/`sectors`/`cells`/`villages` variables; Isibo stays the unchanged free-text `<input>`.)

- [ ] **Step 4: Verify it compiles**

Run: `cd ubuntumed && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual smoke check**

With `pnpm dev` running: open the edit modal for a patient created **before** this feature (empty `province`, and a `district` value — confirm it resolves via `findProvinceForDistrict` if it matches a real Rwandan district, or shows as a fallback extra option if it doesn't). Confirm the form doesn't crash either way and the existing district/sector/cell/village values remain visible/selected. Change Province and confirm District/Sector/Cell/Village reset and repopulate correctly. Save and confirm the patient's `province` now persists.

- [ ] **Step 6: Commit**

```bash
cd ubuntumed
git add src/components/patients/edit-patient-modal.tsx
git commit -m "feat(patients): cascading Rwanda location dropdowns in patient editing, with legacy-data fallback"
```

---

### Task 8: Full verification pass

**Files:** none (verification only).

**Interfaces:** none.

- [ ] **Step 1: Backend verification**

```bash
cd Antenatal-api
npx tsc --noEmit
npx jest
npm run build
```
Expected: all pass clean.

- [ ] **Step 2: Frontend verification**

```bash
cd ubuntumed
pnpm lint
npx tsc --noEmit
pnpm build
```
Expected: all pass clean (the pre-existing `computeEdd` unused-var warning in `use-patients.ts` may still appear — that's unrelated to this work and fine to leave).

- [ ] **Step 3: End-to-end manual pass**

With both `Antenatal-api` (`npm run start:dev`) and `ubuntumed` (`pnpm dev`) running against each other locally: register a brand-new patient through the full Country → Province → District → Sector → Cell → Village → Isibo flow, confirm it saves and the patient detail view shows the correct province. Edit that same patient, confirm the cascade re-populates correctly from its own saved data (no legacy-fallback path needed here, since it was created post-change). Edit a patient that existed before this change and confirm no crash, no data loss, and that saving it afterward adds a real `province` going forward.

- [ ] **Step 4: Commit (if Step 1/2 required any fixes)**

```bash
git add -A
git commit -m "fix: address verification failures found in full pass"
```
(Only needed if Steps 1-2 surfaced something to fix — if everything was already clean, skip this step.)
