"use client";

import { useAuth } from "@/lib/auth/auth-context";
import { ROLE_OVERVIEW_COPY } from "@/lib/dashboard/role-copy";
import { useRiskSummary } from "@/lib/patients/use-patients";
import { IconAlert, IconClipboard, IconUsers } from "./icons";
import { StatCard } from "./stat-card";
import { RiskDistribution } from "./risk-distribution";
import { SidePanel } from "./side-panel";

export function DashboardOverview() {
  const { user } = useAuth();
  const summary = useRiskSummary();
  if (!user) return null;

  const copy = ROLE_OVERVIEW_COPY[user.role];

  const statCards = [
    {
      icon: IconUsers,
      value: String(summary.totalPatients),
      label: "Patients registered",
      accentClass: "bg-sky-100 text-sky-700",
    },
    {
      icon: IconClipboard,
      value: String(summary.totalVisits),
      label: "ANC visits logged",
      accentClass: "bg-violet-100 text-violet-700",
    },
    {
      icon: IconAlert,
      value: String(summary.counts.red),
      label: "Active red cases",
      accentClass: "bg-red-100 text-red-700",
    },
    {
      icon: IconAlert,
      value: String(summary.counts.orange + summary.counts.yellow),
      label: "Pending follow-ups",
      accentClass: "bg-amber-100 text-amber-700",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Overview
        </h1>
        <select
          disabled
          className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <option>Last 30 days</option>
        </select>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex flex-1 flex-col gap-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {statCards.map((card) => (
              <StatCard key={card.label} {...card} />
            ))}
          </div>

          <RiskDistribution
            counts={summary.counts}
            highRiskRate={summary.highRiskRate}
          />
        </div>

        <SidePanel user={user} copy={copy} />
      </div>
    </div>
  );
}
