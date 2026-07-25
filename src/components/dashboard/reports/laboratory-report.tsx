"use client";

import { useAuth } from "@/lib/auth/auth-context";
import { useLabRequests } from "@/lib/patients/lab-requests";
import { StatCard } from "@/components/dashboard/stat-card";
import { IconClipboard, IconCheckCircle, IconClock, IconAlertTriangle } from "@/components/dashboard/icons";

export function LaboratoryReport({ days }: { days?: number }) {
  const { user } = useAuth();
  const requests = useLabRequests();

  if (!user) return null;

  const cutoff = days != null ? new Date(new Date().getTime() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) : null;
  const inWindow = requests.filter((r) => !cutoff || r.requestDate >= cutoff);

  const completed = inWindow.filter((r) => r.status === "Completed").length;
  const pending = inWindow.filter((r) => r.status === "Pending" || r.status === "In Progress").length;
  const critical = inWindow.filter((r) => r.results.some((res) => res.interpretation === "Critical")).length;

  const acceptedWithTimestamps = inWindow.filter((r) => r.acceptedAt);
  const avgAcceptHours =
    acceptedWithTimestamps.length === 0
      ? null
      : acceptedWithTimestamps.reduce((sum, r) => {
          const ms = new Date(r.acceptedAt!).getTime() - new Date(r.requestDate).getTime();
          return sum + ms;
        }, 0) / acceptedWithTimestamps.length / (1000 * 60 * 60);

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      <StatCard icon={IconClipboard} value={String(inWindow.length)} label="Laboratory requests" accentClass="bg-sky-100 text-sky-700" />
      <StatCard icon={IconCheckCircle} value={String(completed)} label="Completed tests" accentClass="bg-teal-100 text-teal-700" />
      <StatCard icon={IconClock} value={String(pending)} label="Pending requests" accentClass="bg-amber-100 text-amber-700" />
      <StatCard icon={IconAlertTriangle} value={String(critical)} label="Critical results" accentClass="bg-red-100 text-red-700" />
      <StatCard
        icon={IconClock}
        value={avgAcceptHours == null ? "—" : `${avgAcceptHours.toFixed(1)}h`}
        label="Avg. request-to-acceptance"
        accentClass="bg-violet-100 text-violet-700"
      />
    </div>
  );
}
