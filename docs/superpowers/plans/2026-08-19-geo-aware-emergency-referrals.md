# Geography-Aware Emergency Referral Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a nurse creates a referral, the receiving-facility list excludes low-level (non-emergency-capable) facilities and is sorted by real distance from the nurse's own facility.

**Architecture:** Add real lat/lng to existing `Facility` rows (one-time data fix, no API calls at runtime), extend `GET /facilities` with `excludePrimary`/`nearFacilityId` query params that filter by level and sort by Haversine distance, then wire the frontend referral modal to that endpoint instead of its hardcoded facility-name list.

**Tech Stack:** NestJS + Prisma + PostgreSQL (Antenatal-api), Next.js + TypeScript (ubuntumed). No test suite exists in either repo — verification is `npx tsc --noEmit`, `pnpm lint`, `pnpm build`, plus live `curl` against the running dev server with a real JWT.

**Spec:** `docs/superpowers/specs/2026-08-19-geo-aware-emergency-referrals-design.md`

## Global Constraints

- No live healthsites.io calls at request time — coordinates are a one-time hardcoded data fix.
- No new Prisma models, no changes to `Referral`.
- `Facility.type` stays a free string — do not introduce a Prisma enum.
- Leave `Gasabo District Hospital` (code `DH-001`) and `Kigali Health Center` (code `HC-001`) untouched — no coordinates, not deleted, per explicit decision (they don't resolve to real distinct facilities but aren't this task's problem to clean up).
- Every backend change is verified against the actually-running dev server with a real JWT before being considered done (this repo's established convention — no unverified claims).
- Never `git add -A`; stage only the files each task touches.
- Commits end with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

---

### Task 1: Add real coordinates to facility data (backend, data-only)

**Files:**
- Modify: `Antenatal-api/prisma/seed.ts` (11 `facility.upsert` calls, listed below)
- Live DB: direct `UPDATE` statements against the Neon Postgres instance (same pattern used for the earlier facility-rename work)

**Interfaces:**
- Produces: every `Facility` row except `DH-001` and `HC-001` has non-null `latitude`/`longitude` (`Float`), and `HC-KABUSUNZU` has corrected `district`/`province`. Task 2 depends on these being populated to compute distances.

Real-world coordinates researched for these facilities (town/sector-level centroids where an exact building pin wasn't available — good enough for straight-line inter-facility distance in this app, not survey-grade):

| Facility (code) | Latitude | Longitude |
|---|---|---|
| Kabusunzu Health Centre (`HC-KABUSUNZU`) | -1.9800 | 30.0300 |
| Bugesera District Hospital (`DH-BUGESERA`) | -2.1483 | 30.0906 |
| Nyanza District Hospital (`DH-NYANZA`) | -2.3500 | 29.7333 |
| CHB (`CHB-KIGALI`) | -1.9530 | 30.0600 |
| Rwanda Military Hospital (`RMH-KANOMBE`) | -1.9781 | 30.1686 |
| Butaro District Hospital (`DH-BUTARO`) | -1.4097 | 29.8400 |
| Kibagabaga District Hospital (`DH-KIBAGABAGA`) | -1.9306 | 30.1119 |
| Muhima District Hospital (`DH-MUHIMA`) | -1.9358 | 30.0533 |
| Rwamagana Provincial Hospital (`PH-RWAMAGANA`) | -1.9506 | 30.4342 |
| Kabgayi District Hospital (`DH-KABGAYI`) | -2.0986 | 29.7486 |
| King Faisal Hospital (`RH-001`) | -1.9436 | 30.0950 |

`Kabusunzu Health Centre` also gets `district: 'Nyarugenge', province: 'Kigali'` (its real location — the row currently has stale `Bugesera`/`Eastern` left over from an earlier rename).

- [ ] **Step 1: Update `seed.ts` — add coordinates to each `facility.upsert` call**

Open `Antenatal-api/prisma/seed.ts`. For each of the 11 facilities in the table above, add `latitude` and `longitude` fields to the `create:` block (the `update: {}` block stays empty — upsert only creates on first run, live rows are fixed directly via SQL in Step 3). Example for the first one:

```ts
  const nyamataHealthCenter = await prisma.facility.upsert({
    where: { code: 'HC-KABUSUNZU' },
    update: {},
    create: {
      name: 'Kabusunzu Health Centre',
      code: 'HC-KABUSUNZU',
      type: 'PRIMARY',
      district: 'Nyarugenge',
      province: 'Kigali',
      phone: '+250788000001',
      latitude: -1.98,
      longitude: 30.03,
      capacity: null,
      currentOccupancy: 0,
    },
  });
```

Repeat for the other 10 rows (`DH-BUGESERA`, `DH-NYANZA`, `CHB-KIGALI`, `RMH-KANOMBE`, `DH-BUTARO`, `DH-KIBAGABAGA`, `DH-MUHIMA`, `PH-RWAMAGANA`, `DH-KABGAYI`), inserting `latitude`/`longitude` from the table (only `HC-KABUSUNZU` also changes `district`/`province`). For `King Faisal Hospital` (`RH-001`), there is no `facility.upsert` call in `seed.ts` today (the existing comment at the King Faisal section explains it's a pre-existing DB row not managed by this file) — leave `seed.ts` as-is for that one; its coordinates are set via SQL only in Step 3.

- [ ] **Step 2: Verify `seed.ts` compiles**

Run: `cd /home/ebenezer/Projects/ubuntu/Antenatal-api && npx tsc --noEmit -p .`
Expected: no output (clean).

- [ ] **Step 3: Apply the same values to the live DB rows directly**

Run against the live Neon instance (same connection string pattern as the earlier facility-rename fix — read from `.env`'s `DATABASE_URL`):

```bash
psql "$DATABASE_URL" -c "
UPDATE facilities SET latitude = -1.98,    longitude = 30.03,   district = 'Nyarugenge', province = 'Kigali' WHERE code = 'HC-KABUSUNZU';
UPDATE facilities SET latitude = -2.1483,  longitude = 30.0906  WHERE code = 'DH-BUGESERA';
UPDATE facilities SET latitude = -2.35,    longitude = 29.7333  WHERE code = 'DH-NYANZA';
UPDATE facilities SET latitude = -1.953,   longitude = 30.06    WHERE code = 'CHB-KIGALI';
UPDATE facilities SET latitude = -1.9781,  longitude = 30.1686  WHERE code = 'RMH-KANOMBE';
UPDATE facilities SET latitude = -1.4097,  longitude = 29.84    WHERE code = 'DH-BUTARO';
UPDATE facilities SET latitude = -1.9306,  longitude = 30.1119  WHERE code = 'DH-KIBAGABAGA';
UPDATE facilities SET latitude = -1.9358,  longitude = 30.0533  WHERE code = 'DH-MUHIMA';
UPDATE facilities SET latitude = -1.9506,  longitude = 30.4342  WHERE code = 'PH-RWAMAGANA';
UPDATE facilities SET latitude = -2.0986,  longitude = 29.7486  WHERE code = 'DH-KABGAYI';
UPDATE facilities SET latitude = -1.9436,  longitude = 30.095   WHERE code = 'RH-001';
SELECT name, code, latitude, longitude, district, province FROM facilities ORDER BY name;
"
```

Expected: 11 `UPDATE 1` lines, then a table showing all 13 facilities — 11 with non-null `latitude`/`longitude`, `DH-001` and `HC-001` still null, `HC-KABUSUNZU` showing `district = Nyarugenge, province = Kigali`.

- [ ] **Step 4: Commit**

```bash
cd /home/ebenezer/Projects/ubuntu/Antenatal-api
git add prisma/seed.ts
git commit -m "$(cat <<'EOF'
feat: add real coordinates to seeded facilities

Enables distance-based referral routing. Coordinates are hardcoded
(one-time data fix, no runtime API dependency) from public sources.
Also corrects Kabusunzu Health Centre's district/province, which was
stale from an earlier facility rename.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Backend — distance + capability filtering on `GET /facilities`

**Files:**
- Create: `Antenatal-api/src/shared/utils/geo.ts`
- Modify: `Antenatal-api/src/modules/facilities/facilities.service.ts`
- Modify: `Antenatal-api/src/modules/facilities/facilities.controller.ts`

**Interfaces:**
- Consumes: `PrismaService` (existing, already injected in `FacilitiesService`).
- Produces: `haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number` from `geo.ts`. `FacilitiesService.findAll(opts?: { excludePrimary?: boolean; nearFacilityId?: string })` returning `Array<{ id: string; name: string; type: string; district: string; capacity: number | null; latitude: number | null; longitude: number | null; distanceKm?: number | null }>` — `distanceKm` key is present only when `nearFacilityId` was passed. Task 3 (frontend) consumes this shape via `GET /facilities?excludePrimary=true&nearFacilityId=<id>`.

- [ ] **Step 1: Create the Haversine utility**

Create `Antenatal-api/src/shared/utils/geo.ts`:

```ts
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
```

- [ ] **Step 2: Extend `FacilitiesService.findAll`**

Open `Antenatal-api/src/modules/facilities/facilities.service.ts`. Replace the whole file with:

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@shared/prisma/prisma.service';
import { haversineKm } from '@shared/utils/geo';
import { UpdateCapacityDto } from './dto/update-capacity.dto';

// Facility type strings that are NOT capable of receiving a referral
// (low-level health centers). Two different seed sources use different
// vocabularies for the same concept — 'PRIMARY' (this app's own seed)
// and 'HEALTH_CENTER' (a pre-existing row from an earlier seed source) —
// so both are excluded when excludePrimary is requested.
const LOW_LEVEL_TYPES = ['PRIMARY', 'HEALTH_CENTER'];

const FACILITY_SELECT = {
  id: true,
  name: true,
  type: true,
  district: true,
  capacity: true,
  latitude: true,
  longitude: true,
} as const;

@Injectable()
export class FacilitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(opts: { excludePrimary?: boolean; nearFacilityId?: string } = {}) {
    const facilities = await this.prisma.facility.findMany({
      where: opts.excludePrimary ? { type: { notIn: LOW_LEVEL_TYPES } } : {},
      select: FACILITY_SELECT,
      orderBy: { name: 'asc' },
    });

    if (!opts.nearFacilityId) return facilities;

    const originInList = facilities.find((f) => f.id === opts.nearFacilityId);
    const origin =
      originInList ??
      (await this.prisma.facility.findUnique({
        where: { id: opts.nearFacilityId },
        select: { latitude: true, longitude: true },
      }));

    if (origin?.latitude == null || origin?.longitude == null) {
      // Origin has no coordinates (or doesn't exist) — can't compute
      // distance, fall back to the unsorted list rather than erroring.
      return facilities;
    }

    return facilities
      .map((f) => ({
        ...f,
        distanceKm:
          f.latitude != null && f.longitude != null
            ? haversineKm(origin.latitude!, origin.longitude!, f.latitude, f.longitude)
            : null,
      }))
      .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  }

  async updateCapacity(facilityId: string, dto: UpdateCapacityDto) {
    const facility = await this.prisma.facility.findUnique({
      where: { id: facilityId },
      select: { id: true },
    });
    if (!facility) throw new NotFoundException('Facility not found');

    return this.prisma.facility.update({
      where: { id: facilityId },
      data: { capacity: dto.capacity },
      select: {
        id: true,
        name: true,
        type: true,
        district: true,
        capacity: true,
      },
    });
  }
}
```

- [ ] **Step 3: Wire query params in the controller**

Open `Antenatal-api/src/modules/facilities/facilities.controller.ts`. Replace the whole file with:

```ts
import { Body, Controller, Get, Patch, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@shared/decorators/roles.decorator';
import {
  CurrentUser,
  JwtPayload,
} from '@shared/decorators/current-user.decorator';
import { UserRole } from '@common/enums';
import { FacilitiesService } from './facilities.service';
import { UpdateCapacityDto } from './dto/update-capacity.dto';

const ALL_ROLES = [
  UserRole.NURSE,
  UserRole.GYNECOLOGIST,
  UserRole.HOSPITAL_DIRECTOR,
  UserRole.LAB_TECHNICIAN,
  UserRole.COMMUNITY_HEALTH_WORKER,
];

@ApiTags('Facilities')
@Controller('facilities')
export class FacilitiesController {
  constructor(private readonly facilitiesService: FacilitiesService) {}

  @Get()
  @Roles(...ALL_ROLES)
  @ApiOperation({
    summary:
      'List facilities (id, name, type, district, capacity, latitude, longitude). ' +
      'Optional excludePrimary=true filters out low-level facilities; ' +
      'optional nearFacilityId=<id> adds distanceKm and sorts nearest-first.',
  })
  findAll(
    @Query('excludePrimary') excludePrimary?: string,
    @Query('nearFacilityId') nearFacilityId?: string,
  ) {
    return this.facilitiesService.findAll({
      excludePrimary: excludePrimary === 'true',
      nearFacilityId,
    });
  }

  @Patch('capacity')
  @Roles(UserRole.HOSPITAL_DIRECTOR)
  @ApiOperation({
    summary:
      "Update the current user's own facility's max emergency-case capacity",
  })
  updateCapacity(
    @Body() dto: UpdateCapacityDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.facilitiesService.updateCapacity(user.facilityId!, dto);
  }
}
```

- [ ] **Step 4: Verify it compiles**

Run: `cd /home/ebenezer/Projects/ubuntu/Antenatal-api && npx tsc --noEmit -p .`
Expected: no output.

- [ ] **Step 5: Restart the dev server and live-verify with curl**

Ensure `nest start --watch` is running (kill and restart in the background if it's a stale one-shot process — check with `ps aux | grep "nest start"`). The dev server listens on the port from `.env`'s `PORT` (currently `4000`), with global prefix `/api`.

```bash
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d '{"email":"uwase@ubuntumed.rw","password":"nurse123"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['accessToken'])")

# 1. Unfiltered — unchanged shape, includes latitude/longitude now
curl -s http://localhost:4000/api/facilities -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -20

# 2. excludePrimary=true — Kabusunzu Health Centre (PRIMARY) and
#    Kigali Health Center (HEALTH_CENTER) must NOT appear
curl -s "http://localhost:4000/api/facilities?excludePrimary=true" -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys,json
rows=json.load(sys.stdin)
names=[r['name'] for r in rows]
assert 'Kabusunzu Health Centre' not in names, 'PRIMARY facility leaked through'
assert 'Kigali Health Center' not in names, 'HEALTH_CENTER facility leaked through'
print(f'{len(rows)} facilities, correctly excludes low-level:', names)
"

# 3. excludePrimary + nearFacilityId=Kabusunzu's id — distanceKm present,
#    ascending, nearest capable facility first
KABUSUNZU_ID=$(curl -s http://localhost:4000/api/facilities -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys,json
rows=json.load(sys.stdin)
print([r['id'] for r in rows if r['name']=='Kabusunzu Health Centre'][0])
")
curl -s "http://localhost:4000/api/facilities?excludePrimary=true&nearFacilityId=$KABUSUNZU_ID" -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys,json
rows=json.load(sys.stdin)
dists=[r['distanceKm'] for r in rows]
assert dists == sorted(dists), 'not sorted ascending by distance'
assert all(d is not None for d in dists), 'expected all distances present (all facilities have coords)'
for r in rows[:3]:
    print(r['name'], round(r['distanceKm'], 1), 'km')
"
```

Expected: script 2 prints the facility count and confirms neither excluded facility is present; script 3 prints the 3 nearest capable facilities to Kabusunzu with plausible (double-digit-to-low-hundreds) km values, in ascending order, with no assertion errors.

- [ ] **Step 6: Commit**

```bash
cd /home/ebenezer/Projects/ubuntu/Antenatal-api
git add src/shared/utils/geo.ts src/modules/facilities/facilities.service.ts src/modules/facilities/facilities.controller.ts
git commit -m "$(cat <<'EOF'
feat: add distance + capability filtering to GET /facilities

New optional query params: excludePrimary=true filters out low-level
(PRIMARY/HEALTH_CENTER) facilities; nearFacilityId=<id> adds a
distanceKm field (Haversine, straight-line) and sorts nearest-first.
Enables the referral modal to suggest the nearest emergency-capable
facility instead of an unsorted, unfiltered list.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Frontend — referral modal uses real, distance-sorted facilities

**Files:**
- Modify: `ubuntumed/src/lib/auth/auth-context.tsx` (add `facilityId` to `AuthenticatedUser`)
- Modify: `ubuntumed/src/lib/patients/referral-api.ts` (`BackendFacility` gains `distanceKm`; `createReferralApi` signature change)
- Modify: `ubuntumed/src/lib/patients/use-patients.ts` (2 call sites of `createReferralApi`)
- Modify: `ubuntumed/src/components/patients/create-referral-modal.tsx`
- Modify: `ubuntumed/src/components/dashboard/close-referral-modal.tsx` (mechanical fix only — its own dropdown/UX is unchanged, see Step 6b)

**Interfaces:**
- Consumes: `GET /facilities?excludePrimary=true&nearFacilityId=<id>` from Task 2, returning `{ id, name, type, district, capacity, latitude, longitude, distanceKm }[]`.
- Produces: `createReferralApi(pregnancyId: string, toFacilityId: string, reason: string, urgency: Referral["urgency"]): Promise<Referral>` — signature changes from taking a facility **name** to taking a facility **id** directly (no internal name-matching lookup anymore).

- [ ] **Step 1: Add `facilityId` to the auth context**

Open `ubuntumed/src/lib/auth/auth-context.tsx`. In the `AuthenticatedUser` interface (around line 16), add `facilityId: string` after `facility: string`:

```ts
export interface AuthenticatedUser {
  id: string;
  username: string;
  name: string;
  title: string;
  facility: string;
  facilityId: string;
  facilityLevel: FacilityLevel;
  role: Role;
}
```

In `login()`, where `authUser` is built (around line 117), add the field:

```ts
      const authUser: AuthenticatedUser = {
        id: response.user.id,
        username: response.user.email.split("@")[0],
        name: `${response.user.firstName} ${response.user.lastName}`,
        title: titleForRole(role),
        facility: response.user.facility?.name ?? "",
        facilityId: response.user.facility?.id ?? "",
        facilityLevel: mapBackendFacilityLevel(response.user.facility?.type ?? "PRIMARY"),
        role,
      };
```

(`response.user.facility.id` already exists in the login response type declared a few lines above — only the field being read into `authUser` is new.)

- [ ] **Step 2: Verify it compiles**

Run: `cd /home/ebenezer/Projects/ubuntu/ubuntumed && npx tsc --noEmit`
Expected: no errors mentioning `auth-context.tsx` (other pre-existing errors, if any, are unrelated — check output is empty or unchanged from before this step).

- [ ] **Step 3: Update `referral-api.ts`**

Open `ubuntumed/src/lib/patients/referral-api.ts`.

Replace the `BackendFacility` interface (lines 5-11) with:

```ts
export interface BackendFacility {
  id: string;
  name: string;
  type: string;
  district: string;
  capacity: number | null;
  latitude: number | null;
  longitude: number | null;
  distanceKm?: number | null;
}
```

Replace `fetchFacilities` (around line 104-107) to accept optional filter params:

```ts
export async function fetchFacilities(opts: { excludePrimary?: boolean; nearFacilityId?: string } = {}): Promise<BackendFacility[]> {
  const token = getStoredAccessToken();
  const params = new URLSearchParams();
  if (opts.excludePrimary) params.set("excludePrimary", "true");
  if (opts.nearFacilityId) params.set("nearFacilityId", opts.nearFacilityId);
  const qs = params.toString();
  return apiFetch<BackendFacility[]>(`/facilities${qs ? `?${qs}` : ""}`, { token: token ?? undefined });
}
```

Replace `createReferralApi` (around line 118-141) — it no longer does its own name lookup, it takes an id directly:

```ts
export async function createReferralApi(
  pregnancyId: string,
  toFacilityId: string,
  reason: string,
  urgency: Referral["urgency"],
): Promise<Referral> {
  const token = getStoredAccessToken();
  const r = await apiFetch<BackendReferral>("/referrals", {
    method: "POST",
    body: {
      pregnancyId,
      toFacilityId,
      reason,
      urgency: URGENCY_TO_BACKEND[urgency],
    },
    token: token ?? undefined,
  });
  return toFrontendReferral(r);
}
```

- [ ] **Step 4: Update the two call sites of `createReferralApi` in `use-patients.ts`**

Open `ubuntumed/src/lib/patients/use-patients.ts`. `fetchFacilities` is already imported from `./referral-api` in this file (next to `createReferralApi`) — no new import needed, just start passing it a resolved id.

Replace this block (lines 707-718):

```ts
  const { facility, facilityLevel } = getCurrentUserSnapshot();
  // A health center always escalates up. Anything already at district-hospital
  // level or above already has the capability to manage an obstetric
  // emergency, so it self-accepts immediately instead of sitting pending. The
  // backend has no self-accept shortcut, so this is two real calls (create,
  // then accept) rather than one local object construction — same net
  // visible result (a referral that's already "accepted" by its own
  // creating facility).
  const canHandleLocally = facilityLevel !== "hc";
  const toFacilityName = canHandleLocally ? facility : (REFERRAL_ROUTING[facility] ?? DEFAULT_RECEIVING_FACILITY);

  let referral = await createReferralApi(openPregnancy.id, toFacilityName, reason, "emergency");
```

with:

```ts
  const { facility, facilityLevel } = getCurrentUserSnapshot();
  // A health center always escalates up. Anything already at district-hospital
  // level or above already has the capability to manage an obstetric
  // emergency, so it self-accepts immediately instead of sitting pending. The
  // backend has no self-accept shortcut, so this is two real calls (create,
  // then accept) rather than one local object construction — same net
  // visible result (a referral that's already "accepted" by its own
  // creating facility).
  const canHandleLocally = facilityLevel !== "hc";
  const toFacilityName = canHandleLocally ? facility : (REFERRAL_ROUTING[facility] ?? DEFAULT_RECEIVING_FACILITY);
  const toFacility = (await fetchFacilities()).find((f) => f.name === toFacilityName);
  if (!toFacility) {
    throw new Error(`Unknown receiving facility: ${toFacilityName}`);
  }

  let referral = await createReferralApi(openPregnancy.id, toFacility.id, reason, "emergency");
```

Then replace the `createReferral` function (lines 761-784):

```ts
export async function createReferral(data: {
  patientId: string;
  receivingFacility: string;
  reason: string;
  urgency: "routine" | "urgent" | "emergency";
}): Promise<Referral> {
  if (data.urgency === "emergency") {
    // A patient can only have one active red case at a time.
    const existing = (await fetchReferrals()).find(
      (r) =>
        r.patientId === data.patientId &&
        r.urgency === "emergency" &&
        (r.status === "pending" || r.status === "accepted"),
    );
    if (existing) return existing;
  }
  const openPregnancy = (await fetchPregnanciesForPatient(data.patientId)).find((p) => p.status === "open");
  if (!openPregnancy) {
    throw new Error("Cannot create a referral: patient has no open pregnancy");
  }
  const referral = await createReferralApi(openPregnancy.id, data.receivingFacility, data.reason, data.urgency);
  await queryClient.invalidateQueries({ queryKey: ["referrals"] });
  return referral;
}
```

with:

```ts
export async function createReferral(data: {
  patientId: string;
  receivingFacilityId: string;
  reason: string;
  urgency: "routine" | "urgent" | "emergency";
}): Promise<Referral> {
  if (data.urgency === "emergency") {
    // A patient can only have one active red case at a time.
    const existing = (await fetchReferrals()).find(
      (r) =>
        r.patientId === data.patientId &&
        r.urgency === "emergency" &&
        (r.status === "pending" || r.status === "accepted"),
    );
    if (existing) return existing;
  }
  const openPregnancy = (await fetchPregnanciesForPatient(data.patientId)).find((p) => p.status === "open");
  if (!openPregnancy) {
    throw new Error("Cannot create a referral: patient has no open pregnancy");
  }
  const referral = await createReferralApi(openPregnancy.id, data.receivingFacilityId, data.reason, data.urgency);
  await queryClient.invalidateQueries({ queryKey: ["referrals"] });
  return referral;
}
```

- [ ] **Step 5: Verify it compiles**

Run: `cd /home/ebenezer/Projects/ubuntu/ubuntumed && npx tsc --noEmit`
Expected: errors (if any) now point only at `create-referral-modal.tsx` (not yet updated) — confirms the type change propagated correctly from `referral-api.ts` through `use-patients.ts`.

- [ ] **Step 6: Update `create-referral-modal.tsx`**

Open `ubuntumed/src/components/patients/create-referral-modal.tsx`. Note:
`close-referral-modal.tsx` imports `RECEIVING_FACILITIES` from this file
for its own separate "Refer to" dropdown (its own onward-referral flow,
not part of this task's scope) — keep that constant exported even though
this file no longer uses it internally, so that other file keeps
compiling. Replace the whole file with:

```tsx
"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { createReferral } from "@/lib/patients/use-patients";
import { fetchFacilities, type BackendFacility } from "@/lib/patients/referral-api";
import { useAuth } from "@/lib/auth/auth-context";
import { IconClose } from "@/components/dashboard/icons";
import { RiskBadge } from "@/components/patients/risk-badge";
import { fullName } from "@/lib/format";
import type { Patient, RiskLevel } from "@/lib/patients/types";

// Kept for close-referral-modal.tsx's separate onward-referral dropdown —
// this file's own dropdown below uses live, distance-sorted facilities
// instead.
export const RECEIVING_FACILITIES = [
  "Nyanza District Hospital",
  "CHB",
  "King Faisal Hospital",
  "Rwanda Military Hospital",
  "Butaro District Hospital",
  "Kibagabaga District Hospital",
  "Muhima District Hospital",
  "Rwamagana Provincial Hospital",
  "Kabgayi District Hospital",
];

const URGENCY_LABELS: Record<string, string> = {
  routine: "Routine",
  urgent: "Urgent",
  emergency: "Emergency",
};

export function CreateReferralModal({
  patient,
  currentRisk,
  clinicalSummary,
  onClose,
  onCreated,
}: {
  patient: Patient;
  currentRisk: RiskLevel;
  clinicalSummary: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { user } = useAuth();
  const [facilities, setFacilities] = useState<BackendFacility[]>([]);
  const [facilitiesError, setFacilitiesError] = useState<string | null>(null);
  const [receivingFacilityId, setReceivingFacilityId] = useState("");
  const [reason, setReason] = useState("");
  const [urgency, setUrgency] = useState<"routine" | "urgent" | "emergency">("urgent");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    fetchFacilities({ excludePrimary: true, nearFacilityId: user?.facilityId })
      .then((result) => {
        if (!cancelled) setFacilities(result);
      })
      .catch(() => {
        if (!cancelled) setFacilitiesError("Could not load facilities. Please try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [user?.facilityId]);

  async function handleSubmit() {
    if (isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await createReferral({
        patientId: patient.id,
        receivingFacilityId,
        reason: reason.trim(),
        urgency,
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create referral. Please try again.");
      setIsSubmitting(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
      />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-300 bg-[#ffeedb] p-6 shadow-2xl dark:border-zinc-700 dark:bg-orange-950/40">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            Create Referral
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-xl border border-zinc-300 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-zinc-900 dark:text-zinc-50">{fullName(patient)}</p>
            <p className="text-xs text-zinc-500">{patient.registrationFacility}</p>
          </div>
          <RiskBadge level={currentRisk} size="sm" />
        </div>

        <div className="mt-4 flex flex-col gap-4 rounded-xl border border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Receiving facility
            <select
              required
              value={receivingFacilityId}
              onChange={(e) => setReceivingFacilityId(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            >
              <option value="">Select facility…</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                  {f.distanceKm != null ? ` — ${f.distanceKm.toFixed(0)} km` : " — distance unknown"}
                </option>
              ))}
            </select>
            {facilitiesError && (
              <span className="text-xs text-red-600 dark:text-red-400">{facilitiesError}</span>
            )}
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Urgency
            <div className="flex gap-2">
              {(["routine", "urgent", "emergency"] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUrgency(u)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    urgency === u
                      ? u === "emergency"
                        ? "border-red-500 bg-red-50 text-red-700"
                        : u === "urgent"
                          ? "border-orange-400 bg-orange-50 text-orange-700"
                          : "border-teal-500 bg-teal-50 text-teal-700"
                      : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                  }`}
                >
                  {URGENCY_LABELS[u]}
                </button>
              ))}
            </div>
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Reason for referral
            <textarea
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Severe preeclampsia requiring specialist management…"
              className="resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>

          {clinicalSummary && (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Clinical summary (pre-filled)
              </p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{clinicalSummary}</p>
            </div>
          )}

          {error && (
            <p className="rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!receivingFacilityId || !reason.trim() || isSubmitting}
              onClick={handleSubmit}
              className="rounded-xl bg-[#0f766e] px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Creating…" : "Create Referral"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
```

- [ ] **Step 6b: Fix `close-referral-modal.tsx`'s call to `createReferral`**

This file's own "Refer to" dropdown still uses the unchanged `RECEIVING_FACILITIES` name list (out of scope to redesign here) and stores the selection as `nextFacility`, a facility **name**. Its call to `createReferral` needs to resolve that name to an id first, since `createReferral`'s parameter is now `receivingFacilityId`. Open `ubuntumed/src/components/dashboard/close-referral-modal.tsx` and replace:

```ts
import { closeReferral, createReferral } from "@/lib/patients/use-patients";
```

with:

```ts
import { closeReferral, createReferral } from "@/lib/patients/use-patients";
import { fetchFacilities } from "@/lib/patients/referral-api";
```

Then replace the `handleSubmit` body's referral-creation block:

```ts
      await closeReferral(referral.id, { outcome, outcomeStatement, riskLevel });
      if (isReferringOnward && nextFacility) {
        await createReferral({
          patientId: referral.patientId,
          receivingFacility: nextFacility,
          reason: outcomeStatement.trim() || "Condition did not improve — escalating to a higher-level facility.",
          urgency: "emergency",
        });
      }
```

with:

```ts
      await closeReferral(referral.id, { outcome, outcomeStatement, riskLevel });
      if (isReferringOnward && nextFacility) {
        const facility = (await fetchFacilities()).find((f) => f.name === nextFacility);
        if (!facility) {
          throw new Error(`Unknown receiving facility: ${nextFacility}`);
        }
        await createReferral({
          patientId: referral.patientId,
          receivingFacilityId: facility.id,
          reason: outcomeStatement.trim() || "Condition did not improve — escalating to a higher-level facility.",
          urgency: "emergency",
        });
      }
```

- [ ] **Step 7: Verify it compiles, lints, and builds**

```bash
cd /home/ebenezer/Projects/ubuntu/ubuntumed
npx tsc --noEmit
pnpm lint
pnpm build
```
Expected: `tsc` clean; `lint` shows only the pre-existing unrelated `computeEdd` warning; `build` completes and lists all routes.

- [ ] **Step 8: Manual walkthrough**

With the frontend dev server and backend both running: log in as `uwase@ubuntumed.rw` / `nurse123` (Kabusunzu Health Centre), open a patient with an active pregnancy, open the create-referral modal, and confirm: the "Receiving facility" dropdown contains only district/high-level facilities (no Kabusunzu, no Kigali Health Center), each option shows a `— N km` distance, and the list is ordered nearest-first. Create a referral and confirm it succeeds (no "Unknown receiving facility" error) and appears correctly on the receiving facility's side.

- [ ] **Step 9: Commit**

```bash
cd /home/ebenezer/Projects/ubuntu/ubuntumed
git add src/lib/auth/auth-context.tsx src/lib/patients/referral-api.ts src/lib/patients/use-patients.ts src/components/patients/create-referral-modal.tsx src/components/dashboard/close-referral-modal.tsx
git commit -m "$(cat <<'EOF'
feat: referral modal shows real, distance-sorted, capability-filtered facilities

Replaces the hardcoded facility-name dropdown with a live fetch from
GET /facilities?excludePrimary=true&nearFacilityId=<current facility>,
showing each option's distance and excluding low-level facilities.
createReferralApi now takes a facility id directly instead of doing
its own fragile name-matching lookup.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
