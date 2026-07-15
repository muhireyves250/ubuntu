"use client";

import { useMemo, useState } from "react";
import { RiskBadge } from "@/components/patients/risk-badge";
import { IconAlert, IconClipboard, IconChevronDown } from "@/components/dashboard/icons";
import { formatLabs } from "@/lib/format";
import type { Referral, Visit } from "@/lib/patients/types";

type TimelineItem =
  | { kind: "assessment"; id: string; date: string; data: Visit }
  | { kind: "referral"; id: string; date: string; data: Referral };

function itemLabel(item: TimelineItem, readOnly: boolean): string {
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
      // The pregnancy has concluded, so there's nothing left to action —
      // show every referral tied to it as resolved rather than still
      // pending/awaiting acceptance.
      if (readOnly) return "Referral closed";
      if (item.data.status === "pending") return "Referral sent — pending acceptance";
      if (item.data.status === "accepted") return "Referral accepted";
      return "Referral closed";
  }
}

function markerClasses(item: TimelineItem, readOnly: boolean): string {
  if (item.kind === "assessment" && item.data.type === "emergency") {
    return "bg-red-600 text-white";
  }
  if (item.kind === "referral") {
    if (readOnly) return "bg-zinc-400 text-white dark:bg-zinc-600";
    if (item.data.status === "pending") return "bg-amber-500 text-white";
    if (item.data.status === "closed") return "bg-zinc-400 text-white dark:bg-zinc-600";
    return "bg-teal-700 text-white";
  }
  return "bg-teal-700 text-white";
}

export function PregnancyTimeline({
  visits,
  referrals,
  readOnly = false,
}: {
  visits: Visit[];
  referrals: Referral[];
  readOnly?: boolean;
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
      <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        No timeline activity yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Pregnancy Timeline
      </p>
      <ol className="flex flex-col">
        {items.map((item, index) => {
          const expanded = expandedId === item.id;
          const isLast = index === items.length - 1;
          return (
            <li key={item.id} className="relative flex gap-3 pb-4">
              {!isLast && (
                <span
                  aria-hidden
                  className="absolute left-[15px] top-8 bottom-0 w-px bg-zinc-200 dark:bg-zinc-800"
                />
              )}
              <span
                className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${markerClasses(item, readOnly)}`}
              >
                {item.kind === "assessment" && item.data.type === "emergency" ? (
                  <IconAlert className="h-4 w-4" />
                ) : (
                  <IconClipboard className="h-4 w-4" />
                )}
              </span>

              <div className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : item.id)}
                  className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      {itemLabel(item, readOnly)}
                    </p>
                    <p className="text-xs text-zinc-400">{item.date}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {item.kind === "assessment" && (
                      <RiskBadge level={item.data.riskLevel} size="sm" />
                    )}
                    <IconChevronDown
                      className={`h-3.5 w-3.5 text-zinc-400 transition-transform ${expanded ? "rotate-180" : ""}`}
                    />
                  </div>
                </button>

                {expanded && (
                  <div className="border-t border-zinc-100 px-3.5 py-2.5 text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-300">
                    {item.kind === "assessment" && (
                      <div className="flex flex-col gap-1">
                        {item.data.type === "emergency" && (
                          <p>Summary: {item.data.emergencySummary}</p>
                        )}
                        <p>Labs: {formatLabs(item.data)}</p>
                        {item.data.treatment && <p>Treatment: {item.data.treatment}</p>}
                        {item.data.followUpPlan && <p>Follow-up plan: {item.data.followUpPlan}</p>}
                      </div>
                    )}
                    {item.kind === "referral" && (
                      <div className="flex flex-col gap-1">
                        <p>Referred to: {item.data.receivingFacility}</p>
                        {item.data.acceptedAt && <p>Accepted at: {item.data.acceptedAt}</p>}
                        {item.data.outcome && (
                          <p>Outcome: {item.data.outcome} — {item.data.outcomeStatement}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
