"use client";

import { useMemo, useState } from "react";
import { RiskBadge } from "@/components/patients/risk-badge";
import { formatLabs } from "@/lib/format";
import type { Referral, Visit } from "@/lib/patients/types";

type TimelineItem =
  | { kind: "assessment"; id: string; date: string; data: Visit }
  | { kind: "referral"; id: string; date: string; data: Referral };

function itemLabel(item: TimelineItem): string {
  switch (item.kind) {
    case "assessment":
      if (item.data.type === "emergency") {
        return "Emergency visit — classified RED";
      }
      if (item.data.type === "scheduled") {
        return `Scheduled ANC visit — classified ${item.data.riskLevel}`;
      }
      return `Unscheduled visit — classified ${item.data.riskLevel}`;
    case "referral":
      if (item.data.status === "pending") return "Referral sent — pending acceptance";
      if (item.data.status === "accepted") return "Referral accepted";
      return "Referral closed";
  }
}

export function PregnancyTimeline({
  visits,
  referrals,
}: {
  visits: Visit[];
  referrals: Referral[];
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const items = useMemo<TimelineItem[]>(() => {
    return [
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
            date: (referral.acceptedAt ?? referral.createdAt).slice(0, 10),
            data: referral,
          }) satisfies TimelineItem,
      ),
    ].sort((a, b) => b.date.localeCompare(a.date));
  }, [visits, referrals]);

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
                item.kind === "assessment" && item.data.type === "emergency"
                  ? "bg-red-600"
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
            <p className="text-xs text-zinc-400">{item.date}</p>

            {expanded && (
              <div className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                {item.kind === "assessment" && (
                  <>
                    {item.data.type === "emergency" && (
                      <p>Summary: {item.data.emergencySummary}</p>
                    )}
                    <p>Labs: {formatLabs(item.data)}</p>
                  </>
                )}
                {item.kind === "referral" && (
                  <>
                    <p>Referred to: {item.data.receivingFacility}</p>
                    {item.data.acceptedAt && <p>Accepted at: {item.data.acceptedAt}</p>}
                    {item.data.outcome && (
                      <p>Outcome: {item.data.outcome} — {item.data.outcomeStatement}</p>
                    )}
                  </>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
