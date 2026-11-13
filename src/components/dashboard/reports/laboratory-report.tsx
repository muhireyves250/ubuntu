"use client";

import { useAuth } from "@/lib/auth/auth-context";
import { formatHours, useLaboratoryReport } from "@/lib/reports/reports-api";
import { StatCard } from "@/components/dashboard/stat-card";
import { IconClipboard, IconCheckCircle, IconClock, IconAlertTriangle } from "@/components/dashboard/icons";

export function LaboratoryReport({ days }: { days?: number }) {
  const { user } = useAuth();
  const report = useLaboratoryReport(days);

  if (!user) return null;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      <StatCard icon={IconClipboard} value={String(report?.requests ?? 0)} label="Laboratory requests" accentClass="bg-sky-100 text-sky-700" />
      <StatCard icon={IconCheckCircle} value={String(report?.completed ?? 0)} label="Completed tests" accentClass="bg-teal-100 text-teal-700" />
      <StatCard icon={IconClock} value={String(report?.pending ?? 0)} label="Pending requests" accentClass="bg-amber-100 text-amber-700" />
      <StatCard icon={IconAlertTriangle} value={String(report?.critical ?? 0)} label="Critical results" accentClass="bg-red-100 text-red-700" />
      <StatCard
        icon={IconClock}
        value={formatHours(report?.averageHoursToAccept)}
        label="Avg. request-to-acceptance"
        accentClass="bg-violet-100 text-violet-700"
      />
    </div>
  );
}
