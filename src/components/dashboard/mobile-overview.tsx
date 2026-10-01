"use client";

import { useState } from "react";
import Link from "next/link";
import type { AuthenticatedUser } from "@/lib/auth/auth-context";
import type { RoleOverviewCopy } from "@/lib/dashboard/role-copy";
import { getInitials, fullName } from "@/lib/format";
import {
  useActiveReferrals,
  useFollowUpPatients,
  usePatients,
  usePregnancies,
  useTodaysVisits,
  type RiskSummaryScope,
} from "@/lib/patients/use-patients";
import { gestationalAgeWeeks, effectiveLmpDate } from "@/lib/patients/pregnancy";
import { RiskBadge } from "@/components/patients/risk-badge";
import { IconChevronRight } from "./icons";
import type { Referral, RiskLevel } from "@/lib/patients/types";

// Phone-only overview (below sm). The desktop/tablet overview splits the
// same data across a grid of cards that can't fit a phone screen, so here
// it's recomposed as one app screen: a teal summary header, a stats strip,
// and a single tabbed worklist that takes whatever height is left and is
// the only thing that scrolls.

// Most urgent first, so the bar reads left-to-right as "how bad is it".
const RISK_ORDER: { level: RiskLevel; label: string; barClass: string; dotClass: string }[] = [
  { level: "red", label: "Red", barClass: "bg-red-500", dotClass: "bg-red-400" },
  { level: "orange", label: "Orange", barClass: "bg-orange-400", dotClass: "bg-orange-400" },
  { level: "yellow", label: "Yellow", barClass: "bg-yellow-300", dotClass: "bg-yellow-300" },
  { level: "green", label: "Green", barClass: "bg-emerald-400", dotClass: "bg-emerald-400" },
];

const URGENCY_PILL: Record<Referral["urgency"], { label: string; className: string }> = {
  emergency: { label: "Emergency", className: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300" },
  urgent: { label: "Urgent", className: "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300" },
  routine: { label: "Routine", className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
};

// Grouped, inset list (native settings-style): one white card, hairline
// dividers between rows, a chevron on each row since every row opens the
// patient.
const LIST_CLASS =
  "divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900";
const ROW_CLASS =
  "flex items-center gap-3 px-3 py-3 transition-colors active:bg-zinc-50 dark:active:bg-zinc-800";

function shortDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function MobileOverview({
  user,
  copy,
  counts,
  highRiskRate,
  riskScope,
  onScopeChange,
  totalPatients,
  totalVisits,
}: {
  user: AuthenticatedUser;
  copy: RoleOverviewCopy;
  counts: Record<RiskLevel, number>;
  highRiskRate: number;
  riskScope: RiskSummaryScope;
  onScopeChange: (scope: RiskSummaryScope) => void;
  totalPatients: number;
  totalVisits: number;
}) {
  const followUps = useFollowUpPatients();
  const todaysVisits = useTodaysVisits("today");
  const activeReferrals = useActiveReferrals();
  const patients = usePatients();
  const pregnancies = usePregnancies();
  const [tab, setTab] = useState<"visits" | "referrals">("visits");
  const seenCount = todaysVisits.filter((v) => v.kind === "logged").length;

  const riskTotal = RISK_ORDER.reduce((sum, r) => sum + counts[r.level], 0);

  const stats = [
    { value: totalPatients, label: "Patients" },
    { value: totalVisits, label: "ANC visits" },
    { value: followUps.length, label: "Follow-ups" },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* Summary header — the one bold surface on the screen. */}
      <section className="shrink-0 rounded-2xl bg-teal-900 p-4 text-white shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm text-teal-100">
            Good day, <span className="font-semibold text-white">{user.name.split(" ")[0]}</span>
          </p>
          <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-teal-50">
            {copy.scope}
          </span>
        </div>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-4xl font-bold leading-none tabular-nums">{highRiskRate}%</p>
            <p className="mt-1 text-xs text-teal-100/80">of cases are high risk</p>
          </div>
          <select
            value={riskScope}
            onChange={(e) => onScopeChange(e.target.value as RiskSummaryScope)}
            aria-label="Cases to include"
            className="rounded-lg bg-white/10 px-2 py-1 text-xs text-white outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <option value="all" className="text-zinc-900">All cases</option>
            <option value="active_pregnancy" className="text-zinc-900">Active pregnancies</option>
          </select>
        </div>

        <div
          className="mt-3 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-white/10"
          role="img"
          aria-label={RISK_ORDER.map((r) => `${r.label} ${counts[r.level]}`).join(", ")}
        >
          {riskTotal > 0 &&
            RISK_ORDER.filter((r) => counts[r.level] > 0).map((r) => (
              <span key={r.level} className={r.barClass} style={{ flexGrow: counts[r.level] }} />
            ))}
        </div>

        <ul className="mt-2.5 grid grid-cols-4 gap-1">
          {RISK_ORDER.map((r) => (
            <li key={r.level} className="flex items-center gap-1.5 text-xs">
              <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${r.dotClass}`} />
              <span className="font-semibold tabular-nums">{counts[r.level]}</span>
              <span className="truncate text-teal-100/80">{r.label}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Stats strip */}
      <section className="grid shrink-0 grid-cols-3 divide-x divide-orange-200 rounded-2xl border border-orange-200 bg-[#ffeedb] dark:divide-zinc-700 dark:border-zinc-700 dark:bg-orange-950/40">
        {stats.map((stat) => (
          <div key={stat.label} className="px-2 py-2.5 text-center">
            <p className="text-lg font-bold leading-tight tabular-nums text-zinc-900 dark:text-zinc-50">
              {stat.value}
            </p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{stat.label}</p>
          </div>
        ))}
      </section>

      {/* Worklist — takes the remaining height and scrolls on its own. */}
      <section className="flex min-h-0 flex-1 flex-col">
        <div role="tablist" className="flex shrink-0 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
          {(
            [
              { id: "visits", label: "Today's visits", count: todaysVisits.length },
              { id: "referrals", label: "Referrals", count: activeReferrals.length },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-colors ${
                tab === t.id
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-50"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              {t.label}
              <span
                className={`rounded-full px-1.5 text-[10px] tabular-nums ${
                  tab === t.id ? "bg-teal-900 text-white" : "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
                }`}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>

        <div className="scrollbar-hidden mt-2 min-h-0 flex-1 overflow-y-auto">
          {tab === "visits" ? (
            todaysVisits.length === 0 ? (
              <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">No visits due today.</p>
            ) : (
              <>
                {/* Day progress: how many of today's patients have been seen. */}
                <div className="mb-2 flex items-center gap-3 px-1">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-teal-600 transition-[width]"
                      style={{ width: `${(seenCount / todaysVisits.length) * 100}%` }}
                    />
                  </div>
                  <span className="shrink-0 text-[11px] tabular-nums text-zinc-500 dark:text-zinc-400">
                    {seenCount} of {todaysVisits.length} seen
                  </span>
                </div>
                <ul className={LIST_CLASS}>
                  {todaysVisits.map(({ kind, visit, patient, dueWeek }) => {
                    if (!patient) return null;
                    const isSeen = kind === "logged";
                    const key = isSeen ? visit!.id : `due-${patient.id}-${dueWeek}`;
                    return (
                      <li key={key}>
                        <Link href={`/dashboard/nurse/patients/${patient.id}`} className={ROW_CLASS}>
                          <span
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                              isSeen
                                ? "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300"
                                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                            }`}
                          >
                            {getInitials(fullName(patient))}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                              {fullName(patient)}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-zinc-500 first-letter:uppercase dark:text-zinc-400">
                              {isSeen ? `${visit!.type} visit recorded` : `Week ${dueWeek} check-up`}
                            </span>
                          </span>
                          {isSeen ? (
                            <RiskBadge level={visit!.riskLevel} size="sm" />
                          ) : (
                            <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900">
                              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                              Not arrived
                            </span>
                          )}
                          <IconChevronRight className="h-4 w-4 shrink-0 text-zinc-300 dark:text-zinc-600" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </>
            )
          ) : activeReferrals.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">No active referrals.</p>
          ) : (
            <ul className={LIST_CLASS}>
              {activeReferrals.map((referral) => {
                const patient = patients.find((p) => p.id === referral.patientId);
                if (!patient) return null;
                const openPregnancy = pregnancies.find(
                  (p) => p.patientId === patient.id && p.status === "open",
                );
                const gaWeeks = openPregnancy ? gestationalAgeWeeks(effectiveLmpDate(openPregnancy)) : null;
                const urgency = URGENCY_PILL[referral.urgency];
                return (
                  <li key={referral.id}>
                    <Link href={`/dashboard/nurse/patients/${referral.patientId}`} className={ROW_CLASS}>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                        {getInitials(fullName(patient))}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {fullName(patient)}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-zinc-500 dark:text-zinc-400">
                          {gaWeeks !== null ? `${gaWeeks} weeks pregnant` : "Gestation unknown"}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-0.5">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${urgency.className}`}>
                          {urgency.label}
                        </span>
                        <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                          {shortDate(referral.acceptedAt ?? referral.createdAt)}
                        </span>
                      </span>
                      <IconChevronRight className="h-4 w-4 shrink-0 text-zinc-300 dark:text-zinc-600" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
