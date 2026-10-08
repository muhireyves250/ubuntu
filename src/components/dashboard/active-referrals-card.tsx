"use client";

import { useState } from "react";
import Link from "next/link";
import { getInitials, formatExactDateTime, fullName } from "@/lib/format";
import { useActiveReferrals, usePatients, usePregnancies } from "@/lib/patients/use-patients";
import { gestationalAgeWeeks, effectiveLmpDate } from "@/lib/patients/pregnancy";
import { IconReport } from "./icons";
import type { Referral } from "@/lib/patients/types";

const REFERRALS_CAP = 2;

const URGENCY_ROW_BORDER: Record<Referral["urgency"], string> = {
  routine: "border-emerald-200 hover:border-emerald-300 dark:border-emerald-900/60 dark:hover:border-emerald-700",
  urgent: "border-orange-300 hover:border-orange-400 dark:border-orange-900/60 dark:hover:border-orange-700",
  emergency: "border-red-300 hover:border-red-400 dark:border-red-900/60 dark:hover:border-red-700",
};

export function ActiveReferralsCard() {
  const activeReferrals = useActiveReferrals();
  const patients = usePatients();
  const pregnancies = usePregnancies();
  const [showAllReferrals, setShowAllReferrals] = useState(false);

  const visibleReferrals = showAllReferrals ? activeReferrals : activeReferrals.slice(0, REFERRALS_CAP);

  return (
    <div className="@container flex h-full flex-col rounded-[1.25rem] border border-zinc-300 bg-[#ffeedb] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:border-zinc-700 dark:bg-orange-950/40">
      <div className="flex shrink-0 items-center justify-between">
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
        <div className="scrollbar-hidden mt-3 flex flex-col gap-2 pr-1 ">
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
                  <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {gaWeeks !== null ? `${gaWeeks}w gestation` : "—"}
                  </p>
                  {/* Narrow card: the date drops under the name so the name
                      keeps the full row width. */}
                  <p className="truncate text-[11px] text-zinc-400 dark:text-zinc-500 @[24rem]:hidden">
                    {formatExactDateTime(referral.acceptedAt ?? referral.createdAt)}
                  </p>
                </div>
                <p className="ml-2 hidden max-w-[6.5rem] shrink-0 text-right text-xs text-zinc-400 dark:text-zinc-500 @[24rem]:block">
                  {formatExactDateTime(referral.acceptedAt ?? referral.createdAt)}
                </p>
              </Link>
            );
          })}
          {activeReferrals.length > REFERRALS_CAP && (
            <button
              type="button"
              onClick={() => setShowAllReferrals((v) => !v)}
              className="shrink-0 px-1 text-left text-xs font-semibold text-teal-700 hover:underline dark:text-teal-400"
            >
              {showAllReferrals ? "Show less" : `+${activeReferrals.length - REFERRALS_CAP} more`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
