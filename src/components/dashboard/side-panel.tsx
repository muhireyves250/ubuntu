"use client";

import { useState } from "react";
import Link from "next/link";
import type { AuthenticatedUser } from "@/lib/auth/auth-context";
import type { RoleOverviewCopy } from "@/lib/dashboard/role-copy";
import { getInitials, fullName } from "@/lib/format";
import { useFollowUpPatients } from "@/lib/patients/use-patients";
import { RiskBadge } from "@/components/patients/risk-badge";
import { IconAlert } from "./icons";
import type { RiskLevel } from "@/lib/patients/types";

const LIST_CAP = 4;
// Below lg (phones/tablets, where the sidebar collapses into the menu) the
// collapsed list shows fewer rows so the card stays short.
const MOBILE_LIST_CAP = 2;

const RISK_ROW_BORDER: Record<RiskLevel, string> = {
  green: "border-emerald-200 hover:border-emerald-300 dark:border-emerald-900/60 dark:hover:border-emerald-700",
  yellow: "border-yellow-300 hover:border-yellow-400 dark:border-yellow-900/60 dark:hover:border-yellow-700",
  orange: "border-orange-300 hover:border-orange-400 dark:border-orange-900/60 dark:hover:border-orange-700",
  red: "border-red-300 hover:border-red-400 dark:border-red-900/60 dark:hover:border-red-700",
};

export function SidePanel({
  user,
  copy,
}: {
  user: AuthenticatedUser;
  copy: RoleOverviewCopy;
}) {
  const followUps = useFollowUpPatients();

  const [showAllFollowUps, setShowAllFollowUps] = useState(false);

  const visibleFollowUps = showAllFollowUps ? followUps : followUps.slice(0, LIST_CAP);

  return (
    <div className="flex w-full flex-col gap-4 lg:h-full lg:min-h-0 lg:w-80">
      {/* Greeting card */}
      {/* Below lg the card becomes a compact teal header (matching the
          phone overview): avatar, greeting and scope chip share one row —
          the inner wrapper turns into `contents` — and the placeholder
          description is dropped. lg+ keeps the original stacked card. */}
      <div className="flex flex-col gap-2 rounded-[1.25rem] border border-zinc-300 bg-[#ffeedb] p-3 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40 max-lg:border-transparent max-lg:bg-teal-900 max-lg:dark:bg-teal-950 sm:gap-3 sm:p-6 max-lg:sm:p-5 lg:min-h-0 lg:flex-1">
        <div className="flex shrink-0 items-center gap-3 lg:flex-col lg:items-start">
        <div className="flex shrink-0 items-center gap-2 max-lg:contents sm:gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-zinc-700 shadow-sm dark:bg-zinc-900 dark:text-zinc-300 max-lg:bg-white/10 max-lg:text-white max-lg:shadow-none max-lg:dark:bg-white/10 sm:h-12 sm:w-12 sm:text-sm max-lg:sm:h-10 max-lg:sm:w-10">
            {getInitials(user.name)}
          </div>
          <span className="shrink-0 rounded-full bg-orange-200/70 px-2.5 py-0.5 text-[11px] font-semibold text-orange-800 dark:bg-orange-900/60 dark:text-orange-300 max-lg:order-last max-lg:ml-auto max-lg:bg-white/10 max-lg:font-medium max-lg:text-teal-50 max-lg:dark:bg-white/10 max-lg:dark:text-teal-50 sm:px-3 sm:py-1 sm:text-xs">
            {copy.scope}
          </span>
        </div>

        <div className="min-w-0 shrink-0 lg:mt-2">
          <p className="text-base font-bold leading-tight text-zinc-900 dark:text-zinc-50 max-lg:text-white sm:text-xl max-lg:sm:text-lg">
            {["Good", "day,"].map((word, i) => (
              <span key={word} className="mr-1.5 inline-block last:mr-0">
                <span
                  className="animate-greet-wave inline-block"
                  style={{ animationDelay: `${i * 0.12}s` }}
                >
                  {word}
                </span>
              </span>
            ))}
            <span
              className="animate-greet-wave-shimmer bg-gradient-to-r from-teal-600 via-orange-500 to-teal-600 bg-clip-text text-transparent max-lg:from-orange-200 max-lg:via-orange-400 max-lg:to-orange-200"
              style={{ animationDelay: "0.24s, 0s" }}
            >
              {user.name.split(" ")[0]}
            </span>
          </p>
          {/* Generic placeholder copy — only shown on desktop (lg+). */}
          <p className="mt-1 hidden text-sm text-zinc-700 dark:text-zinc-400 lg:block">
            {copy.description}
          </p>
        </div>
        </div>

        {/* Following Module */}
        <div className="mt-2 flex flex-col gap-1 rounded-xl border border-zinc-300 bg-white p-2.5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 max-lg:border-transparent sm:mt-4 max-lg:sm:mt-1 sm:p-4 lg:min-h-0 lg:flex-1">
          <div className="flex shrink-0 items-center gap-2">
            <IconAlert className="h-3.5 w-3.5 text-zinc-400 sm:h-4 sm:w-4" />
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 sm:text-base">
              Following Module
            </p>
          </div>
          {followUps.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No active follow-ups.
            </p>
          ) : (
            <div className="scrollbar-hidden mt-1.5 flex flex-col gap-1 pr-1 sm:mt-2 sm:gap-2 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
              {visibleFollowUps.map(({ patient, latestRiskLevel, reason }, index) => (
                <Link
                  key={patient.id}
                  href={`/dashboard/nurse/patients/${patient.id}`}
                  className={`${!showAllFollowUps && index >= MOBILE_LIST_CAP ? "hidden lg:flex" : "flex"} items-center gap-2 rounded-lg border-2 px-2 py-1 text-xs transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800 sm:gap-2.5 sm:px-3 sm:py-2 sm:text-sm ${RISK_ROW_BORDER[latestRiskLevel]}`}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-[10px] font-semibold text-teal-800 dark:bg-teal-950 dark:text-teal-300 sm:h-7 sm:w-7 sm:text-xs">
                    {getInitials(fullName(patient))}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium leading-snug text-zinc-900 dark:text-zinc-100">
                      {fullName(patient)}
                    </p>
                    <p className="hidden truncate text-xs text-zinc-500 dark:text-zinc-400 sm:block">
                      {reason === "high-risk"
                        ? "High risk — close follow-up"
                        : "No visit in 14 days"}
                    </p>
                  </div>
                  <RiskBadge level={latestRiskLevel} size="sm" />
                </Link>
              ))}
              {followUps.length > MOBILE_LIST_CAP && (
                <button
                  type="button"
                  onClick={() => setShowAllFollowUps((v) => !v)}
                  className={`${followUps.length > LIST_CAP ? "" : "lg:hidden"} shrink-0 px-1 text-left text-xs font-semibold text-teal-700 hover:underline dark:text-teal-400`}
                >
                  {showAllFollowUps ? (
                    "Show less"
                  ) : (
                    <>
                      <span className="lg:hidden">+{followUps.length - MOBILE_LIST_CAP} more</span>
                      <span className="hidden lg:inline">+{followUps.length - LIST_CAP} more</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
