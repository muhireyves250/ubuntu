"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { useChwPatientsDue, useChwSummary, type ChwPatientDue } from "@/lib/patients/use-patients";
import { StatCard } from "@/components/dashboard/stat-card";
import { IconClipboard, IconClock, IconUsers } from "@/components/dashboard/icons";

function PatientRow({ patientDue }: { patientDue: ChwPatientDue }) {
  const router = useRouter();
  const { patient, nextDueDate, source, allHomeVisitsDone } = patientDue;
  return (
    <button
      type="button"
      onClick={() => router.push(`/dashboard/chw/patients/${patient.id}`)}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
    >
      <div className="min-w-0">
        <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">{patient.firstName} {patient.lastName}</p>
        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{patient.address.village}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {nextDueDate ? (
          <>
            <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700 dark:bg-teal-950/40 dark:text-teal-400">
              {source === "manual" ? "Extra visit" : "Home visit"}
            </span>
            <span className="text-xs text-zinc-400">Due {nextDueDate}</span>
          </>
        ) : allHomeVisitsDone ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
            All home visits done
          </span>
        ) : (
          <span className="text-xs text-zinc-400">No pregnancy on file</span>
        )}
      </div>
    </button>
  );
}

export function ChwDashboardContent() {
  const { user } = useAuth();
  // Sorted by first name, each with the next home visit due (from the API).
  const patients = useChwPatientsDue() ?? [];
  // Counters come from the API ("—" until they load).
  const summary = useChwSummary();
  const count = (n: number | undefined) => (n === undefined ? "—" : String(n));

  if (!user) return null;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Community Follow-up — {user.facility}
      </h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard icon={IconUsers} value={count(summary?.assigned)} label="Assigned Patients" accentClass="bg-teal-100 text-teal-700" />
        <StatCard icon={IconClipboard} value={count(summary?.dueToday)} label="Due Today" accentClass="bg-sky-100 text-sky-700" />
        <StatCard icon={IconClock} value={count(summary?.upcoming)} label="Upcoming" accentClass="bg-violet-100 text-violet-700" />
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">My Patients</h3>
        {patients.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-4 text-center text-sm text-zinc-400 dark:border-zinc-800">
            No patients assigned yet.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {patients.map((patientDue) => (
              <PatientRow key={patientDue.patient.id} patientDue={patientDue} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
