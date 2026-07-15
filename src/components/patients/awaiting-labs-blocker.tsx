"use client";

import { IconAlert, IconActivity, IconCalendar, IconUsers, IconCheckCircle } from "@/components/dashboard/icons";
import { relativeTime } from "@/lib/format";
import type { Patient, Visit } from "@/lib/patients/types";

const STEPS = ["Requested", "Awaiting Results", "Unlocked"] as const;

export function AwaitingLabsBlocker({
  patient,
  visit,
}: {
  patient: Patient;
  visit: Visit;
}) {
  const isPending = visit.labStatus === "pending";
  // The request was already made (visit.date is in the past), so "Requested"
  // is always complete. "Awaiting Results" is the current step regardless of
  // whether the lab nurse has accepted it yet — isPending only changes the
  // status badge/icon color below, not which step is active.
  const activeStep = 1;

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 shadow-sm dark:border-zinc-800">
      <div className="border-b border-zinc-200 bg-[#ffeedb] px-6 py-4 dark:border-zinc-800 dark:bg-orange-950/40">
        <div className="mx-auto flex w-full max-w-sm items-center justify-between">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                    i < activeStep
                      ? "bg-teal-700 text-white"
                      : i === activeStep
                        ? "bg-amber-500 text-white"
                        : "bg-white text-zinc-400 dark:bg-zinc-900"
                  }`}
                >
                  {i < activeStep ? <IconCheckCircle className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span
                  className={`whitespace-nowrap text-[10px] font-medium ${
                    i <= activeStep ? "text-zinc-700 dark:text-zinc-300" : "text-zinc-400"
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`mx-1.5 h-0.5 flex-1 rounded-full ${
                    i < activeStep ? "bg-teal-700" : "bg-white dark:bg-zinc-800"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center gap-6 bg-white p-8 text-center dark:bg-zinc-900">
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

        <div className="grid w-full max-w-sm gap-2.5">
          <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/50">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">Status</span>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${isPending ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400'}`}>
              <span className="relative flex h-2 w-2 shadow-sm">
                <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${isPending ? "bg-amber-400" : "bg-blue-400"}`} />
                <span className={`relative inline-flex h-2 w-2 rounded-full ${isPending ? "bg-amber-500" : "bg-blue-500"}`} />
              </span>
              {isPending ? "Pending Acceptance" : "In Progress"}
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/50">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              <IconCalendar className="h-4 w-4" />
            </span>
            <div className="flex flex-1 items-center justify-between">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">Requested on</span>
              <span className="text-right text-sm font-medium text-zinc-900 dark:text-zinc-200">
                {visit.date}
                <span className="block text-xs font-normal text-zinc-400">{relativeTime(visit.date)}</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/50">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              <IconUsers className="h-4 w-4" />
            </span>
            <div className="flex flex-1 items-center justify-between">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">Requested by</span>
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-200">{visit.attendingNurse}</span>
            </div>
          </div>
        </div>

        <p className="flex items-center justify-center gap-2 rounded-lg bg-yellow-50 px-4 py-2.5 text-xs font-medium text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-400">
          <IconAlert className="h-4 w-4 shrink-0" />
          This profile will automatically unlock once the results are submitted.
        </p>
      </div>
    </div>
  );
}
