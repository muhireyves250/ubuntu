 # Auth & Roles Foundation — Design

## Context

`ubuntumed` is a frontend-only Next.js implementation of RBC/MNCDA's Digital
Tracking System for high-risk pregnancies and deliveries in Rwanda (see
project PDFs: color-code categorization of red/orange/yellow/green risk
levels, and role-based notification matrix across Health Center, District
Hospital, Teaching Hospital, and Central levels).

This is the first slice: a role-aware login and dashboard shell, with no
backend, no real patient data, and no real notifications. It establishes the
auth/role scaffolding that later slices (patient registration, classification
engine, notifications, dashboards with real data) will build on.

## Goals

- Mock login against a hardcoded set of demo users, one per representative
  role.
- Persist the logged-in session across page reloads (frontend-only, via
  `localStorage`).
- Role-gated routing: each role lands on its own dashboard route; visiting
  another role's route without permission redirects away.
- A role-switcher for quickly demoing other dashboards without re-entering
  credentials.
- Placeholder dashboard shells per facility level, including the static
  color-code legend from the spec.

## Non-goals

- No real backend, API, or database — everything is hardcoded/in-memory plus
  `localStorage`.
- No real password security (plaintext demo passwords are fine).
- No real patient data, classification logic, or SMS/email notifications —
  those are separate future slices.
- No exhaustive role list — only a representative set (see below).

## Roles

```ts
type Role =
  | "nurse"               // in charge of ANC; consults mothers, registers visits
  | "hc_head"             // Head of Health Center
  | "dh_clinical_director"// District Hospital clinical director
  | "th_gynecologist"     // Teaching Hospital gynecologist on call
  | "central_control"     // Central level server/control room
  | "admin";              // can view all dashboards

type FacilityLevel = "hc" | "dh" | "th" | "central";
```

| Role | Facility level | Notes |
|---|---|---|
| `nurse` | hc | Front-line clinical role; future home of patient/visit registration (F.6/F.7) |
| `hc_head` | hc | Receives red/orange/yellow notifications per spec |
| `dh_clinical_director` | dh | Receives red/orange/yellow notifications per spec |
| `th_gynecologist` | th | Receives red-case SMS + dashboard access per spec |
| `central_control` | central | Dashboard-only access per spec |
| `admin` | — | Can view all dashboards; not in the spec's notification matrix, included for future role management (G.8) |

## Data model

```ts
interface DemoUser {
  id: string;
  name: string;        // e.g. "Nurse Uwase — Nyamata Health Center"
  role: Role;
  facilityLevel: FacilityLevel;
  password: string;    // fixed plaintext string, demo only
}
```

- `src/lib/auth/demo-users.ts` — hardcoded array of one `DemoUser` per role
  above (6 total).
- `src/lib/auth/auth-context.tsx` — `AuthProvider` + `useAuth()` hook exposing:
  - `user: DemoUser | null`
  - `login(userId: string, password: string): boolean`
  - `logout(): void`
  - `switchRole(role: Role): void` — swaps to the demo user with that role;
    only callable while already logged in (no password re-entry)
  - Session persists as `{ userId }` under `localStorage` key
    `ubuntumed.session`; hydrated on mount.

## Login screen

Split-pane layout (per reference mockup, re-themed for this project):

- **Left panel**: branding/hero area for ubuntumed (maternal health imagery,
  logo, headline/subtext), with a tab-style role selector for the three most
  frequently used roles: **Nurse / HC Head / DH**.
- **Right panel**: login form — a "Demo User" dropdown (scoped to the tab's
  facility level) instead of a free-text email field, password field with
  show/hide toggle (validated against the fixed demo password), primary CTA
  button ("Log In").
- **Top-right "Login Options" dropdown**: holds the less common roles —
  **Teaching Hospital**, **Central**, **Admin**.
- No "Forgot Password" or network-throttle UI — not applicable to a
  frontend-only demo with hardcoded users.

## Routing & dashboard shells

- `src/app/login/page.tsx` — the login screen described above.
- `src/app/dashboard/layout.tsx` — client-side guard: if `useAuth().user` is
  null, redirect to `/login`. Renders a shared header (user name/role,
  role-switcher dropdown, logout button) plus `{children}`.
- One route per facility-level dashboard, each a placeholder shell with a
  title, the logged-in user's name/facility, and the static color-code
  legend (red/orange/yellow/green definitions from the spec):
  - `src/app/dashboard/nurse/page.tsx`
  - `src/app/dashboard/hc/page.tsx`
  - `src/app/dashboard/dh/page.tsx`
  - `src/app/dashboard/th/page.tsx`
  - `src/app/dashboard/central/page.tsx`
- Each route checks that the logged-in role matches (or role is `admin`,
  which may view any); otherwise redirects to the route matching the user's
  own role.
- Visiting `/dashboard` directly (no sub-path) redirects to the route
  matching the logged-in user's role.

## Out of scope for this slice (future work)

- Patient registration and visit signs/symptoms entry (F.6/F.7).
- Automatic red/orange/yellow/green classification engine (F.8).
- SMS/email notification generation (F.9).
- Real per-facility dashboards with live data (F.12).
- Full role list from the spec's notification matrix (matron of maternity,
  DG, director of nursing/midwifery, data manager/M&E, doctor on call, head
  of Gyn & Obs department, director of medical services, Community and
  Environmental officer).
