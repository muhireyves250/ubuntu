"use client";

import { useAuth } from "@/lib/auth/auth-context";
import { formatHours, useReferralReport } from "@/lib/reports/reports-api";
import { StatCard } from "@/components/dashboard/stat-card";
import { IconReport, IconCheckCircle, IconClock, IconAlert } from "@/components/dashboard/icons";

export function ReferralReport({ days }: { days?: number }) {
  const { user } = useAuth();
  const report = useReferralReport(days);
  if (!user) return null;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      <StatCard icon={IconReport} value={String(report?.incoming ?? 0)} label="Incoming referrals" accentClass="bg-sky-100 text-sky-700" />
      <StatCard icon={IconReport} value={String(report?.outgoing ?? 0)} label="Outgoing referrals" accentClass="bg-violet-100 text-violet-700" />
      <StatCard icon={IconCheckCircle} value={String(report?.accepted ?? 0)} label="Accepted referrals" accentClass="bg-teal-100 text-teal-700" />
      <StatCard icon={IconAlert} value={String(report?.emergency ?? 0)} label="Emergency referrals" accentClass="bg-red-100 text-red-700" />
      <StatCard
        icon={IconClock}
        value={formatHours(report?.averageHoursToAccept)}
        label="Avg. time to accept"
        accentClass="bg-amber-100 text-amber-700"
      />
    </div>
  );
}
