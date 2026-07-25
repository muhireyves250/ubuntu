"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  usePatients,
  useVisits,
  usePregnancies,
  useReferrals,
  acceptReferral,
  useFacilityCapacity,
} from "@/lib/patients/use-patients";
import { useAuth } from "@/lib/auth/auth-context";
import { gestationalAgeWeeks } from "@/lib/patients/pregnancy";
import { fullName } from "@/lib/format";
import type { Patient, Visit } from "@/lib/patients/types";
import { ConfirmModal } from "./confirm-modal";
import { PatientEmergencyInfoModal } from "./patient-emergency-info-modal";

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
  referredFrom: string;
  gaWeeks: number | null;
  onAccept: () => void;
  onViewInfo: () => void;
}

function RedCaseCard({ patient, latestVisitDate, referredFrom, gaWeeks, onAccept, onViewInfo }: RedCaseCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onViewInfo}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onViewInfo();
      }}
      className="animate-pulse-ring-urgent flex cursor-pointer items-start gap-4 rounded-xl border border-red-200 bg-red-50 p-4 transition-colors hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/30 dark:hover:bg-red-950/50"
    >
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
        <IconEmergency className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-red-800 dark:text-red-300 truncate">
            {fullName(patient)}
          </p>
          <span className="shrink-0 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
            Obstetric Emergency
          </span>
        </div>
        <p className="mt-0.5 text-xs text-red-700/70 dark:text-red-400/70">
          {gaWeeks !== null ? `${gaWeeks}w gestation · ` : ""}Referred from {referredFrom}
        </p>
        <div className="mt-1 flex items-center gap-1 text-xs text-red-600/60 dark:text-red-400/60">
          <IconClock className="h-3.5 w-3.5" />
          <span>Flagged {latestVisitDate}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onAccept();
        }}
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
  const { user } = useAuth();
  const patients = usePatients();
  const visits = useVisits();
  const pregnancies = usePregnancies();
  const referrals = useReferrals();
  const [pendingAcceptId, setPendingAcceptId] = useState<string | null>(null);
  const [viewInfoReferralId, setViewInfoReferralId] = useState<string | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const capacity = useFacilityCapacity(user?.facility ?? "");

  const patientById = useMemo(() => new Map(patients.map((p) => [p.id, p])), [patients]);
  const patientIdByPregnancyId = useMemo(
    () => new Map(pregnancies.map((p) => [p.id, p.patientId])),
    [pregnancies],
  );

  const pendingCases = useMemo(() => {
    if (!user) return [];
    const results: {
      referral: (typeof referrals)[number];
      patient: Patient;
      latestVisit: Visit | undefined;
      gaWeeks: number | null;
    }[] = [];

    for (const referral of referrals) {
      // Broadcast to every facility capable of handling an obstetric emergency
      // (not just the one it was originally routed to) — whichever capable
      // hospital sees it first can accept it. The facility that referred the
      // case out never sees it as something to accept, even if it's capable.
      if (
        referral.status !== "pending" ||
        referral.urgency !== "emergency" ||
        user.facilityLevel === "hc" ||
        referral.referredByFacility === user.facility ||
        capacity.status === "full"
      ) {
        continue;
      }
      const patient = patientById.get(referral.patientId);
      if (!patient) continue;
      const latestVisit = visits
        .filter((v) => patientIdByPregnancyId.get(v.pregnancyId) === referral.patientId)
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      const openPregnancy = pregnancies.find(
        (p) => p.patientId === referral.patientId && p.status === "open",
      );
      const gaWeeks = openPregnancy ? gestationalAgeWeeks(openPregnancy.lmpDate) : null;
      results.push({ referral, patient, latestVisit, gaWeeks });
    }

    return results.sort((a, b) => b.referral.createdAt.localeCompare(a.referral.createdAt));
  }, [referrals, patientById, visits, pregnancies, patientIdByPregnancyId, user, capacity]);

  if (user?.role === "hospital_admin" || user?.role === "chw") return null;
  if (pendingCases.length === 0) return null;

  const pendingAccept = pendingCases.find(({ referral }) => referral.id === pendingAcceptId);
  const viewInfo = pendingCases.find(({ referral }) => referral.id === viewInfoReferralId);

  return (
    <div className="rounded-[1.25rem] border border-red-300 bg-white p-6 shadow-[0_2px_12px_rgba(220,38,38,0.08)] dark:border-red-900/50 dark:bg-red-950/20">
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
            {pendingCases.length}
          </span>
        </div>
        <span className="text-xs text-red-600/70 dark:text-red-400/70">
          Visible to all capable facilities
        </span>
      </div>

      <p className="mt-2 text-sm text-red-700/80 dark:text-red-400/80">
        These emergency cases need a facility equipped to manage them. Accept one to take
        responsibility for the patient.
      </p>

      {acceptError && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-red-300 bg-red-100 px-3 py-2 text-xs font-medium text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300">
          <span>{acceptError}</span>
          <button type="button" onClick={() => setAcceptError(null)} className="shrink-0 font-bold">
            ×
          </button>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3">
        {pendingCases.map(({ referral, patient, latestVisit, gaWeeks }) => (
          <RedCaseCard
            key={referral.id}
            patient={patient}
            latestVisitDate={latestVisit?.date ?? "Unknown"}
            referredFrom={referral.referredByFacility}
            gaWeeks={gaWeeks}
            onAccept={() => setPendingAcceptId(referral.id)}
            onViewInfo={() => setViewInfoReferralId(referral.id)}
          />
        ))}
      </div>

      {pendingAccept && (
        <ConfirmModal
          title="Accept this emergency referral?"
          description={`${fullName(pendingAccept.patient)} will be assigned to you and marked as an accepted referral.`}
          confirmLabel="Accept"
          tone="danger"
          onConfirm={async () => {
            try {
              await acceptReferral(pendingAccept.referral.id);
              setPendingAcceptId(null);
              router.push(`/dashboard/nurse/patients/${pendingAccept.patient.id}`);
            } catch (err) {
              setPendingAcceptId(null);
              setAcceptError(err instanceof Error ? err.message : "Could not accept this referral.");
            }
          }}
          onCancel={() => setPendingAcceptId(null)}
        />
      )}

      {viewInfo && (
        <PatientEmergencyInfoModal
          patient={viewInfo.patient}
          latestVisit={viewInfo.latestVisit}
          referral={viewInfo.referral}
          gaWeeks={viewInfo.gaWeeks}
          onClose={() => setViewInfoReferralId(null)}
          onAccept={() => {
            setViewInfoReferralId(null);
            setPendingAcceptId(viewInfo.referral.id);
          }}
        />
      )}
    </div>
  );
}
