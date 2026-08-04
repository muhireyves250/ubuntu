import type { Pregnancy, Visit } from "./types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function computeEdd(lmpDate: string): string {
  const lmp = new Date(`${lmpDate}T00:00:00`);
  const edd = new Date(lmp.getTime() + 280 * MS_PER_DAY);
  return edd.toISOString().slice(0, 10);
}

export function gestationalAgeWeeks(lmpDate: string, asOf?: string): number {
  const lmp = new Date(`${lmpDate}T00:00:00`);
  const reference = asOf ? new Date(`${asOf}T00:00:00`) : new Date();
  const diffDays = (reference.getTime() - lmp.getTime()) / MS_PER_DAY;
  return Math.max(0, Math.floor(diffDays / 7));
}

// pregnancy.lmpDate is "" whenever the backend's nullable lmp field is
// null — a common, legitimate data state (LMP unknown, EDD estimated by
// ultrasound instead). EDD is always required, so it's the reliable
// fallback: derive an effective LMP by walking the same 280-day gestation
// window computeEdd() uses, in reverse. Every gestational-age calculation
// in this file and its callers must go through this instead of reading
// pregnancy.lmpDate directly — otherwise gestationalAgeWeeks() silently
// returns NaN for any pregnancy recorded from EDD only, which cascades
// into every "current week" / "missed" / "due" comparison downstream.
export function effectiveLmpDate(pregnancy: Pregnancy): string {
  const lmp = new Date(`${pregnancy.lmpDate}T00:00:00`);
  if (!isNaN(lmp.getTime())) return pregnancy.lmpDate;
  const edd = new Date(`${pregnancy.eddDate}T00:00:00`);
  if (isNaN(edd.getTime())) return "";
  return new Date(edd.getTime() - 280 * MS_PER_DAY).toISOString().slice(0, 10);
}

export const ANC_SCHEDULE: { visitNumber: number; dueByWeek: number }[] = [
  { visitNumber: 1, dueByWeek: 8 },
  { visitNumber: 2, dueByWeek: 12 },
  { visitNumber: 3, dueByWeek: 16 },
  { visitNumber: 4, dueByWeek: 20 },
  { visitNumber: 5, dueByWeek: 24 },
  { visitNumber: 6, dueByWeek: 28 },
  { visitNumber: 7, dueByWeek: 32 },
  { visitNumber: 8, dueByWeek: 36 },
  { visitNumber: 9, dueByWeek: 38 },
  { visitNumber: 10, dueByWeek: 40 },
];

export interface Milestone {
  id: string;
  visitNumber: number;
  dueByWeek: number;
  overdue: boolean;
}

export function deriveMilestones(
  pregnancy: Pregnancy,
  visits: Visit[],
  asOf?: string,
): Milestone[] {
  const loggedCount = visits.filter((v) => v.type !== "emergency").length;
  const currentWeeks = gestationalAgeWeeks(effectiveLmpDate(pregnancy), asOf);

  return ANC_SCHEDULE.filter(
    (scheduled) => scheduled.visitNumber > loggedCount,
  ).map((scheduled) => ({
    id: `milestone-${pregnancy.id}-${scheduled.visitNumber}`,
    visitNumber: scheduled.visitNumber,
    dueByWeek: scheduled.dueByWeek,
    overdue: currentWeeks > scheduled.dueByWeek,
  }));
}

// Both of these follow the real calendar date (via ancCalendar, defined
// below) rather than the gestational week number — week granularity rounds
// down, so a visit a few days past its due date can still land on "the
// current week" and read as merely due instead of overdue/missed.
export function nextDueVisit(
  pregnancy: Pregnancy,
  visits: Visit[],
  asOf?: string,
): { week: number; overdue: boolean } | null {
  const today = asOf ?? new Date().toISOString().slice(0, 10);
  const loggedWeeks = new Set(
    visits
      .filter((v) => v.type !== "emergency" && v.scheduledWeek != null)
      .map((v) => v.scheduledWeek as number),
  );
  const next = ancCalendar(pregnancy).find((s) => !loggedWeeks.has(s.dueByWeek));
  if (!next) return null;
  return { week: next.dueByWeek, overdue: next.dueDate < today };
}

export function missedVisits(pregnancy: Pregnancy, visits: Visit[], asOf?: string): number[] {
  const today = asOf ?? new Date().toISOString().slice(0, 10);
  const loggedWeeks = new Set(
    visits
      .filter((v) => v.type !== "emergency" && v.scheduledWeek != null)
      .map((v) => v.scheduledWeek as number),
  );
  return ancCalendar(pregnancy)
    .filter((s) => s.dueDate < today && !loggedWeeks.has(s.dueByWeek))
    .map((s) => s.dueByWeek);
}

const SCHEDULE_MATCH_TOLERANCE_DAYS = 3;

export interface AncCalendarEntry {
  visitNumber: number;
  dueByWeek: number;
  dueDate: string;
}

// The full visit calendar for one pregnancy, spanning from the date it
// started (LMP) to the day she is due to give birth (EDD) — every ANC visit
// gets a concrete date instead of just a gestational week.
export function ancCalendar(pregnancy: Pregnancy): AncCalendarEntry[] {
  const lmpDate = effectiveLmpDate(pregnancy);
  if (!lmpDate) return [];
  const lmp = new Date(`${lmpDate}T00:00:00`);
  return ANC_SCHEDULE.map((s) => ({
    visitNumber: s.visitNumber,
    dueByWeek: s.dueByWeek,
    dueDate: new Date(lmp.getTime() + s.dueByWeek * 7 * MS_PER_DAY).toISOString().slice(0, 10),
  }));
}

export interface ChwVisitScheduleEntry {
  visitNumber: number; // unique across the whole pregnancy (1..20) — what CommunityVisit.ancVisitNumber stores
  checkpointNumber: number; // which hospital ANC checkpoint (1..10, matches ANC_SCHEDULE) this home visit leads up to
  weekNumber: number; // this specific home visit's own gestational week (rounded), for display
  dueByWeek: number; // the hospital checkpoint's week
  ancDueDate: string; // the hospital checkpoint's date — closes out this stage
  chwDueDate: string; // this specific home visit's date
}

// The CHW's home-visit cadence runs in stages, one per hospital ANC
// checkpoint: [week 1 → week 8], [week 8 → week 12], [week 12 → week 16], …
// each stage gets exactly two evenly-spaced home visits and is closed out by
// the hospital visit at its far end (so week 8's hospital visit both ends
// stage one and starts stage two). This yields 2 home visits per stage × 10
// stages = 20 home visits total, starting at week 1 instead of waiting for
// the first hospital checkpoint at week 8.
export function chwVisitSchedule(pregnancy: Pregnancy): ChwVisitScheduleEntry[] {
  const lmpDate = effectiveLmpDate(pregnancy);
  if (!lmpDate) return [];
  const lmp = new Date(`${lmpDate}T00:00:00`);
  const dateAtWeek = (week: number) => lmp.getTime() + week * 7 * MS_PER_DAY;

  const stageBoundaryWeeks = [1, ...ANC_SCHEDULE.map((s) => s.dueByWeek)];

  const entries: ChwVisitScheduleEntry[] = [];
  let visitNumber = 0;
  ANC_SCHEDULE.forEach((checkpoint, i) => {
    const stageStart = dateAtWeek(stageBoundaryWeeks[i]);
    const stageEnd = dateAtWeek(stageBoundaryWeeks[i + 1]);
    const ancDueDate = new Date(stageEnd).toISOString().slice(0, 10);
    const span = stageEnd - stageStart;

    for (const fraction of [1 / 3, 2 / 3]) {
      visitNumber += 1;
      const chwDate = new Date(stageStart + span * fraction);
      entries.push({
        visitNumber,
        checkpointNumber: checkpoint.visitNumber,
        weekNumber: Math.round((chwDate.getTime() - lmp.getTime()) / (7 * MS_PER_DAY)),
        dueByWeek: checkpoint.dueByWeek,
        ancDueDate,
        chwDueDate: chwDate.toISOString().slice(0, 10),
      });
    }
  });

  return entries;
}

// When a mother walks in, check whether today falls within the tolerance
// window of an unlogged scheduled visit date — if so, this is that
// scheduled visit; otherwise it's unscheduled.
export function matchScheduledVisit(
  pregnancy: Pregnancy,
  visits: Visit[],
  date: string,
): AncCalendarEntry | null {
  const loggedWeeks = new Set(
    visits
      .filter((v) => v.type !== "emergency" && v.scheduledWeek != null)
      .map((v) => v.scheduledWeek as number),
  );
  const today = new Date(`${date}T00:00:00`).getTime();

  let best: { entry: AncCalendarEntry; diffDays: number } | null = null;
  for (const entry of ancCalendar(pregnancy)) {
    if (loggedWeeks.has(entry.dueByWeek)) continue;
    const diffDays = Math.abs(
      (today - new Date(`${entry.dueDate}T00:00:00`).getTime()) / MS_PER_DAY,
    );
    if (diffDays <= SCHEDULE_MATCH_TOLERANCE_DAYS && (!best || diffDays < best.diffDays)) {
      best = { entry, diffDays };
    }
  }
  return best?.entry ?? null;
}
