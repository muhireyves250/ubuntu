"use client";

import { useState } from "react";
import Link from "next/link";
import { getInitials, fullName } from "@/lib/format";
import { useTodaysVisits, type VisitsWorklistPeriod } from "@/lib/patients/use-patients";
import { RiskBadge } from "@/components/patients/risk-badge";
import { IconCalendar } from "./icons";
import type { RiskLevel } from "@/lib/patients/types";

const TODAY_CAP = 8;

const PERIOD_LABELS: Record<VisitsWorklistPeriod, string> = {
  today: "Today",
  week: "This Week",
  month: "This Month",
  year: "This Year",
};

const RISK_CARD_BORDER: Record<RiskLevel, string> = {
  green: "border-emerald-200 hover:border-emerald-300 dark:border-emerald-900/60 dark:hover:border-emerald-700",
  yellow: "border-yellow-300 hover:border-yellow-400 dark:border-yellow-900/60 dark:hover:border-yellow-700",
  orange: "border-orange-300 hover:border-orange-400 dark:border-orange-900/60 dark:hover:border-orange-700",
  red: "border-red-300 hover:border-red-400 dark:border-red-900/60 dark:hover:border-red-700",
};

export function TodaysVisitsCard() {
  const [period, setPeriod] = useState<VisitsWorklistPeriod>("today");
  const [showAll, setShowAll] = useState(false);
  const todaysVisits = useTodaysVisits(period);
  const visibleVisits = showAll ? todaysVisits : todaysVisits.slice(0, TODAY_CAP);

  return (
    <div className="flex flex-col rounded-[1.25rem] border border-zinc-300 bg-[#ffeedb] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:border-zinc-700 dark:bg-orange-950/40 lg:min-h-0 lg:flex-1">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <IconCalendar className="h-4 w-4 text-zinc-400" />
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
            {PERIOD_LABELS[period]}&apos;s ANC Visits
          </h3>
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
            {todaysVisits.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => {
              setPeriod(e.target.value as VisitsWorklistPeriod);
              setShowAll(false);
            }}
            className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-600 outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
          >
            {(Object.keys(PERIOD_LABELS) as VisitsWorklistPeriod[]).map((p) => (
              <option key={p} value={p}>
                {PERIOD_LABELS[p]}
              </option>
            ))}
          </select>
          <Link
            href="/dashboard/nurse/patients"
            className="rounded-md border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-600 dark:border-zinc-800 dark:text-zinc-300"
          >
            View All
          </Link>
        </div>
      </div>
      {todaysVisits.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
          No visits due or recorded {period === "today" ? "today" : PERIOD_LABELS[period].toLowerCase()}.
        </p>
      ) : (
        <div className="scrollbar-hidden mt-3 grid auto-rows-min grid-cols-2 gap-2 pr-1 sm:grid-cols-3 lg:min-h-0 lg:flex-1 lg:grid-cols-2 lg:overflow-y-auto xl:grid-cols-5">
          {visibleVisits.map((entry) => {
            const { kind, visit, patient, dueWeek } = entry;
            if (!patient) return null;
            const key = kind === "logged" ? visit!.id : `due-${patient.id}-${dueWeek}`;
            const borderClass =
              kind === "logged" ? RISK_CARD_BORDER[visit!.riskLevel] : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-600";
            return (
              <Link
                key={key}
                href={`/dashboard/nurse/patients/${patient.id}`}
                className={`flex flex-col gap-1.5 rounded-lg border-2 bg-white p-2 transition-colors hover:shadow-sm dark:bg-zinc-900 ${borderClass}`}
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-[11px] font-semibold text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                    {getInitials(fullName(patient))}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-zinc-900 dark:text-zinc-100">
                      {fullName(patient)}
                    </p>
                    <p className="truncate text-[11px] capitalize text-zinc-400">
                      {kind === "logged" ? visit!.type : `due — week ${dueWeek}`}
                    </p>
                  </div>
                </div>
                {kind === "logged" ? (
                  <RiskBadge level={visit!.riskLevel} size="sm" />
                ) : (
                  <span className="w-fit rounded-full bg-zinc-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    Not yet arrived
                  </span>
                )}
              </Link>
            );
          })}
          {todaysVisits.length > TODAY_CAP && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="flex flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-zinc-300 p-2 text-center text-[11px] font-medium text-zinc-500 hover:bg-white dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
            >
              {showAll ? (
                "Show less"
              ) : (
                <>
                  +{todaysVisits.length - TODAY_CAP}
                  <span className="font-normal text-zinc-400">more</span>
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
