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
