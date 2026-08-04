"use client";

import Link from "next/link";
import type { AuthenticatedUser } from "@/lib/auth/auth-context";
import type { RoleOverviewCopy } from "@/lib/dashboard/role-copy";
import { getInitials, formatExactDateTime, fullName } from "@/lib/format";
import {
  useActiveReferrals,
  useFollowUpPatients,
  usePatients,
  usePregnancies,
} from "@/lib/patients/use-patients";
import { gestationalAgeWeeks, effectiveLmpDate } from "@/lib/patients/pregnancy";
import { RiskBadge } from "@/components/patients/risk-badge";
import { IconAlert, IconReport } from "./icons";
import type { RiskLevel, Referral } from "@/lib/patients/types";

const LIST_CAP = 4;
const REFERRALS_CAP = 3;

const RISK_ROW_BORDER: Record<RiskLevel, string> = {
  green: "border-emerald-200 hover:border-emerald-300 dark:border-emerald-900/60 dark:hover:border-emerald-700",
  yellow: "border-yellow-300 hover:border-yellow-400 dark:border-yellow-900/60 dark:hover:border-yellow-700",
  orange: "border-orange-300 hover:border-orange-400 dark:border-orange-900/60 dark:hover:border-orange-700",
  red: "border-red-300 hover:border-red-400 dark:border-red-900/60 dark:hover:border-red-700",
};

const URGENCY_ROW_BORDER: Record<Referral["urgency"], string> = {
  routine: "border-emerald-200 hover:border-emerald-300 dark:border-emerald-900/60 dark:hover:border-emerald-700",
  urgent: "border-orange-300 hover:border-orange-400 dark:border-orange-900/60 dark:hover:border-orange-700",
  emergency: "border-red-300 hover:border-red-400 dark:border-red-900/60 dark:hover:border-red-700",
};

export function SidePanel({
  user,
  copy,
}: {
  user: AuthenticatedUser;
  copy: RoleOverviewCopy;
}) {
  const activeReferrals = useActiveReferrals();
  const patients = usePatients();
  const pregnancies = usePregnancies();
  const followUps = useFollowUpPatients();

  const visibleFollowUps = followUps.slice(0, LIST_CAP);
  const visibleReferrals = activeReferrals.slice(0, REFERRALS_CAP);

  return (
    <div className="flex w-full flex-col gap-4 lg:w-80">
      {/* Greeting card */}
      <div className="flex flex-col gap-3 rounded-[1.25rem] border border-zinc-300 bg-[#ffeedb] p-6 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-sm font-semibold text-zinc-700 shadow-sm dark:bg-zinc-900 dark:text-zinc-300">
            {getInitials(user.name)}
          </div>
          <span className="rounded-full bg-orange-200/70 px-3 py-1 text-xs font-semibold text-orange-800 dark:bg-orange-900/60 dark:text-orange-300">
            {copy.scope}
          </span>
        </div>

        <div className="mt-2">
          <p className="text-xl font-bold leading-tight text-zinc-900 dark:text-zinc-50">
            Good day, {user.name.split(" ")[0]}
          </p>
          <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-400">
            {copy.description}
          </p>
        </div>

        {/* Following Module */}
        <div className="mt-4 flex flex-col gap-1 rounded-xl border border-zinc-300 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex items-center gap-2">
            <IconAlert className="h-4 w-4 text-zinc-400" />
            <p className="font-semibold text-zinc-900 dark:text-zinc-100">
              Following Module
            </p>
          </div>
          {followUps.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No active follow-ups.
            </p>
          ) : (
            <div className="mt-2 flex flex-col gap-2">
              {visibleFollowUps.map(({ patient, latestRiskLevel, reason }) => (
                <Link
                  key={patient.id}
                  href={`/dashboard/nurse/patients/${patient.id}`}
                  className={`flex items-center gap-2.5 rounded-lg border-2 px-3 py-2 text-sm transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800 ${RISK_ROW_BORDER[latestRiskLevel]}`}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                    {getInitials(fullName(patient))}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                      {fullName(patient)}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {reason === "high-risk"
                        ? "High risk — close follow-up"
                        : "No visit in 14 days"}
                    </p>
                  </div>
                  <RiskBadge level={latestRiskLevel} size="sm" />
                </Link>
              ))}
              {followUps.length > LIST_CAP && (
                <p className="px-1 text-xs text-zinc-400">
                  +{followUps.length - LIST_CAP} more
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Active Referrals */}
      <div className="rounded-[1.25rem] border border-zinc-300 bg-[#ffeedb] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:border-zinc-700 dark:bg-orange-950/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconReport className="h-4 w-4 text-zinc-400" />
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
              Active Referrals
            </h3>
          </div>
          <Link
            href="/dashboard/nurse/patients"
            className="text-sm font-medium text-teal-700 dark:text-teal-400"
          >
            View all
          </Link>
        </div>
        {activeReferrals.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
            No active referrals.
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {visibleReferrals.map((referral) => {
              const patient = patients.find((p) => p.id === referral.patientId);
              if (!patient) return null;
              const openPregnancy = pregnancies.find(
                (p) => p.patientId === patient.id && p.status === "open",
              );
              const gaWeeks = openPregnancy ? gestationalAgeWeeks(effectiveLmpDate(openPregnancy)) : null;
              return (
                <Link
                  key={referral.id}
                  href={`/dashboard/nurse/patients/${referral.patientId}`}
                  className={`flex items-center gap-2.5 rounded-lg border-2 bg-white px-3 py-2 text-sm transition-colors hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 ${URGENCY_ROW_BORDER[referral.urgency]}`}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                    {getInitials(fullName(patient))}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                      {fullName(patient)}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {gaWeeks !== null ? `${gaWeeks}w gestation` : "—"}
                    </p>
                  </div>
                  <p className="ml-2 shrink-0 text-xs text-zinc-400 dark:text-zinc-500">
                    {formatExactDateTime(referral.acceptedAt ?? referral.createdAt)}
                  </p>
                </Link>
              );
            })}
            {activeReferrals.length > REFERRALS_CAP && (
              <p className="px-1 text-xs text-zinc-400">
                +{activeReferrals.length - REFERRALS_CAP} more
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
