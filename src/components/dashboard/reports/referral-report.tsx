"use client";

import { useAuth } from "@/lib/auth/auth-context";
import { useReferrals } from "@/lib/patients/use-patients";
import { StatCard } from "@/components/dashboard/stat-card";
import { IconReport, IconCheckCircle, IconClock, IconAlert } from "@/components/dashboard/icons";

export function ReferralReport({ days }: { days?: number }) {
  const { user } = useAuth();
  const referrals = useReferrals();
  if (!user) return null;
  const facility = user.facility;

  const cutoff = days != null ? new Date(new Date().getTime() - days * 24 * 60 * 60 * 1000).toISOString() : null;
  const inWindow = referrals.filter((r) => !cutoff || r.createdAt >= cutoff);

  const incoming = inWindow.filter((r) => r.receivingFacility === facility || r.acceptedByFacility === facility).length;
  const outgoing = inWindow.filter((r) => r.referredByFacility === facility).length;
  const accepted = inWindow.filter((r) => r.status === "accepted" && r.acceptedByFacility === facility).length;
  const emergencyCount = inWindow.filter(
    (r) =>
      r.urgency === "emergency" &&
      (r.referredByFacility === facility || r.receivingFacility === facility || r.acceptedByFacility === facility),
  ).length;

  const acceptedWithTimestamps = inWindow.filter(
    (r) => r.acceptedByFacility === facility && r.acceptedAt,
  );
  const avgAcceptHours =
    acceptedWithTimestamps.length === 0
      ? null
      : acceptedWithTimestamps.reduce((sum, r) => {
          const ms = new Date(r.acceptedAt!).getTime() - new Date(r.createdAt).getTime();
          return sum + ms;
        }, 0) / acceptedWithTimestamps.length / (1000 * 60 * 60);

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      <StatCard icon={IconReport} value={String(incoming)} label="Incoming referrals" accentClass="bg-sky-100 text-sky-700" />
      <StatCard icon={IconReport} value={String(outgoing)} label="Outgoing referrals" accentClass="bg-violet-100 text-violet-700" />
      <StatCard icon={IconCheckCircle} value={String(accepted)} label="Accepted referrals" accentClass="bg-teal-100 text-teal-700" />
      <StatCard icon={IconAlert} value={String(emergencyCount)} label="Emergency referrals" accentClass="bg-red-100 text-red-700" />
      <StatCard
        icon={IconClock}
        value={avgAcceptHours == null ? "—" : `${avgAcceptHours.toFixed(1)}h`}
        label="Avg. time to accept"
        accentClass="bg-amber-100 text-amber-700"
      />
    </div>
  );
}
