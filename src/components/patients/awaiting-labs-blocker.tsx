"use client";

import { IconAlert, IconActivity } from "@/components/dashboard/icons";
import type { Patient, Visit } from "@/lib/patients/types";

export function AwaitingLabsBlocker({
  patient,
  visit,
}: {
  patient: Patient;
  visit: Visit;
}) {
  const isPending = visit.labStatus === "pending";

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] gap-6 rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="relative">
        <div className={`absolute -inset-4 animate-pulse rounded-full opacity-50 ${isPending ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`} />
        <div className={`relative flex h-20 w-20 items-center justify-center rounded-full shadow-inner ${isPending ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400'}`}>
          <IconActivity className="h-10 w-10" />
        </div>
      </div>

      <div className="max-w-md space-y-2">
        <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
          Awaiting Laboratory Results
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          The assessment for <strong>{patient.firstName} {patient.lastName}</strong> is currently paused. Detailed laboratory tests have been requested and must be completed by the laboratory department before proceeding.
        </p>
      </div>

      <div className="mt-4 flex flex-col items-center gap-3 w-full max-w-sm rounded-xl border border-zinc-100 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-950/50">
        <div className="flex w-full items-center justify-between border-b border-zinc-200 pb-3 text-sm dark:border-zinc-800">
          <span className="text-zinc-500 dark:text-zinc-400">Status</span>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${isPending ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400'}`}>
            {isPending && <span className="relative flex h-2 w-2 shadow-sm"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span></span>}
            {!isPending && <span className="relative flex h-2 w-2 shadow-sm"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span></span>}
            {isPending ? "Pending Acceptance" : "In Progress"}
          </span>
        </div>
        <div className="flex w-full items-center justify-between pt-1 text-sm">
          <span className="text-zinc-500 dark:text-zinc-400">Requested On</span>
          <span className="font-medium text-zinc-900 dark:text-zinc-300">{visit.date}</span>
        </div>
        <div className="flex w-full items-center justify-between text-sm pt-1">
          <span className="text-zinc-500 dark:text-zinc-400">Requested By</span>
          <span className="font-medium text-zinc-900 dark:text-zinc-300">{visit.attendingNurse}</span>
        </div>
      </div>
      
      <p className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-yellow-50 px-4 py-2.5 text-xs font-medium text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-400">
        <IconAlert className="h-4 w-4 shrink-0" />
        This profile will automatically unlock once the results are submitted.
      </p>
    </div>
  );
}
