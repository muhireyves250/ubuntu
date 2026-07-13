"use client";

import { useMemo } from "react";
import Link from "next/link";
import { RoleGuard } from "@/components/role-guard";
import { useReferrals, usePatients } from "@/lib/patients/use-patients";
import { getInitials, relativeTime, shortId, fullName } from "@/lib/format";

function ReferralLogContent() {
  const referrals = useReferrals();
  const patients = usePatients();

  const patientById = useMemo(
    () => new Map(patients.map((patient) => [patient.id, patient])),
    [patients],
  );

  const rows = useMemo(() => {
    return referrals
      .map((referral) => ({ referral, patient: patientById.get(referral.patientId) }))
      .filter((row) => row.patient)
      .sort((a, b) => b.referral.acceptedAt.localeCompare(a.referral.acceptedAt));
  }, [referrals, patientById]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-300 bg-[#ffeedb] px-4 py-3 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">
          Referral Log
        </h2>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {referrals.length} referral{referrals.length === 1 ? "" : "s"} accepted
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-300 bg-[#ffeedb] shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
        <div className="scrollbar-hidden max-h-[32rem] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-zinc-300 bg-[#ffeedb] text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-700 dark:bg-orange-950/40 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Facility</th>
                <th className="px-4 py-3">Accepted</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {rows.map(({ referral, patient }) => (
                <tr
                  key={referral.id}
                  className="bg-white transition-colors hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/60"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/nurse/patients/${patient!.id}`}
                      className="flex items-center gap-2.5 font-medium text-zinc-900 hover:text-teal-900 dark:text-zinc-50 dark:hover:text-teal-300"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                        {getInitials(fullName(patient!))}
                      </span>
                      <span>
                        {fullName(patient!)}
                        <span className="ml-2 font-mono text-xs text-zinc-400">
                          {shortId(patient!.id)}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                    {patient!.registrationFacility}
                  </td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                    <span title={referral.acceptedAt}>
                      {relativeTime(referral.acceptedAt)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      <span aria-hidden className="h-2 w-2 rounded-full bg-emerald-500" />
                      Active
                    </span>
                  </td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr className="bg-white dark:bg-zinc-900">
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400"
                  >
                    No referrals accepted yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function ReferralLogPage() {
  return (
    <RoleGuard path="/dashboard/nurse">
      <ReferralLogContent />
    </RoleGuard>
  );
}
