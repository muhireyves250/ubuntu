"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { ROLE_OVERVIEW_COPY } from "@/lib/dashboard/role-copy";
import {
  useRiskSummary,
  useFacilityCapacity,
  DEFAULT_CAPACITY,
  setFacilityMaxCapacity,
  useReferrals,
} from "@/lib/patients/use-patients";
import { IconAlert, IconClipboard, IconUsers } from "./icons";
import { StatCard } from "./stat-card";
import { RiskDistribution } from "./risk-distribution";
import { TodaysVisitsCard } from "./todays-visits-card";
import { SidePanel } from "./side-panel";

const RANGE_OPTIONS: { value: string; label: string; days?: number }[] = [
  { value: "7", label: "Last 7 days", days: 7 },
  { value: "30", label: "Last 30 days", days: 30 },
  { value: "90", label: "Last 90 days", days: 90 },
  { value: "all", label: "All time", days: undefined },
];

export function DashboardOverview() {
  const { user } = useAuth();
  const [range, setRange] = useState("30");
  const selectedDays = RANGE_OPTIONS.find((r) => r.value === range)?.days;
  const summary = useRiskSummary(selectedDays);
  const capacity = useFacilityCapacity(user?.facility ?? "");
  const referrals = useReferrals();
  const [capacityDraft, setCapacityDraft] = useState<string>("");
  const [isEditingCapacity, setIsEditingCapacity] = useState(false);
  if (!user) return null;

  const hasCapacityConfig = capacity.max !== DEFAULT_CAPACITY;
  const isHospitalAdmin = user.role === "hospital_admin";

  const referralCounts = {
    pending: referrals.filter(
      (r) => r.status === "pending" && (r.referredByFacility === user.facility || r.receivingFacility === user.facility),
    ).length,
    accepted: referrals.filter((r) => r.status === "accepted" && r.acceptedByFacility === user.facility).length,
    closed: referrals.filter(
      (r) => r.status === "closed" && (r.referredByFacility === user.facility || r.acceptedByFacility === user.facility),
    ).length,
  };

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
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
        >
          {RANGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {(hasCapacityConfig || isHospitalAdmin) && (
        <div
          className={`flex flex-wrap items-center gap-2.5 rounded-xl border px-4 py-2.5 text-sm font-medium ${
            capacity.status === "full"
              ? "border-red-300 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
              : capacity.status === "nearly_full"
                ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300"
                : "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
          }`}
        >
          <span>
            {user.facility}: {capacity.active}/{capacity.max} active emergency cases
          </span>
          <span className="rounded-full bg-white/60 px-2 py-0.5 text-xs font-bold uppercase tracking-wide dark:bg-black/20">
            {capacity.status === "full" ? "Full" : capacity.status === "nearly_full" ? "Nearly Full" : "Available"}
          </span>
          {isHospitalAdmin && (
            isEditingCapacity ? (
              <form
                className="flex items-center gap-1.5"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const parsed = Number(capacityDraft);
                  if (Number.isFinite(parsed) && parsed >= 0) {
                    await setFacilityMaxCapacity(parsed);
                    setIsEditingCapacity(false);
                  }
                }}
              >
                <input
                  type="number"
                  min={0}
                  autoFocus
                  value={capacityDraft}
                  onChange={(e) => setCapacityDraft(e.target.value)}
                  className="w-16 rounded-md border border-current bg-white/80 px-2 py-1 text-xs text-zinc-900 outline-none dark:bg-zinc-900 dark:text-zinc-50"
                />
                <button type="submit" className="rounded-md bg-white/60 px-2 py-1 text-xs font-semibold dark:bg-black/20">
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingCapacity(false)}
                  className="text-xs underline"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => { setCapacityDraft(String(capacity.max)); setIsEditingCapacity(true); }}
                className="rounded-md bg-white/60 px-2 py-1 text-xs font-semibold underline dark:bg-black/20"
              >
                Edit limit
              </button>
            )
          )}
        </div>
      )}

      {isHospitalAdmin && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{referralCounts.pending}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Pending referrals</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">{referralCounts.accepted}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Accepted referrals</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-2xl font-bold text-zinc-600 dark:text-zinc-400">{referralCounts.closed}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Closed referrals</p>
          </div>
        </div>
      )}

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

          <TodaysVisitsCard />
        </div>

        <SidePanel user={user} copy={copy} />
      </div>
    </div>
  );
}
