"use client";

import { useMemo, useState } from "react";
import { deriveMilestones } from "@/lib/patients/pregnancy";
import { RiskBadge } from "@/components/patients/risk-badge";
import { formatLabs } from "@/lib/format";
import type { AncVisit, Pregnancy, Referral, Visit } from "@/lib/patients/types";

type TimelineItem =
  | { kind: "anc-visit"; id: string; date: string; data: AncVisit }
  | { kind: "assessment"; id: string; date: string; data: Visit }
  | { kind: "referral"; id: string; date: string; data: Referral }
  | {
      kind: "milestone";
      id: string;
      date: null;
      data: { visitNumber: number; dueByWeek: number; overdue: boolean };
    };

function itemLabel(item: TimelineItem): string {
  switch (item.kind) {
    case "anc-visit":
      return `ANC visit ${item.data.ancNumber} logged`;
    case "assessment":
      return `Assessment recorded — classified ${item.data.riskLevel}`;
    case "referral":
      return "Referral accepted";
    case "milestone":
      return `ANC visit ${item.data.visitNumber} of 4 recommended — due by week ${item.data.dueByWeek}`;
  }
}

export function PregnancyTimeline({
  pregnancy,
  ancVisits,
  visits,
  referrals,
}: {
  pregnancy: Pregnancy;
  ancVisits: AncVisit[];
  visits: Visit[];
  referrals: Referral[];
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const items = useMemo<TimelineItem[]>(() => {
    const milestones = deriveMilestones(pregnancy, ancVisits).map(
      (milestone) =>
        ({
          kind: "milestone",
          id: milestone.id,
          date: null,
          data: milestone,
        }) satisfies TimelineItem,
    );

    const dated: TimelineItem[] = [
      ...ancVisits.map(
        (visit) =>
          ({
            kind: "anc-visit",
            id: visit.id,
            date: visit.date,
            data: visit,
          }) satisfies TimelineItem,
      ),
      ...visits.map(
        (visit) =>
          ({
            kind: "assessment",
            id: visit.id,
            date: visit.date,
            data: visit,
          }) satisfies TimelineItem,
      ),
      ...referrals.map(
        (referral) =>
          ({
            kind: "referral",
            id: referral.id,
            date: referral.acceptedAt.slice(0, 10),
            data: referral,
          }) satisfies TimelineItem,
      ),
    ].sort((a, b) => b.date.localeCompare(a.date));

    return [...milestones, ...dated];
  }, [pregnancy, ancVisits, visits, referrals]);

  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        No timeline activity yet.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-3 border-l border-zinc-200 pl-4 dark:border-zinc-800">
      {items.map((item) => {
        const expanded = expandedId === item.id;
        return (
          <li key={item.id} className="relative text-sm">
            <span
              aria-hidden
              className={`absolute -left-[1.05rem] top-1.5 h-2 w-2 rounded-full ${
                item.kind === "milestone" && item.data.overdue
                  ? "bg-orange-500"
                  : "bg-teal-700"
              }`}
            />
            <button
              type="button"
              onClick={() => setExpandedId(expanded ? null : item.id)}
              className="flex w-full items-center justify-between gap-2 text-left"
            >
              <span className="text-zinc-700 dark:text-zinc-300">
                {itemLabel(item)}
              </span>
              {item.kind === "assessment" && (
                <RiskBadge level={item.data.riskLevel} size="sm" />
              )}
            </button>
            <p className="text-xs text-zinc-400">{item.date ?? "Upcoming"}</p>

            {expanded && (
              <div className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                {item.kind === "anc-visit" && (
                  <>
                    <p>Provider: {item.data.provider || "—"}</p>
                    <p>Notes: {item.data.notes || "—"}</p>
                  </>
                )}
                {item.kind === "assessment" && (
                  <p>Labs: {formatLabs(item.data)}</p>
                )}
                {item.kind === "referral" && (
                  <p>Accepted at: {item.data.acceptedAt}</p>
                )}
                {item.kind === "milestone" && (
                  <p>
                    {item.data.overdue
                      ? "This visit is overdue."
                      : "This visit has not been logged yet."}
                  </p>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
