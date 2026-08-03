"use client";

import { useMemo, useState } from "react";
import { chwVisitSchedule } from "@/lib/patients/pregnancy";
import type { Pregnancy } from "@/lib/patients/types";

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function startOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function AncScheduleCalendar({ pregnancy }: { pregnancy: Pregnancy }) {
  const schedule = useMemo(() => chwVisitSchedule(pregnancy), [pregnancy]);
  const today = new Date().toISOString().slice(0, 10);
  const nextDue = schedule.find((s) => s.chwDueDate >= today) ?? schedule[schedule.length - 1];

  const [viewDate, setViewDate] = useState(() => {
    const anchor = nextDue ? new Date(`${nextDue.chwDueDate}T00:00:00`) : new Date();
    return new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  });

  const ancDatesByDay = useMemo(() => {
    const map = new Map<string, number>(); // date -> visitNumber
    for (const entry of schedule) map.set(entry.ancDueDate, entry.visitNumber);
    return map;
  }, [schedule]);
  const chwDatesByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of schedule) map.set(entry.chwDueDate, entry.visitNumber);
    return map;
  }, [schedule]);

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
          const chwWeek = chwDatesByDay.get(ds);
          const isNextDue = nextDue && ds === nextDue.chwDueDate;
          return (
            <div
              key={ds}
              className={`flex h-9 flex-col items-center justify-center rounded-lg text-xs ${
                isNextDue
                  ? "bg-teal-600 font-semibold text-white"
                  : ancWeek
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                    : chwWeek
                      ? "bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300"
                      : "text-zinc-600 dark:text-zinc-400"
              }`}
              title={
                ancWeek
                  ? `Hospital visit — Week ${ancWeek}`
                  : chwWeek
                    ? `Home visit — Week ${chwWeek}`
                    : undefined
              }
            >
              {day}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-500 dark:text-zinc-400">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-teal-100 dark:bg-teal-950/40" /> Home visit
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-100 dark:bg-amber-950/40" /> Hospital visit
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-teal-600" /> Next due
        </span>
      </div>
    </div>
  );
}
