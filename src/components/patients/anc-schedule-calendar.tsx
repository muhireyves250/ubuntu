"use client";

import { useMemo, useState } from "react";
import { chwVisitSchedule, type ChwVisitScheduleEntry } from "@/lib/patients/pregnancy";
import { useCommunityVisitsForPregnancy, useVisitsForPregnancy } from "@/lib/patients/use-patients";
import type { Pregnancy } from "@/lib/patients/types";

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function startOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function AncScheduleCalendar({
  pregnancy,
  homeVisitsOnly = false,
}: {
  pregnancy: Pregnancy;
  // A CHW only needs to see their own home-visit schedule — the hospital
  // ANC checkpoints and any unscheduled hospital visits aren't theirs to
  // act on, so they're hidden entirely rather than just de-emphasized.
  homeVisitsOnly?: boolean;
}) {
  const schedule = useMemo(() => chwVisitSchedule(pregnancy), [pregnancy]);
  const communityVisits = useCommunityVisitsForPregnancy(pregnancy.id);
  const hospitalVisits = useVisitsForPregnancy(pregnancy.id);
  const today = new Date().toISOString().slice(0, 10);

  const doneVisitNumbers = useMemo(
    () => new Set(communityVisits.map((v) => v.ancVisitNumber).filter((n): n is number => n != null)),
    [communityVisits],
  );
  // A hospital checkpoint counts as attended once any real scheduled (non-emergency)
  // visit was logged against that week — mirrors missedVisits()'s own logged-week check.
  const attendedWeeks = useMemo(
    () =>
      new Set(
        hospitalVisits
          .filter((v) => v.type !== "emergency" && v.scheduledWeek != null)
          .map((v) => v.scheduledWeek as number),
      ),
    [hospitalVisits],
  );

  // A checkpoint is missed the moment its due date has passed with nothing
  // recorded against it — no extra day of grace, and independent of whether
  // it happens to be the single "next due" one.
  const chwMissed = useMemo(
    () =>
      new Set(
        schedule
          .filter((s) => !doneVisitNumbers.has(s.visitNumber) && s.chwDueDate < today)
          .map((s) => s.visitNumber),
      ),
    [schedule, doneVisitNumbers, today],
  );
  // Two chw schedule entries share the same hospital checkpoint (its two
  // home visits) — dedupe on dueByWeek (unique per checkpoint), not the chw
  // entries' own per-home-visit visitNumber, so each hospital checkpoint is
  // only considered missed once.
  const hospitalMissed = useMemo(
    () =>
      new Set(
        schedule
          .filter((s) => !attendedWeeks.has(s.dueByWeek) && s.ancDueDate < today)
          .map((s) => s.dueByWeek),
      ),
    [schedule, attendedWeeks, today],
  );
  // The single, currently-actionable hospital checkpoint — the most recent
  // arrived-unattended one — same "latest arrived" rule visit-history-tab
  // uses for its own chip row, so the two views always agree on which
  // checkpoint reads as "due" versus already "missed".
  const hospitalDueWeek = useMemo(() => {
    const arrived = schedule.filter(
      (s) => !attendedWeeks.has(s.dueByWeek) && s.ancDueDate <= today,
    );
    return arrived.reduce<typeof arrived[0] | null>(
      (latest, s) => (!latest || s.ancDueDate > latest.ancDueDate ? s : latest),
      null,
    )?.dueByWeek ?? null;
  }, [schedule, attendedWeeks, today]);

  // The next due home visit skips any checkpoint a CHW has already visited,
  // even an overdue one that was completed late — otherwise a done visit
  // would keep being highlighted as still due. It only gets the solid
  // "next due" treatment when it isn't already overdue — an overdue
  // checkpoint reads as missed instead (see chwMissed above).
  const nextDue =
    [...schedule]
      .filter((s) => !doneVisitNumbers.has(s.visitNumber) && !chwMissed.has(s.visitNumber))
      .sort((a, b) => a.chwDueDate.localeCompare(b.chwDueDate))[0] ?? null;

  const [viewDate, setViewDate] = useState(() => {
    const anchor = nextDue ? new Date(`${nextDue.chwDueDate}T00:00:00`) : new Date();
    return new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Real logged hospital visits on the selected day — every visit actually
  // done at the hospital, and which nurse handled it, not just a colored
  // marker with no detail behind it.
  const hospitalVisitsByDay = useMemo(() => {
    const map = new Map<string, typeof hospitalVisits>();
    for (const v of hospitalVisits) {
      const d = v.date.slice(0, 10);
      const list = map.get(d) ?? [];
      list.push(v);
      map.set(d, list);
    }
    return map;
  }, [hospitalVisits]);
  const selectedDayVisits = selectedDate ? (hospitalVisitsByDay.get(selectedDate) ?? []) : [];

  const ancDatesByDay = useMemo(() => {
    const map = new Map<string, number>(); // date -> dueByWeek (hospital checkpoint's gestational week)
    if (homeVisitsOnly) return map;
    for (const entry of schedule) map.set(entry.ancDueDate, entry.dueByWeek);
    return map;
  }, [schedule, homeVisitsOnly]);
  const chwEntryByDay = useMemo(() => {
    const map = new Map<string, ChwVisitScheduleEntry>();
    for (const entry of schedule) map.set(entry.chwDueDate, entry);
    return map;
  }, [schedule]);
  // Unscheduled hospital visits happen off the fixed ANC calendar entirely —
  // they still need to show up so the full visit picture is on one calendar
  // (but only for the nurse's view — a CHW only cares about home visits).
  const unscheduledDatesByDay = useMemo(() => {
    const map = new Map<string, number>(); // date -> count (in case of same-day duplicates)
    if (homeVisitsOnly) return map;
    for (const v of hospitalVisits) {
      if (v.type !== "unscheduled") continue;
      const d = v.date.slice(0, 10);
      map.set(d, (map.get(d) ?? 0) + 1);
    }
    return map;
  }, [hospitalVisits, homeVisitsOnly]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const first = startOfMonth(year, month);
  const totalDays = daysInMonth(year, month);
  const leadingBlanks = first.getDay();

  const cells: (number | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];

  function dateStr(day: number): string {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          className="rounded-lg px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          ‹
        </button>
        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          {viewDate.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </p>
        <button
          type="button"
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
          className="rounded-lg px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-zinc-400">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (day === null) return <div key={`blank-${idx}`} />;
          const ds = dateStr(day);
          const ancWeek = ancDatesByDay.get(ds);
          const chwEntry = chwEntryByDay.get(ds);
          const chwWeek = chwEntry?.weekNumber;
          const chwDone = chwEntry != null && doneVisitNumbers.has(chwEntry.visitNumber);
          const chwIsMissed = chwEntry != null && chwMissed.has(chwEntry.visitNumber);
          const ancIsMissed = ancWeek != null && hospitalMissed.has(ancWeek);
          const ancIsDue = ancWeek != null && ancWeek === hospitalDueWeek;
          const unscheduledCount = unscheduledDatesByDay.get(ds) ?? 0;
          const isNextDue = nextDue && ds === nextDue.chwDueDate;
          const isToday = ds === today;
          const hasLoggedVisit = !homeVisitsOnly && hospitalVisitsByDay.has(ds);
          const isSelected = selectedDate === ds;
          return (
            <button
              key={ds}
              type="button"
              disabled={!hasLoggedVisit}
              onClick={() => setSelectedDate(isSelected ? null : ds)}
              className={`relative flex h-9 flex-col items-center justify-center rounded-lg text-xs ${
                hasLoggedVisit ? "cursor-pointer" : "cursor-default"
              } ${
                isNextDue
                  ? "bg-teal-600 font-semibold text-white"
                  : ancIsMissed || chwIsMissed || unscheduledCount > 0
                    ? "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400"
                    : ancIsDue
                      ? "bg-amber-600 font-semibold text-white"
                      : ancWeek
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                        : chwDone
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : chwWeek
                            ? "bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300"
                            : "text-zinc-600 dark:text-zinc-400"
              } ${isToday ? "ring-2 ring-inset ring-zinc-900 dark:ring-white" : ""} ${
                isSelected ? "outline outline-2 outline-offset-1 outline-zinc-900 dark:outline-white" : ""
              }`}
              title={[
                ancWeek ? `Hospital visit — Week ${ancWeek}${ancIsDue ? " (due now)" : ancIsMissed ? " (missed)" : ""}` : null,
                chwWeek ? `Home visit — Week ${chwWeek}${chwDone ? " (done)" : chwIsMissed ? " (missed)" : ""}` : null,
                unscheduledCount > 0 ? `Unscheduled visit${unscheduledCount > 1 ? ` ×${unscheduledCount}` : ""}` : null,
                isToday ? "Today" : null,
                hasLoggedVisit ? "Click for visit details" : null,
              ]
                .filter(Boolean)
                .join(" · ") || undefined}
            >
              {day}
              {unscheduledCount > 0 && (
                <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-red-600 dark:bg-red-400" />
              )}
            </button>
          );
        })}
      </div>

      {selectedDate && selectedDayVisits.length > 0 && (
        <div className="mt-3 flex flex-col gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/30">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            Visit{selectedDayVisits.length > 1 ? "s" : ""} on {selectedDate}
          </p>
          {selectedDayVisits.map((v) => (
            <div
              key={v.id}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900"
            >
              <span className="font-medium capitalize text-zinc-800 dark:text-zinc-200">{v.type}</span>
              <span className="text-zinc-600 dark:text-zinc-400">Hospital: {v.hospital}</span>
              <span className="text-zinc-600 dark:text-zinc-400">Nurse: {v.attendingNurse}</span>
              <span className="capitalize text-zinc-600 dark:text-zinc-400">Risk: {v.riskLevel}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-500 dark:text-zinc-400">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-teal-100 dark:bg-teal-950/40" /> Home visit
        </span>
        {!homeVisitsOnly && (
          <>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-100 dark:bg-amber-950/40" /> Hospital visit
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-600" /> Hospital visit due now
            </span>
          </>
        )}
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40" /> Home visit done
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-100 dark:bg-red-950/40" /> Missed
        </span>
        {!homeVisitsOnly && (
          <span className="flex items-center gap-1.5">
            <span className="relative h-2.5 w-2.5 rounded-full bg-red-100 dark:bg-red-950/40">
              <span className="absolute inset-0 m-auto h-1 w-1 rounded-full bg-red-600 dark:bg-red-400" />
            </span>
            Unscheduled visit
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-teal-600" /> Next due
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full ring-2 ring-inset ring-zinc-900 dark:ring-white" /> Today
        </span>
      </div>
    </div>
  );
}
