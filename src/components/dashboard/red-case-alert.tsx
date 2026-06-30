"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  usePatients,
  useVisits,
  useActiveReferrals,
  acceptReferral,
} from "@/lib/patients/use-patients";
import type { Patient } from "@/lib/patients/types";

function IconEmergency({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 3.5 2.5 19.5h19L12 3.5Z"
        fill="currentColor"
        opacity="0.15"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M12 9.5v4M12 16.5h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconArrowRight({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconClock({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

interface RedCaseCardProps {
  patient: Patient;
  latestVisitDate: string;
  onAccept: (patientId: string) => void;
}

function RedCaseCard({ patient, latestVisitDate, onAccept }: RedCaseCardProps) {
  return (
    <div className="animate-pulse-ring-urgent flex items-start gap-4 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/30">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
        <IconEmergency className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-red-800 dark:text-red-300 truncate">
            {patient.name}
          </p>
          <span className="shrink-0 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
            Obstetric Emergency
          </span>
        </div>
        <p className="mt-0.5 text-xs text-red-700/70 dark:text-red-400/70">
          {patient.gestationalAgeWeeks}w gestation · {patient.facility}
        </p>
        <div className="mt-1 flex items-center gap-1 text-xs text-red-600/60 dark:text-red-400/60">
          <IconClock className="h-3.5 w-3.5" />
          <span>Flagged {latestVisitDate}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onAccept(patient.id)}
        className="mt-0.5 shrink-0 flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 active:scale-95"
      >
        Accept
        <IconArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function RedCaseAlertPanel() {
  const router = useRouter();
  const patients = usePatients();
  const visits = useVisits();
  const activeReferrals = useActiveReferrals();

  const acceptedPatientIds = useMemo(
    () => new Set(activeReferrals.map((r) => r.patientId)),
    [activeReferrals],
  );

  const redCases = useMemo(() => {
    return patients
      .filter((patient) => !acceptedPatientIds.has(patient.id))
      .map((patient) => {
        const latestVisit = visits
          .filter((v) => v.patientId === patient.id)
          .sort((a, b) => b.date.localeCompare(a.date))[0];
        return { patient, latestVisit };
      })
      .filter(({ latestVisit }) => latestVisit?.riskLevel === "red")
      .sort((a, b) =>
        (b.latestVisit?.date ?? "").localeCompare(a.latestVisit?.date ?? ""),
      );
  }, [patients, visits, acceptedPatientIds]);

  if (redCases.length === 0) return null;

  return (
    <div className="rounded-[1.25rem] border border-red-300 bg-red-50/60 p-6 shadow-[0_2px_12px_rgba(220,38,38,0.08)] dark:border-red-900/50 dark:bg-red-950/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-red-600" />
          </span>
          <h2 className="font-semibold text-red-900 dark:text-red-300">
            Pending Emergency Referrals
          </h2>
          <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
            {redCases.length}
          </span>
        </div>
        <span className="text-xs text-red-600/70 dark:text-red-400/70">
          Visible to all staff
        </span>
      </div>

      <p className="mt-2 text-sm text-red-700/80 dark:text-red-400/80">
        The following patients have been classified as obstetric emergencies and require immediate referral acceptance.
      </p>

      <div className="mt-4 flex flex-col gap-3">
        {redCases.map(({ patient, latestVisit }) => (
          <RedCaseCard
            key={patient.id}
            patient={patient}
            latestVisitDate={latestVisit?.date ?? "Unknown"}
            onAccept={(id) => {
              acceptReferral(id);
              router.push(`/dashboard/nurse/patients/${id}`);
            }}
          />
        ))}
      </div>
    </div>
  );
}
