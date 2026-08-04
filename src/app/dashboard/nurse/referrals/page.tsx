"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { RoleGuard } from "@/components/role-guard";
import { useReferrals, usePatients } from "@/lib/patients/use-patients";
import { useAuth } from "@/lib/auth/auth-context";
import { getInitials, formatExactDateTime, fullName } from "@/lib/format";
import { CloseReferralModal } from "@/components/dashboard/close-referral-modal";
import type { ReferralOutcome, ReferralStatus } from "@/lib/patients/types";

const STATUS_FILTERS: { value: "all" | ReferralStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "closed", label: "Closed" },
];

const STATUS_BADGE: Record<ReferralStatus, string> = {
  pending: "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400",
  accepted: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  closed: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

const OUTCOME_TEXT_COLOR: Record<ReferralOutcome, string> = {
  stable: "text-amber-700 dark:text-amber-400",
  improved: "text-amber-700 dark:text-amber-400",
  recovered: "text-emerald-700 dark:text-emerald-400",
  admitted: "text-amber-700 dark:text-amber-400",
  delivered: "text-emerald-700 dark:text-emerald-400",
  referred: "text-amber-700 dark:text-amber-400",
  discharged: "text-emerald-700 dark:text-emerald-400",
  maternal_death: "text-red-700 dark:text-red-400",
  fetal_death: "text-red-700 dark:text-red-400",
};

function ReferralLogContent() {
  const referrals = useReferrals();
  const patients = usePatients();
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<"all" | ReferralStatus>("all");
  const [closeTargetId, setCloseTargetId] = useState<string | null>(null);

  const patientById = useMemo(
    () => new Map(patients.map((patient) => [patient.id, patient])),
    [patients],
  );

  const rows = useMemo(() => {
    return referrals
      .filter(
        (r) =>
          r.referredByFacility === user?.facility ||
          r.receivingFacility === user?.facility ||
          r.acceptedByFacility === user?.facility,
      )
      .map((referral) => ({ referral, patient: patientById.get(referral.patientId) }))
      .filter((row) => row.patient)
      .filter((row) => statusFilter === "all" || row.referral.status === statusFilter)
      .sort((a, b) => b.referral.createdAt.localeCompare(a.referral.createdAt));
  }, [referrals, patientById, statusFilter, user?.facility]);

  const closeTarget = rows.find((row) => row.referral.id === closeTargetId);

  return (
    <div className="flex flex-col gap-5">
      {closeTarget && closeTarget.patient && (
        <CloseReferralModal
          referral={closeTarget.referral}
          patientName={fullName(closeTarget.patient)}
          onClose={() => setCloseTargetId(null)}
          onClosed={() => setCloseTargetId(null)}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-300 bg-[#ffeedb] px-4 py-3 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">
          Referral Log
        </h2>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {referrals.length} referral{referrals.length === 1 ? "" : "s"} total
        </span>
      </div>

      <div className="flex w-fit gap-1 rounded-full border border-zinc-300 bg-[#ffeedb] p-1 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setStatusFilter(filter.value)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              statusFilter === filter.value
                ? "bg-[#0f766e] text-white shadow-sm"
                : "text-zinc-600 hover:bg-white/60 dark:text-zinc-300"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-300 bg-[#ffeedb] shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
        <div className="scrollbar-hidden max-h-[32rem] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-zinc-300 bg-[#ffeedb] text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-700 dark:bg-orange-950/40 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Receiving Facility</th>
                <th className="px-4 py-3">Referred</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Outcome</th>
                <th className="px-4 py-3" />
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
                      {fullName(patient!)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                    {referral.receivingFacility}
                  </td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                    <span title={referral.createdAt}>{formatExactDateTime(referral.createdAt)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STATUS_BADGE[referral.status]}`}>
                      {referral.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                    {referral.outcome ? (
                      <span className={`capitalize ${OUTCOME_TEXT_COLOR[referral.outcome]}`}>
                        {referral.outcome.replace(/_/g, " ")}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {referral.status === "accepted" && referral.acceptedByFacility === user?.facility && (
                      <button
                        type="button"
                        onClick={() => setCloseTargetId(referral.id)}
                        className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      >
                        Close Case
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr className="bg-white dark:bg-zinc-900">
                  <td colSpan={6} className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400">
                    No referrals match this filter.
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
    <RoleGuard roles={["nurse", "gynecologist", "hospital_admin"]}>
      <ReferralLogContent />
    </RoleGuard>
  );
}
