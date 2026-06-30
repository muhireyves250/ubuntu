import type { AncVisit, Pregnancy } from "./types";

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
  { visitNumber: 1, dueByWeek: 12 },
  { visitNumber: 2, dueByWeek: 26 },
  { visitNumber: 3, dueByWeek: 30 },
  { visitNumber: 4, dueByWeek: 36 },
];

export interface Milestone {
  id: string;
  visitNumber: number;
  dueByWeek: number;
  overdue: boolean;
}

export function deriveMilestones(
  pregnancy: Pregnancy,
  ancVisits: AncVisit[],
  asOf?: string,
): Milestone[] {
  const loggedCount = ancVisits.length;
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
