"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { useVisits, useReferrals, useAllRecommendations } from "@/lib/patients/use-patients";
import { getLabRequests, subscribeToLabRequests, type LabRequest } from "@/lib/patients/lab-requests";

function tally(names: string[]): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const name of names) {
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

function WorkloadTable({ title, rows, emptyLabel }: { title: string; rows: { name: string; count: number }[]; emptyLabel: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">{title}</p>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-400">{emptyLabel}</p>
      ) : (
        <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
          {rows.map((row) => (
            <div key={row.name} className="flex items-center justify-between py-1.5 text-sm">
              <span className="text-zinc-700 dark:text-zinc-300">{row.name}</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-50">{row.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function StaffPerformanceReport({ days }: { days?: number }) {
  const { user } = useAuth();
  const visits = useVisits();
  const referrals = useReferrals();
  const recommendations = useAllRecommendations();
  const [labRequests, setLabRequests] = useState<LabRequest[]>(() => (user ? getLabRequests(user.facility) : []));

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToLabRequests(() => {
      setLabRequests(getLabRequests(user.facility));
    });
    return () => { unsubscribe(); };
  }, [user]);

  if (!user) return null;
  const facility = user.facility;

  const cutoff = days != null ? new Date(new Date().getTime() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) : null;

  const ancNurseWorkload = tally(
    visits
      .filter((v) => v.hospital === facility && v.type !== "emergency" && (!cutoff || v.date >= cutoff))
      .map((v) => v.attendingNurse),
  );
  const labNurseWorkload = tally(
    labRequests.filter((r) => r.acceptedBy && (!cutoff || r.requestDate >= cutoff)).map((r) => r.acceptedBy!),
  );
  const gynecologistWorkload = tally(
    referrals
      .filter((r) => r.acceptedByFacility === facility && r.urgency === "emergency" && r.acceptedByNurse && (!cutoff || r.createdAt.slice(0, 10) >= (cutoff ?? "")))
      .map((r) => r.acceptedByNurse!),
  );
  const recommendationWorkload = tally(
    recommendations
      .filter((r) => r.createdByFacility === facility && (!cutoff || r.createdAt.slice(0, 10) >= (cutoff ?? "")))
      .map((r) => r.createdByGynecologist),
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <WorkloadTable title="ANC Nurse Workload (visits logged)" rows={ancNurseWorkload} emptyLabel="No visits in this window." />
      <WorkloadTable title="Laboratory Nurse Workload (requests fulfilled)" rows={labNurseWorkload} emptyLabel="No lab requests accepted in this window." />
      <WorkloadTable title="Emergency Cases Accepted (by nurse)" rows={gynecologistWorkload} emptyLabel="No emergency cases accepted in this window." />
      <WorkloadTable title="Specialist Recommendations Authored" rows={recommendationWorkload} emptyLabel="No recommendations in this window." />
    </div>
  );
}
