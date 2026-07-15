"use client";

import { IconLock, IconClock, IconCheckCircle, IconBuilding } from "@/components/dashboard/icons";
import { getInitials, fullName } from "@/lib/format";
import type { Patient } from "@/lib/patients/types";

const STEPS = ["Visit Opened", "In Progress", "Unlocks"] as const;

function StatusChip({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-left dark:border-zinc-800 dark:bg-zinc-950/50">
      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
        {icon}
        {label}
      </span>
      <span
        className={`text-sm font-semibold ${
          accent
            ? "text-amber-700 dark:text-amber-400"
            : "text-zinc-800 dark:text-zinc-200"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export function PatientLockedBlocker({
  patient,
  lockedByFacility,
}: {
  patient: Patient;
  lockedByFacility: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 shadow-sm dark:border-zinc-800">
      <div className="border-b border-zinc-200 bg-[#ffeedb] px-6 py-4 dark:border-zinc-800 dark:bg-orange-950/40">
        <div className="mx-auto flex w-full max-w-sm items-center justify-between">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold shadow-sm ${
                    i === 0
                      ? "bg-teal-700 text-white"
                      : i === 1
                        ? "bg-amber-500 text-white"
                        : "bg-white text-zinc-400 dark:bg-zinc-900"
                  }`}
                >
                  {i === 0 ? <IconCheckCircle className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span
                  className={`whitespace-nowrap text-[10px] font-medium ${
                    i <= 1 ? "text-zinc-700 dark:text-zinc-300" : "text-zinc-400"
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < 2 && (
                <div
                  className={`mx-1.5 h-0.5 flex-1 rounded-full ${
                    i < 1 ? "bg-teal-700" : "bg-white dark:bg-zinc-800"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center gap-6 bg-white p-8 text-center dark:bg-zinc-900">
        <div className="relative">
          <div className="absolute -inset-4 animate-pulse rounded-full bg-amber-100 opacity-50 dark:bg-amber-900/30" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 text-amber-600 shadow-inner dark:bg-amber-950/50 dark:text-amber-400">
            <IconLock className="h-9 w-9" />
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2.5 rounded-full border border-zinc-200 bg-zinc-50 py-1.5 pl-1.5 pr-4 dark:border-zinc-800 dark:bg-zinc-950/50">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-800 dark:bg-teal-950 dark:text-teal-300">
              {getInitials(fullName(patient))}
            </span>
            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              {fullName(patient)}
            </span>
          </div>

          <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
            Record In Use
          </h3>
          <p className="max-w-md text-sm text-zinc-500 dark:text-zinc-400">
            This patient has an ongoing visit at{" "}
            <strong className="font-semibold text-zinc-700 dark:text-zinc-200">
              {lockedByFacility}
            </strong>
            . Clinical details are locked to that facility until the visit is completed, to
            prevent two facilities from working on the same case at once.
          </p>
        </div>

        <div className="grid w-full max-w-lg grid-cols-1 gap-2.5 sm:grid-cols-3">
          <StatusChip
            icon={<IconLock className="h-3.5 w-3.5" />}
            label="Status"
            value="Locked"
            accent
          />
          <StatusChip
            icon={<IconBuilding className="h-3.5 w-3.5" />}
            label="Locked by"
            value={lockedByFacility}
          />
          <StatusChip
            icon={<IconCheckCircle className="h-3.5 w-3.5" />}
            label="Unlocks when"
            value="Visit finalized"
          />
        </div>

        <div className="flex w-full max-w-lg items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left dark:border-amber-900/50 dark:bg-amber-950/30">
          <IconClock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-xs text-amber-800 dark:text-amber-400">
            This record will unlock automatically once {lockedByFacility} finishes and
            finalizes the visit — no action is needed here.
          </p>
        </div>
      </div>
    </div>
  );
}
