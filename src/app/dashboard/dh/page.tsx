"use client";

import Link from "next/link";
import { RoleGuard } from "@/components/role-guard";
import { RiskBadge } from "@/components/patients/risk-badge";
import { StatCard } from "@/components/dashboard/stat-card";
import { RiskDistribution } from "@/components/dashboard/risk-distribution";
import { IconAlert, IconClipboard, IconUsers } from "@/components/dashboard/icons";
import {
  useRiskSummary,
  useActiveReferrals,
  usePatients,
  useFollowUpPatients,
} from "@/lib/patients/use-patients";
import { getInitials, relativeTime, fullName } from "@/lib/format";

function DhDashboardContent() {
  const summary = useRiskSummary();
  const referrals = useActiveReferrals();
  const patients = usePatients();
  const followUps = useFollowUpPatients();

  const patientById = new Map(patients.map((p) => [p.id, p]));

  const statCards = [
    {
      icon: IconAlert,
      value: String(referrals.length),
      label: "Incoming referrals",
      accentClass: "bg-violet-100 text-violet-700",
    },
    {
      icon: IconAlert,
      value: String(summary.counts.red),
      label: "Emergency cases",
      accentClass: "bg-red-100 text-red-700",
    },
    {
      icon: IconUsers,
      value: String(summary.totalPatients),
      label: "Total patients",
      accentClass: "bg-sky-100 text-sky-700",
    },
    {
      icon: IconClipboard,
      value: `${summary.highRiskRate}%`,
      label: "High-risk rate",
      accentClass: "bg-amber-100 text-amber-700",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          District Hospital Overview
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex flex-1 flex-col gap-6">
          <RiskDistribution counts={summary.counts} highRiskRate={summary.highRiskRate} />
        </div>

        <div className="flex w-full flex-col gap-4 lg:w-80">
          {/* Incoming Referrals */}
          <div className="rounded-[1.25rem] border border-zinc-300 bg-[#ffeedb] p-5 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                Incoming Referrals
              </h3>
              <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">
                {referrals.length} active
              </span>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {referrals.length === 0 ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">No active referrals.</p>
              ) : (
                referrals.slice(0, 5).map((referral) => {
                  const patient = patientById.get(referral.patientId);
                  if (!patient) return null;
                  return (
                    <div
                      key={referral.id}
                      className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                        {getInitials(fullName(patient))}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          {fullName(patient)}
                        </p>
                        <p className="text-xs text-zinc-500">{relativeTime(referral.acceptedAt)}</p>
                      </div>
                      {referral.urgency && (
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                          referral.urgency === "emergency"
                            ? "bg-red-100 text-red-700"
                            : referral.urgency === "urgent"
                              ? "bg-orange-100 text-orange-700"
                              : "bg-teal-50 text-teal-700"
                        }`}>
                          {referral.urgency}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            {referrals.length > 0 && (
              <Link
                href="/dashboard/nurse/referrals"
                className="mt-3 block text-center text-sm font-medium text-teal-700 hover:text-teal-600 dark:text-teal-400"
              >
                View all referrals →
              </Link>
            )}
          </div>

          {/* High-Risk Follow-ups */}
          <div className="rounded-[1.25rem] border border-zinc-300 bg-[#ffeedb] p-5 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
              High-Risk Cases
            </h3>
            <div className="mt-3 flex flex-col gap-2">
              {followUps.filter((f) => f.reason === "high-risk").length === 0 ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">No high-risk cases.</p>
              ) : (
                followUps
                  .filter((f) => f.reason === "high-risk")
                  .slice(0, 4)
                  .map(({ patient, latestRiskLevel }) => (
                    <div
                      key={patient.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                    >
                      <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {fullName(patient)}
                      </p>
                      <RiskBadge level={latestRiskLevel} size="sm" />
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DhDashboardPage() {
  return (
    <RoleGuard path="/dashboard/dh">
      <DhDashboardContent />
    </RoleGuard>
  );
}
