"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { usePatientsForChw, useFollowUpAssignmentsForChw, usePregnanciesForPatient, useCommunityVisitsForPregnancy } from "@/lib/patients/use-patients";
import { chwVisitSchedule } from "@/lib/patients/pregnancy";
import { StatCard } from "@/components/dashboard/stat-card";
import { IconClipboard, IconClock, IconUsers } from "@/components/dashboard/icons";
import type { Patient } from "@/lib/patients/types";

interface PatientDue {
  patient: Patient;
  nextDueDate: string | null;
  source: "automatic" | "manual" | null;
  allHomeVisitsDone: boolean;
}

function PatientRow({ patientDue }: { patientDue: PatientDue }) {
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

function PregnancyAwarePatientList({ patients }: { patients: Patient[] }) {
  // Each patient's automatic due date depends on their own active pregnancy,
  // which must be fetched per-patient — this component resolves that per row.
  return (
    <div className="flex flex-col gap-2">
      {patients.map((patient) => (
        <PatientRowWithSchedule key={patient.id} patient={patient} />
      ))}
    </div>
  );
}

function PatientRowWithSchedule({ patient }: { patient: Patient }) {
  const pregnancies = usePregnanciesForPatient(patient.id);
  const openPregnancy = pregnancies.find((p) => p.status === "open") ?? null;
  const assignments = useFollowUpAssignmentsForChw();
  const communityVisits = useCommunityVisitsForPregnancy(openPregnancy?.id ?? "");

  const { nextDueDate, source, allHomeVisitsDone } = useMemo(() => {
    const doneVisitNumbers = new Set(
      communityVisits.map((v) => v.ancVisitNumber).filter((n): n is number => n != null),
    );
    // A completed checkpoint stops counting as "due" regardless of its date,
    // so a home visit already submitted for it never keeps showing up here.
    const automatic = openPregnancy
      ? [...chwVisitSchedule(openPregnancy)]
          .filter((s) => !doneVisitNumbers.has(s.visitNumber))
          .sort((a, b) => a.chwDueDate.localeCompare(b.chwDueDate))[0]?.chwDueDate ?? null
      : null;
    const manual = assignments
      .filter((a) => a.patientId === patient.id && a.status === "pending")
      .map((a) => a.dueDate)
      .sort()[0] ?? null;
    const next = automatic && manual ? (automatic < manual ? automatic : manual) : (automatic ?? manual);
    const src: "automatic" | "manual" | null = next === automatic ? (automatic ? "automatic" : null) : next ? "manual" : null;
    const done = !!openPregnancy && !automatic && !manual;
    return { nextDueDate: next, source: src, allHomeVisitsDone: done };
  }, [openPregnancy, assignments, communityVisits, patient.id]);

  return <PatientRow patientDue={{ patient, nextDueDate, source, allHomeVisitsDone }} />;
}

export function ChwDashboardContent() {
  const { user } = useAuth();
  const patients = usePatientsForChw();

  const sorted = useMemo(
    () => [...patients].sort((a, b) => a.firstName.localeCompare(b.firstName)),
    [patients],
  );

  if (!user) return null;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Community Follow-up — {user.facility}
      </h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard icon={IconUsers} value={String(patients.length)} label="Assigned Patients" accentClass="bg-teal-100 text-teal-700" />
        <StatCard icon={IconClipboard} value="—" label="Due Today" accentClass="bg-sky-100 text-sky-700" />
        <StatCard icon={IconClock} value="—" label="Upcoming" accentClass="bg-violet-100 text-violet-700" />
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">My Patients</h3>
        {sorted.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-4 text-center text-sm text-zinc-400 dark:border-zinc-800">
            No patients assigned yet.
          </p>
        ) : (
          <PregnancyAwarePatientList patients={sorted} />
        )}
      </div>
    </div>
  );
}
