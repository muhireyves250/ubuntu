"use client";

import { useState } from "react";
import { AncScheduleCalendar } from "@/components/patients/anc-schedule-calendar";
import { nextDueVisit, missedVisits, ancCalendar, gestationalAgeWeeks, effectiveLmpDate } from "@/lib/patients/pregnancy";
import { formatLabs } from "@/lib/format";
import { IconCalendar } from "@/components/dashboard/icons";
import type { Pregnancy, Visit } from "@/lib/patients/types";

export function VisitHistoryTab({
  pregnancy,
  visits,
  onLogScheduledVisit,
  onLogUnscheduledVisit,
  readOnly = false,
}: {
  pregnancy: Pregnancy;
  visits: Visit[];
  onLogScheduledVisit?: (week: number) => void;
  onLogUnscheduledVisit?: () => void;
  readOnly?: boolean;
}) {
  const [expandedScheduleWeek, setExpandedScheduleWeek] = useState<number | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);

  // For a closed pregnancy, "today" is meaningless — measure against the
  // delivery date instead, so an archived record never shows a visit as
  // "due"/"overdue" for a pregnancy that already ended.
  const asOf = readOnly ? pregnancy.delivery?.date : undefined;

  const due = nextDueVisit(pregnancy, visits, asOf);
  const missed = missedVisits(pregnancy, visits, asOf);
  const unscheduledCount = visits.filter((v) => v.type === "unscheduled").length;
  const emergencyCount = visits.filter((v) => v.type === "emergency").length;
  const completedCount = visits.filter(
    (v) => v.type !== "emergency" && v.scheduledWeek != null,
  ).length;

  const currentWeeks = gestationalAgeWeeks(effectiveLmpDate(pregnancy), asOf);
  const loggedWeeks = new Set(
    visits
      .filter((v) => v.type !== "emergency" && v.scheduledWeek != null)
      .map((v) => v.scheduledWeek as number),
  );
  const calendar = ancCalendar(pregnancy);

  // Status must follow the real calendar date, not the gestational week
  // number — week granularity rounds down, so a visit a few days past its
  // due date can still land on "the current week" and read as merely due
  // instead of missed. Everything with a due date on or before today (and
  // not logged) has arrived; the single most recent arrived-unlogged entry
  // is the one actionable "due" visit, and every earlier arrived-unlogged
  // entry is missed.
  const today = asOf ?? new Date().toISOString().slice(0, 10);
  const arrivedUnlogged = calendar.filter(
    (s) => s.dueDate <= today && !loggedWeeks.has(s.dueByWeek),
  );
  const currentDueEntry =
    !readOnly && arrivedUnlogged.length > 0
      ? arrivedUnlogged.reduce((latest, s) => (s.dueDate > latest.dueDate ? s : latest))
      : null;

  const scheduleRows = calendar.map((s) => {
    const status: "completed" | "due" | "missed" | "upcoming" = loggedWeeks.has(s.dueByWeek)
      ? "completed"
      : s.dueDate > today
        ? "upcoming"
        : currentDueEntry && s.visitNumber === currentDueEntry.visitNumber
          ? "due"
          : "missed";
    return { ...s, status };
  });

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-zinc-200 shadow-sm dark:border-zinc-800">
      <div className="flex shrink-0 items-center gap-2 border-b border-zinc-200 bg-[#ffeedb] px-4 py-2 dark:border-zinc-800 dark:bg-orange-950/40">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-teal-700 dark:bg-zinc-900 dark:text-teal-400">
          <IconCalendar className="h-3.5 w-3.5" />
        </span>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {readOnly ? "Antenatal Care Summary" : "Antenatal Care Followup"}
        </h3>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2.5 bg-white p-3 dark:bg-zinc-900">
        <div className="flex shrink-0 flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950/50">
          <span className="font-medium text-zinc-800 dark:text-zinc-200">
            {readOnly
              ? `${completedCount} of ${calendar.length} scheduled visits completed`
              : due
                ? `Next due: Week ${due.week}${due.overdue ? " (overdue)" : ""}`
                : "All scheduled visits logged"}
          </span>
          {missed.length > 0 && (
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                readOnly
                  ? "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                  : "bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400"
              }`}
            >
              {missed.length} {readOnly ? "closed" : "missed"}
            </span>
          )}
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
            {unscheduledCount} unscheduled
          </span>
          <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 dark:bg-red-950/30 dark:text-red-400">
            {emergencyCount} emergency
          </span>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2 rounded-xl border border-zinc-200 p-2.5 dark:border-zinc-800">
          <div className="flex shrink-0 items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              ANC Schedule
            </p>
            {!readOnly && (
              <button
                type="button"
                onClick={() => setShowCalendar((v) => !v)}
                className="text-xs font-semibold text-teal-700 hover:underline dark:text-teal-400"
              >
                {showCalendar ? "Hide calendar" : "Show calendar"}
              </button>
            )}
          </div>
          <div className="scrollbar-hidden flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-1">
          <div className="flex flex-wrap gap-1.5">
          {scheduleRows.map((row) => {
            // A concluded pregnancy has nothing left pending — every
            // non-completed slot reads as closed rather than missed/upcoming.
            const chipClasses = `flex shrink-0 items-center whitespace-nowrap gap-2 rounded-lg border px-4 py-1 text-xs font-medium ${
              row.status === "completed"
                ? "border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-800 dark:bg-teal-950/30 dark:text-teal-400"
                : readOnly
                  ? "border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500"
                  : row.status === "due"
                    ? "border-amber-400 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                    : row.status === "missed"
                      ? "border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-400"
                      : "border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-500"
            }`;
            const label =
              row.status === "completed"
                ? "Completed"
                : readOnly
                  ? "Closed"
                  : row.status === "due"
                    ? "Due now"
                    : row.status === "missed"
                      ? "Missed"
                      : "Upcoming";

            const isExpanded = expandedScheduleWeek === row.dueByWeek;
            return (
              <div key={row.visitNumber} className={`${chipClasses} cursor-pointer hover:opacity-80`} title={label}>
                <button
                  type="button"
                  onClick={() => setExpandedScheduleWeek(isExpanded ? null : row.dueByWeek)}
                  className="flex items-center gap-2 whitespace-nowrap"
                >
                  <span className="text-sm font-semibold">W{row.dueByWeek}</span>
                  <span className="font-mono text-[11px] tracking-tight opacity-70">{row.dueDate}</span>
                </button>
                {!readOnly && row.status === "due" && onLogScheduledVisit && (
                  <button
                    type="button"
                    onClick={() => onLogScheduledVisit(row.dueByWeek)}
                    className="ml-0.5 rounded-full bg-amber-600 px-1.5 py-0.5 text-[10px] font-semibold text-white hover:bg-amber-700"
                  >
                    Log
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {expandedScheduleWeek !== null && (() => {
          const row = scheduleRows.find((r) => r.dueByWeek === expandedScheduleWeek);
          if (!row) return null;

          if (row.status === "completed") {
            const visit = visits.find(
              (v) => v.type !== "emergency" && v.scheduledWeek === expandedScheduleWeek,
            );
            if (!visit) return null;
            return (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/50">
                <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                  Week {expandedScheduleWeek} visit —{" "}
                  <span className="font-mono tracking-tight normal-case">{visit.date}</span>
                </p>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                  <div>
                    <dt className="text-xs text-zinc-500 dark:text-zinc-400">Hospital</dt>
                    <dd className="font-medium text-zinc-900 dark:text-zinc-50">{visit.hospital}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-zinc-500 dark:text-zinc-400">Nurse</dt>
                    <dd className="font-medium text-zinc-900 dark:text-zinc-50">{visit.attendingNurse}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-zinc-500 dark:text-zinc-400">Risk</dt>
                    <dd className="font-medium capitalize text-zinc-900 dark:text-zinc-50">{visit.riskLevel}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-zinc-500 dark:text-zinc-400">Labs</dt>
                    <dd className="font-medium text-zinc-900 dark:text-zinc-50">{formatLabs(visit)}</dd>
                  </div>
                  {visit.notes && (
                    <div className="col-span-2">
                      <dt className="text-xs text-zinc-500 dark:text-zinc-400">Notes</dt>
                      <dd className="text-zinc-700 dark:text-zinc-300">{visit.notes}</dd>
                    </div>
                  )}
                  {visit.treatment && (
                    <div className="col-span-2">
                      <dt className="text-xs text-zinc-500 dark:text-zinc-400">Treatment</dt>
                      <dd className="text-zinc-700 dark:text-zinc-300">{visit.treatment}</dd>
                    </div>
                  )}
                  {visit.followUpPlan && (
                    <div className="col-span-2">
                      <dt className="text-xs text-zinc-500 dark:text-zinc-400">Follow-up plan</dt>
                      <dd className="text-zinc-700 dark:text-zinc-300">{visit.followUpPlan}</dd>
                    </div>
                  )}
                </dl>
              </div>
            );
          }

          const explanation = readOnly
            ? row.status === "missed"
              ? `This visit was due by week ${row.dueByWeek} and was not attended before the pregnancy concluded at week ${currentWeeks}.`
              : `This visit was not yet due — the pregnancy concluded at week ${currentWeeks}, before week ${row.dueByWeek}.`
            : row.status === "missed"
              ? `This visit was due by week ${row.dueByWeek} and was not logged. The patient is now at week ${currentWeeks}.`
              : row.status === "due"
                ? `This visit was due by week ${row.dueByWeek} and has not been logged yet. Log it now to stay on schedule.`
                : `This visit is not yet due. Expected around week ${row.dueByWeek} (currently week ${currentWeeks}).`;

          return (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-300">
              <p className="mb-1 font-semibold uppercase tracking-wide text-zinc-400">
                ANC visit {row.visitNumber} of {calendar.length} — Week {row.dueByWeek} (
                <span className="font-mono tracking-tight normal-case">{row.dueDate}</span>)
              </p>
              <p>{explanation}</p>
            </div>
          );
        })()}

        {!readOnly && showCalendar && <AncScheduleCalendar pregnancy={pregnancy} />}
          </div>
        </div>

        {!readOnly && (
          <div className="shrink-0 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!due}
              onClick={() => due && onLogScheduledVisit?.(due.week)}
              className="w-fit rounded-lg bg-[#0f766e] px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
            >
              Log Scheduled Visit
            </button>
            <button
              type="button"
              onClick={onLogUnscheduledVisit}
              className="w-fit rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Log Unscheduled Visit
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
