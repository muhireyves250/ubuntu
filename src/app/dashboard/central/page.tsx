"use client";

import { RoleGuard } from "@/components/role-guard";
import { StatCard } from "@/components/dashboard/stat-card";
import { RiskDistribution } from "@/components/dashboard/risk-distribution";
import { RiskBadge } from "@/components/patients/risk-badge";
import { IconAlert, IconClipboard, IconUsers } from "@/components/dashboard/icons";
import {
  useRiskSummary,
  usePatients,
  useVisits,
  useActiveReferrals,
} from "@/lib/patients/use-patients";

function CentralDashboardContent() {
  const summary = useRiskSummary();
  const patients = usePatients();
  const visits = useVisits();
  const referrals = useActiveReferrals();

  const facilityCounts = patients.reduce<Record<string, { total: number; red: number; orange: number }>>((acc, patient) => {
    if (!acc[patient.facility]) acc[patient.facility] = { total: 0, red: 0, orange: 0 };
    acc[patient.facility].total += 1;
    const latestVisit = visits
      .filter((v) => v.patientId === patient.id)
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    if (latestVisit?.riskLevel === "red") acc[patient.facility].red += 1;
    if (latestVisit?.riskLevel === "orange") acc[patient.facility].orange += 1;
    return acc;
  }, {});

  const facilityRows = Object.entries(facilityCounts).sort(
    (a, b) => b[1].red - a[1].red,
  );

  const statCards = [
    {
      icon: IconUsers,
      value: String(summary.totalPatients),
      label: "Total registered",
      accentClass: "bg-sky-100 text-sky-700",
    },
    {
      icon: IconAlert,
      value: String(summary.counts.red + summary.counts.orange),
      label: "High-risk nationally",
      accentClass: "bg-red-100 text-red-700",
    },
    {
      icon: IconClipboard,
      value: String(referrals.length),
      label: "Active referrals",
      accentClass: "bg-violet-100 text-violet-700",
    },
    {
      icon: IconAlert,
      value: `${summary.highRiskRate}%`,
      label: "National high-risk rate",
      accentClass: "bg-amber-100 text-amber-700",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          National Overview
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

        <div className="flex w-full flex-col gap-4 lg:w-96">
          <div className="rounded-[1.25rem] border border-zinc-300 bg-[#ffeedb] p-5 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
              Facilities by Risk Load
            </h3>
            <div className="mt-3 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
              <table className="w-full text-sm">
                <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-400 dark:border-zinc-700">
                  <tr>
                    <th className="px-4 py-2.5 text-left">Facility</th>
                    <th className="px-4 py-2.5 text-center">Patients</th>
                    <th className="px-4 py-2.5 text-center">Red</th>
                    <th className="px-4 py-2.5 text-center">Orange</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {facilityRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-zinc-500">
                        No data yet.
                      </td>
                    </tr>
                  ) : (
                    facilityRows.map(([facility, counts]) => (
                      <tr key={facility} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/60">
                        <td className="px-4 py-2.5 text-zinc-800 dark:text-zinc-200">{facility}</td>
                        <td className="px-4 py-2.5 text-center text-zinc-500">{counts.total}</td>
                        <td className="px-4 py-2.5 text-center">
                          {counts.red > 0 ? (
                            <RiskBadge level="red" size="sm" />
                          ) : (
                            <span className="text-zinc-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {counts.orange > 0 ? (
                            <RiskBadge level="orange" size="sm" />
                          ) : (
                            <span className="text-zinc-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CentralDashboardPage() {
  return (
    <RoleGuard path="/dashboard/central">
      <CentralDashboardContent />
    </RoleGuard>
  );
}
