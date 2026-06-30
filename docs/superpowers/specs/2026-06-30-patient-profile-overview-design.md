# Patient Profile Overview — Design Spec

**Issue:** #14 — feat: build patient profile page

## What We're Building

A new **Overview** tab that becomes the default landing tab on the patient detail page (`/dashboard/nurse/patients/[id]`), a **red alert banner** for high-risk patients, and **skeleton loaders** that show a brief loading state before content renders.

The existing route, hooks, and tab shell are already in place. This spec covers only the delta.

---

## Route

`/dashboard/nurse/patients/[id]` — existing page, no new routes.

---

## Red Alert Banner

Displayed **above** the patient ID/actions header row when `currentRisk === "red"`.

Content:
```
⚠ HIGH RISK — This patient is currently classified Red. Immediate review recommended.
```

Styling: red background, white text, full width of the content column, rounded-xl, px-4 py-3.

Rendered unconditionally when risk is red; hidden otherwise.

---

## Tabs

New tab order:

```
Overview | Patient Details | Signs & Symptoms | New Assessment | Pregnancy | Classification | Visit History
```

`"Overview"` is the new default first tab. All other tabs remain unchanged.

---

## Overview Tab — Sections

### 1. Risk Card

- `RiskBadge` at size `"lg"` centered in a card
- Below: `"Last assessed: {date}"` or `"No assessments yet"` in muted text
- Full-width card

### 2. Demographics Card

Two-column grid:

| Field | Source |
|---|---|
| Full name | `patient.name` |
| Age | `patient.age` years |
| Gestational age | `gestationalAgeWeeks(pregnancy.lmpDate)` if active pregnancy, else `patient.gestationalAgeWeeks` weeks |
| Facility | `patient.facility` |
| Registered | `patient.registeredAt` |

### 3. Active Pregnancy Card

If `pregnancy` exists (status `"active"`):
- GA in weeks (computed from LMP, same as gestational age header)
- EDD (`pregnancy.eddDate`, formatted as readable date e.g. `"15 Sep 2026"`)
- Gravidity / Parity: `G{gravidity} P{parity}`
- ANC visits: count of `ancVisits` for this pregnancy, shown as `"{n} visit{s} recorded"`

If no active pregnancy:
- Empty state: "No active pregnancy on record."

### 4. Latest Assessment Card

If `visits.length > 0` (visits sorted latest-first):
- Date of latest visit
- `RiskBadge` size `"sm"` for that visit's risk
- Top 3 flagged symptoms by label (from `SYMPTOM_CHECKLIST`), comma-separated; or "None" if `symptomIds` is empty
- Labs summary line from `formatLabs(visit)`, or `"—"` if no labs

If no visits:
- Empty state: "No assessments recorded yet."

### 5. Quick Actions Row

Three buttons in a horizontal row:

| Button | Action | State |
|---|---|---|
| New Assessment | `setActiveTab("New Assessment")` | enabled |
| View History | `setActiveTab("Visit History")` | enabled |
| New Referral | no-op | disabled, title="Coming soon" |

Buttons use the bordered secondary style (matches the existing Actions/View buttons in the header).

---

## Skeleton Loaders

On first render the Overview tab shows skeleton cards (grey animated pulses) for 300 ms before displaying real content. This is a purely cosmetic `useEffect`-driven delay — all data is already available synchronously from localStorage.

**Skeleton structure:** one skeleton block per section (risk card, demographics, pregnancy, assessment, actions), same height as the real content.

---

## Files

### Created

- `src/components/patients/profile-overview-tab.tsx`
  - `ProfileOverviewTab({ patient, visits, pregnancy, ancVisits, onAction })`
  - `onAction: (tab: Tab) => void` — callback to switch the active tab
  - Owns the 300ms skeleton state internally

### Modified

- `src/app/dashboard/nurse/patients/[id]/page.tsx`
  - Add `"Overview"` as first item in `TABS`
  - Add red alert banner above the ID header when `currentRisk === "red"`
  - Import and render `<ProfileOverviewTab>` for `activeTab === "Overview"`
  - Default `activeTab` to `"Overview"`
  - Wire `useAncVisitsForPregnancy` for the pregnancy card

---

## Non-Goals

- No new routes
- No new data stores or hooks
- No actual referral creation (stub only)
- No server-side data fetching — localStorage only
