"use client";

import { useAuth } from "@/lib/auth/auth-context";
import { useStaffPerformanceReport, type WorkloadRow } from "@/lib/reports/reports-api";

function WorkloadTable({ title, rows, emptyLabel }: { title: string; rows: WorkloadRow[]; emptyLabel: string }) {
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
  const report = useStaffPerformanceReport(days);

  if (!user) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <WorkloadTable title="ANC Nurse Workload (visits logged)" rows={report?.ancNurses ?? []} emptyLabel="No visits in this window." />
      <WorkloadTable title="Laboratory Nurse Workload (requests fulfilled)" rows={report?.labNurses ?? []} emptyLabel="No lab requests accepted in this window." />
      <WorkloadTable title="Emergency Cases Accepted (by nurse)" rows={report?.emergencyAcceptances ?? []} emptyLabel="No emergency cases accepted in this window." />
      <WorkloadTable title="Specialist Recommendations Authored" rows={report?.recommendations ?? []} emptyLabel="No recommendations in this window." />
    </div>
  );
}
