"use client";

import Link from "next/link";
import type { DemoUser } from "@/lib/auth/types";
import type { RoleOverviewCopy } from "@/lib/dashboard/role-copy";
import { getInitials, relativeTime } from "@/lib/format";
import {
  useActiveReferrals,
  useFollowUpPatients,
  usePatients,
  useTodaysVisits,
} from "@/lib/patients/use-patients";
import { RiskBadge } from "@/components/patients/risk-badge";

export function SidePanel({
  user,
  copy,
}: {
  user: DemoUser;
  copy: RoleOverviewCopy;
}) {
  const activeReferrals = useActiveReferrals();
  const patients = usePatients();
  const followUps = useFollowUpPatients();
  const todaysVisits = useTodaysVisits();

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
          <p className="font-semibold text-zinc-900 dark:text-zinc-100">
            Following Module
          </p>
          {followUps.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No active follow-ups.
            </p>
          ) : (
            <div className="mt-2 flex flex-col gap-2">
              {followUps.map(({ patient, latestRiskLevel, reason }) => (
                <Link
                  key={patient.id}
                  href={`/dashboard/nurse/patients/${patient.id}`}
                  className="flex items-center justify-between rounded-lg border border-zinc-100 px-3 py-2 text-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                      {patient.name}
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
            </div>
          )}
        </div>
      </div>

      {/* Active Referrals */}
      <div className="rounded-[1.25rem] border border-zinc-300 bg-[#ffeedb] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:border-zinc-700 dark:bg-orange-950/40">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
            Active Referrals
          </h3>
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
            {activeReferrals.map((referral) => {
              const patient = patients.find((p) => p.id === referral.patientId);
              if (!patient) return null;
              return (
                <Link
                  key={referral.id}
                  href={`/dashboard/nurse/patients/${referral.patientId}`}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                      {patient.name}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {patient.gestationalAgeWeeks}w gestation
                    </p>
                  </div>
                  <p className="ml-2 shrink-0 text-xs text-zinc-400 dark:text-zinc-500">
                    {relativeTime(referral.acceptedAt)}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Today's ANC Visits */}
      <div className="rounded-[1.25rem] border border-zinc-300 bg-[#ffeedb] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:border-zinc-700 dark:bg-orange-950/40">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
            Today&apos;s ANC Visits
          </h3>
          <Link
            href="/dashboard/nurse/patients"
            className="rounded-md border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-600 dark:border-zinc-800 dark:text-zinc-300"
          >
            View Weekly
          </Link>
        </div>
        {todaysVisits.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
            No visits recorded today.
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {todaysVisits.map(({ visit, patient }) => {
              if (!patient) return null;
              return (
                <Link
                  key={visit.id}
                  href={`/dashboard/nurse/patients/${patient.id}`}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                >
                  <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                    {patient.name}
                  </p>
                  <RiskBadge level={visit.riskLevel} size="sm" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
