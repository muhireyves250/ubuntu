"use client";

import { Fragment, useState } from "react";
import { RiskBadge } from "@/components/patients/risk-badge";
import { AncScheduleCalendar } from "@/components/patients/anc-schedule-calendar";
import { SYMPTOM_CHECKLIST } from "@/lib/patients/symptom-checklist";
import { nextDueVisit, missedVisits, ancCalendar, gestationalAgeWeeks, effectiveLmpDate } from "@/lib/patients/pregnancy";
import { formatLabs } from "@/lib/format";
import type { Pregnancy, Visit, VisitType } from "@/lib/patients/types";

const SYMPTOM_LABEL = new Map(
  SYMPTOM_CHECKLIST.map((symptom) => [symptom.id, symptom.label]),
);

const TYPE_BADGE: Record<VisitType, string> = {
  scheduled: "bg-teal-50 text-teal-800 dark:bg-teal-950/30 dark:text-teal-400",
  unscheduled: "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400",
  emergency: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400",
};

function TypeBadge({ type }: { type: VisitType }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${TYPE_BADGE[type]}`}>
      {type}
    </span>
  );
}

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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedScheduleWeek, setExpandedScheduleWeek] = useState<number | null>(null);

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
    <div className="flex flex-col gap-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
        {readOnly ? "Antenatal Care Summary" : "Antenatal Care Followup"}
      </p>

      <div className="flex flex-wrap items-center gap-2.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm dark:border-zinc-800 dark:bg-zinc-900">
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

      <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          ANC Schedule
        </p>
        <div className="flex flex-wrap gap-2">
          {scheduleRows.map((row) => {
            // A concluded pregnancy has nothing left pending — every
            // non-completed slot reads as closed rather than missed/upcoming.
            const chipClasses = `flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium ${
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
              <div key={row.visitNumber} className={`${chipClasses} cursor-pointer hover:opacity-80`}>
                <button
                  type="button"
                  onClick={() => setExpandedScheduleWeek(isExpanded ? null : row.dueByWeek)}
                  className="flex items-center gap-1.5"
                >
                  <span>Week {row.dueByWeek}</span>
                  <span className="text-[10px] opacity-70">{row.dueDate}</span>
                  <span className="text-[10px] uppercase tracking-wide opacity-80">{label}</span>
                </button>
                {!readOnly && row.status === "due" && onLogScheduledVisit && (
                  <button
                    type="button"
                    onClick={() => onLogScheduledVisit(row.dueByWeek)}
                    className="ml-1 rounded-full bg-amber-600 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-amber-700"
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
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                <p className="mb-1 font-semibold uppercase tracking-wide text-zinc-400">
                  Week {expandedScheduleWeek} visit — {visit.date}
                </p>
                <p>Hospital: {visit.hospital}</p>
                <p>Nurse: {visit.attendingNurse}</p>
                <p>Risk: {visit.riskLevel}</p>
                {visit.notes && <p>Notes: {visit.notes}</p>}
                <p>Labs: {formatLabs(visit)}</p>
                {visit.treatment && <p>Treatment: {visit.treatment}</p>}
                {visit.followUpPlan && <p>Follow-up plan: {visit.followUpPlan}</p>}
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
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
              <p className="mb-1 font-semibold uppercase tracking-wide text-zinc-400">
                ANC visit {row.visitNumber} of {calendar.length} — Week {row.dueByWeek} ({row.dueDate})
              </p>
              <p>{explanation}</p>
            </div>
          );
        })()}

        {!readOnly && <AncScheduleCalendar pregnancy={pregnancy} />}
      </div>

      <div className="scrollbar-hidden overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
            <tr>
              <th className="px-3 py-2.5">No.</th>
              <th className="px-3 py-2.5">ANC Week</th>
              <th className="px-3 py-2.5">Visit Date</th>
              <th className="px-3 py-2.5">Type</th>
              <th className="px-3 py-2.5">Risk</th>
              <th className="px-3 py-2.5">Signs &amp; Symptoms</th>
              <th className="px-3 py-2.5">Labs</th>
              <th className="px-3 py-2.5">Hospital</th>
              <th className="px-3 py-2.5">Nurse</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {visits.map((visit, index) => {
              const expanded = expandedId === visit.id;
              return (
                <Fragment key={visit.id}>
                  <tr
                    onClick={() =>
                      setExpandedId(expanded ? null : visit.id)
                    }
                    className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
                  >
                    <td className="px-3 py-2.5 text-zinc-500 dark:text-zinc-400">
                      {index + 1}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-600 dark:text-zinc-400">
                      {visit.scheduledWeek != null ? `Week ${visit.scheduledWeek}` : "—"}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-zinc-900 dark:text-zinc-50">
                      {visit.date}
                    </td>
                    <td className="px-3 py-2.5">
                      <TypeBadge type={visit.type} />
                    </td>
                    <td className="px-3 py-2.5">
                      <RiskBadge level={visit.riskLevel} size="sm" />
                    </td>
                    <td className="px-3 py-2.5 text-zinc-600 dark:text-zinc-400">
                      {visit.symptomIds.length > 0
                        ? visit.symptomIds
                            .map((id) => SYMPTOM_LABEL.get(id) ?? id)
                            .join(", ")
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-600 dark:text-zinc-400">
                      {visit.labStatus === "pending" ? (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                          Pending labs
                        </span>
                      ) : (
                        formatLabs(visit)
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-600 dark:text-zinc-400">
                      {visit.hospital}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-600 dark:text-zinc-400">
                      {visit.attendingNurse}
                    </td>
                  </tr>
                  {expanded && (
                    <tr key={`${visit.id}-detail`}>
                      <td
                        colSpan={9}
                        className="bg-zinc-50 px-4 py-3 dark:bg-zinc-900"
                      >
                        <div className="flex flex-col gap-1.5 text-sm text-zinc-700 dark:text-zinc-300">
                          {visit.type === "emergency" && visit.emergencySummary ? (
                            <p>
                              <span className="font-medium text-zinc-400">
                                Summary:{" "}
                              </span>
                              {visit.emergencySummary}
                            </p>
                          ) : null}
                          {visit.treatment ? (
                            <p>
                              <span className="font-medium text-zinc-400">
                                Treatment:{" "}
                              </span>
                              {visit.treatment}
                            </p>
                          ) : null}
                          {visit.followUpPlan ? (
                            <p>
                              <span className="font-medium text-zinc-400">
                                Follow-up plan:{" "}
                              </span>
                              {visit.followUpPlan}
                            </p>
                          ) : null}
                          {visit.notes ? (
                            <p>
                              <span className="font-medium text-zinc-400">
                                Notes:{" "}
                              </span>
                              {visit.notes}
                            </p>
                          ) : null}
                          {visit.labs ? (
                            <p>
                              <span className="font-medium text-zinc-400">
                                Labs:{" "}
                              </span>
                              {formatLabs(visit)}
                            </p>
                          ) : null}
                          {!visit.notes && !visit.labs && !visit.emergencySummary && !visit.treatment && !visit.followUpPlan && (
                            <p className="text-zinc-400">
                              No additional details recorded.
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}

            {visits.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="px-3 py-6 text-center text-zinc-500 dark:text-zinc-400"
                >
                  No visits recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!readOnly && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!due}
            onClick={() => due && onLogScheduledVisit?.(due.week)}
            className="w-fit rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Log Scheduled Visit
          </button>
          <button
            type="button"
            onClick={onLogUnscheduledVisit}
            className="w-fit rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Log Unscheduled Visit
          </button>
        </div>
      )}
    </div>
  );
}
