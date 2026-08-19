# Geography-Aware Emergency Referral Routing — Design

## Goal

When a nurse creates a referral, the receiving-facility list should exclude
low-level (non-emergency-capable) facilities and be sorted by real distance
from the sending facility, so the nearest capable facility is easiest to
pick. This supersedes the "no geo data exists in this app" limitation noted
in `2026-07-15-capacity-aware-referrals-design.md` — real backend `Facility`
rows with coordinates now make distance-based sorting possible.

Pickup location = the sending facility's location (the patient is already
being treated there when a referral is created — no ambulance/field-pickup
model is being introduced).

## Out of scope

- No live healthsites.io calls at request time. Coordinates for the ~10
  existing seeded facilities are looked up once and hardcoded into
  `seed.ts`; the API key is not stored anywhere in the running app.
- No dynamic/live facility catalog beyond the existing seeded set — not
  pulling arbitrary facilities from healthsites.io into the app.
- No patient GPS or CHW/field pickup location — out of scope per the
  approved design conversation (sending facility only).
- No admin-boundary (province/district/sector) spatial join — not needed
  since routing is a straight-line facility-to-facility distance, not a
  region lookup.
- No changes to the `Referral` or `Pregnancy` Prisma models.
- No change to `Facility.type` representation (stays a free string;
  filtering is a simple `type !== "PRIMARY"` check).
- Reconciling the older client-side mock `FACILITY_CAPACITY`/
  `REFERRAL_ROUTING` constants in `use-patients.ts` with the real backend
  `Facility.capacity` — untouched by this slice.

## Data: facility coordinates

`Facility.latitude`/`Facility.longitude` (`Float?`) already exist in the
schema but are `null` for every seeded facility. Each of the ~10 seeded
facilities (Kabusunzu Health Centre, Bugesera District Hospital, Nyanza
District Hospital, CHB, King Faisal Hospital [pre-existing `RH-001` row],
Rwanda Military Hospital, Butaro/Kibagabaga/Muhima/Kabgayi District
Hospitals) gets looked up once on healthsites.io — searched by the exact
facility name already on file in our own `Facility` table (e.g. searching
"Kabusunzu Health Centre", not a variant spelling), so the matched OSM
record actually corresponds to our row and not a same-named or
similarly-named facility elsewhere. If a given name isn't found on
healthsites.io, fall back to a reliable public source (e.g. Google Maps
coordinates for that named facility) rather than guessing. The resulting
lat/lng is hardcoded directly into the corresponding `facility.upsert` call in
`prisma/seed.ts`. The live DB rows are updated in place with the same
values (same pattern as the recent facility-rename work — `UPDATE
facilities SET latitude = ..., longitude = ... WHERE code = ...`), so
existing referrals/relations stay linked.

## Backend: distance + capability filtering

Extend `GET /facilities` rather than adding a new endpoint:

```ts
// facilities.controller.ts
@Get()
findAll(
  @Query('excludePrimary') excludePrimary?: string,
  @Query('nearFacilityId') nearFacilityId?: string,
) {
  return this.facilitiesService.findAll({
    excludePrimary: excludePrimary === 'true',
    nearFacilityId,
  });
}
```

```ts
// facilities.service.ts
async findAll(opts: { excludePrimary?: boolean; nearFacilityId?: string } = {}) {
  const where = opts.excludePrimary ? { type: { not: 'PRIMARY' } } : {};
  const facilities = await this.prisma.facility.findMany({
    where,
    select: { id: true, name: true, type: true, district: true, capacity: true, latitude: true, longitude: true },
    orderBy: { name: 'asc' },
  });

  if (!opts.nearFacilityId) return facilities;

  const origin = facilities.find((f) => f.id === opts.nearFacilityId)
    ?? await this.prisma.facility.findUnique({ where: { id: opts.nearFacilityId }, select: { latitude: true, longitude: true } });
  if (!origin?.latitude || !origin?.longitude) {
    return facilities; // origin has no coordinates — can't compute distance, return unsorted
  }

  return facilities
    .map((f) => ({
      ...f,
      distanceKm: f.latitude != null && f.longitude != null
        ? haversineKm(origin.latitude!, origin.longitude!, f.latitude, f.longitude)
        : null,
    }))
    .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
}
```

New utility `src/shared/utils/geo.ts`:

```ts
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
```

`distanceKm` is only present in the response when `nearFacilityId` is
passed; the existing unfiltered/unsorted shape is unchanged when called
with no params (so any other current caller of `GET /facilities` is
unaffected).

## Frontend: referral modal

`create-referral-modal.tsx`:

- Replace the hardcoded `RECEIVING_FACILITIES` name array with a fetch of
  `GET /facilities?excludePrimary=true&nearFacilityId=<currentUser.facilityId>`
  on modal open, into local state (`facilities: {id, name, distanceKm}[]`).
- `receivingFacility` state changes from a name `string` to a facility `id`
  string.
- Each `<option>` renders `"{name} — {distanceKm.toFixed(0)} km"`, or
  `"{name} — distance unknown"` when `distanceKm` is `null`. Order follows
  the array as returned by the backend (already nearest-first).
- `createReferralApi` signature changes from `(pregnancyId, toFacilityName, reason, urgency)`
  to `(pregnancyId, toFacilityId, reason, urgency)` — it currently does its
  own `fetchFacilities()` + name-matching lookup to resolve a name to an id;
  that lookup is deleted since the modal now already has the id.
- `currentUser.facilityId` comes from the existing auth context (same
  source `JwtPayload.facilityId` is read from elsewhere in the backend;
  frontend auth context already exposes the logged-in user's facility).

## Testing

`npx tsc --noEmit` (both repos), `pnpm lint`, `pnpm build` (ubuntumed).
Live curl verification of `GET /facilities?excludePrimary=true` (confirms
PRIMARY facilities excluded) and `GET /facilities?excludePrimary=true&nearFacilityId=<id>`
(confirms `distanceKm` present, ascending, and low-level facilities
excluded) using a real nurse JWT. Manual walkthrough: open the referral
modal as a nurse at a facility with known coordinates, confirm the
dropdown shows only district/high-level facilities sorted nearest-first
with plausible km values, create a referral, and confirm it persists with
the correct `toFacilityId`.
