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
  const currentWeeks = gestationalAgeWeeks(pregnancy.lmpDate, asOf);

  return ANC_SCHEDULE.filter(
    (scheduled) => scheduled.visitNumber > loggedCount,
  ).map((scheduled) => ({
    id: `milestone-${pregnancy.id}-${scheduled.visitNumber}`,
    visitNumber: scheduled.visitNumber,
    dueByWeek: scheduled.dueByWeek,
    overdue: currentWeeks > scheduled.dueByWeek,
  }));
}

export function nextDueVisit(
  pregnancy: Pregnancy,
  visits: Visit[],
  asOf?: string,
): { week: number; overdue: boolean } | null {
  const currentWeeks = gestationalAgeWeeks(pregnancy.lmpDate, asOf);
  const loggedWeeks = new Set(
    visits
      .filter((v) => v.type !== "emergency" && v.scheduledWeek != null)
      .map((v) => v.scheduledWeek as number),
  );
  const next = ANC_SCHEDULE.find((s) => !loggedWeeks.has(s.dueByWeek));
  if (!next) return null;
  return { week: next.dueByWeek, overdue: currentWeeks > next.dueByWeek };
}

export function missedVisits(pregnancy: Pregnancy, visits: Visit[], asOf?: string): number[] {
  const currentWeeks = gestationalAgeWeeks(pregnancy.lmpDate, asOf);
  const loggedWeeks = new Set(
    visits
      .filter((v) => v.type !== "emergency" && v.scheduledWeek != null)
      .map((v) => v.scheduledWeek as number),
  );
  return ANC_SCHEDULE.filter(
    (s) => s.dueByWeek < currentWeeks && !loggedWeeks.has(s.dueByWeek),
  ).map((s) => s.dueByWeek);
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
  const lmp = new Date(`${pregnancy.lmpDate}T00:00:00`);
  // lmpDate can be "" when the backend's nullable lmp field is null (a
  // legitimate, allowed data state — not every pregnancy has a recorded
  // LMP) — without this guard, the invalid Date below throws RangeError
  // on .toISOString(), crashing every page that renders an ANC calendar.
  if (isNaN(lmp.getTime())) return [];
  return ANC_SCHEDULE.map((s) => ({
    visitNumber: s.visitNumber,
    dueByWeek: s.dueByWeek,
    dueDate: new Date(lmp.getTime() + s.dueByWeek * 7 * MS_PER_DAY).toISOString().slice(0, 10),
  }));
}

export interface ChwVisitScheduleEntry {
  visitNumber: number;
  dueByWeek: number;
  ancDueDate: string;
  chwDueDate: string;
}

// The CHW's home-visit date for each checkpoint is always 2 days before the
// corresponding hospital ANC visit date.
export function chwVisitSchedule(pregnancy: Pregnancy): ChwVisitScheduleEntry[] {
  return ancCalendar(pregnancy).map((entry) => {
    const ancDate = new Date(`${entry.dueDate}T00:00:00`);
    const chwDate = new Date(ancDate.getTime() - 2 * MS_PER_DAY);
    return {
      visitNumber: entry.visitNumber,
      dueByWeek: entry.dueByWeek,
      ancDueDate: entry.dueDate,
      chwDueDate: chwDate.toISOString().slice(0, 10),
    };
  });
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
