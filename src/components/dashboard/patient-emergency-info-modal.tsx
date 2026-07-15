"use client";

import { useEffect } from "react";
import type { Patient, Referral, Visit } from "@/lib/patients/types";
import { fullName, computeAge, relativeTime } from "@/lib/format";
import { SYMPTOM_CHECKLIST } from "@/lib/patients/symptom-checklist";
import { RiskBadge } from "@/components/patients/risk-badge";
import { IconClose, IconAlert, IconClock, IconBuilding, IconUsers, IconActivity } from "./icons";
import { useAuth } from "@/lib/auth/auth-context";
import { useFacilityCapacity } from "@/lib/patients/use-patients";

const URGENCY_BADGE: Record<Referral["urgency"], string> = {
  routine: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  urgent: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  emergency: "bg-red-600 text-white",
};

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className="mt-0.5 text-sm text-zinc-900 dark:text-zinc-50">{value}</p>
    </div>
  );
}

export function PatientEmergencyInfoModal({
  patient,
  latestVisit,
  referral,
  gaWeeks,
  onClose,
  onAccept,
}: {
  patient: Patient;
  latestVisit: Visit | undefined;
  referral: Referral;
  gaWeeks: number | null;
  onClose: () => void;
  onAccept: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const facility = latestVisit?.hospital ?? patient.registrationFacility;
  const symptomLabels =
    latestVisit?.symptomIds
      ?.map((id) => SYMPTOM_CHECKLIST.find((s) => s.id === id)?.label ?? id)
      .filter(Boolean) ?? [];
  const vitals = latestVisit?.labs;
  const hasVitals =
    vitals && (vitals.bpSystolic != null || vitals.bpDiastolic != null || vitals.temperature != null);

  const { user } = useAuth();
  const capacity = useFacilityCapacity(user?.facility ?? "");
  const readinessPct = Math.max(0, Math.min(100, Math.round((capacity.remaining / capacity.max) * 100)));
  const STATUS_LABEL: Record<typeof capacity.status, string> = {
    available: "Available",
    nearly_full: "Nearly full",
    full: "Full",
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
      />

      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border-2 border-red-600 bg-[#ffeedb] shadow-2xl dark:border-red-500 dark:bg-orange-950/40">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-red-200 bg-[#ffeedb] px-6 py-5 dark:border-red-900/50 dark:bg-orange-950/40">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-600 text-white shadow-sm">
              <IconAlert className="h-5 w-5" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  Obstetric Emergency
                </span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${URGENCY_BADGE[referral.urgency]}`}>
                  {referral.urgency}
                </span>
              </div>
              <h2 className="mt-1.5 text-lg font-bold text-zinc-900 dark:text-zinc-50">
                {fullName(patient)}
              </h2>
              <p className="flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                {computeAge(patient.dateOfBirth)} years
                {gaWeeks !== null ? ` · ${gaWeeks}w gestation` : ""}
                {/* This card only ever shows an open emergency referral, so the
                    patient is red for as long as it's unresolved — regardless
                    of what the underlying visit record says, matching the
                    same rule applied everywhere else in the app. */}
                <RiskBadge level="red" size="sm" />
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3 p-6">
          <div className="rounded-xl border border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
            <p className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              <IconBuilding className="h-3.5 w-3.5" />
              Referral
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <InfoField label="Referred from" value={referral.referredByFacility} />
              <InfoField label="Referring nurse" value={referral.referredByNurse} />
              <InfoField label="Receiving facility" value={facility} />
              <InfoField label="Flagged" value={relativeTime(referral.createdAt)} />
            </div>
            <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Reason for referral
              </p>
              <p className="mt-0.5 text-sm text-zinc-900 dark:text-zinc-50">{referral.reason}</p>
            </div>
          </div>

          {(symptomLabels.length > 0 || hasVitals) && (
            <div className="rounded-xl border border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
              <p className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                <IconActivity className="h-3.5 w-3.5" />
                Clinical Presentation
              </p>
              {symptomLabels.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {symptomLabels.map((label) => (
                    <span
                      key={label}
                      className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 dark:bg-red-950/30 dark:text-red-400"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              )}
              {hasVitals && (
                <div className="mt-3 grid grid-cols-3 gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  <InfoField
                    label="BP"
                    value={
                      vitals?.bpSystolic != null && vitals?.bpDiastolic != null
                        ? `${vitals.bpSystolic}/${vitals.bpDiastolic}`
                        : "—"
                    }
                  />
                  <InfoField label="Temp" value={vitals?.temperature != null ? `${vitals.temperature}°C` : "—"} />
                  <InfoField label="FHR" value={vitals?.fetalHeartRate != null ? `${vitals.fetalHeartRate} bpm` : "—"} />
                </div>
              )}
              {latestVisit?.emergencySummary && (
                <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  <InfoField label="Emergency summary" value={latestVisit.emergencySummary} />
                </div>
              )}
            </div>
          )}

          <div className="rounded-xl border border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
            <p className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              <IconUsers className="h-3.5 w-3.5" />
              Medical Background
            </p>
            <div className="grid grid-cols-2 gap-3">
              <InfoField label="Chronic conditions" value={patient.chronicConditions?.join(", ") || "—"} />
              <InfoField label="Allergies" value={patient.allergies || "—"} />
            </div>
          </div>

          <div className="rounded-xl border border-red-300 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/30">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-400">
                Your Facility Capacity — {STATUS_LABEL[capacity.status]}
              </p>
              <span className="text-sm font-bold text-red-700 dark:text-red-400">
                {capacity.active}/{capacity.max} active
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-red-200 dark:bg-red-900/60">
              <div className="h-full rounded-full bg-red-600" style={{ width: `${readinessPct}%` }} />
            </div>
            <p className="mt-2 flex items-start gap-1.5 text-xs text-red-700/80 dark:text-red-400/80">
              <IconClock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {capacity.status === "full"
                ? `${user?.facility ?? "Your facility"} is at capacity — accepting is blocked until a case closes.`
                : `Estimated remaining emergency capacity at ${user?.facility ?? "your facility"}.`}
            </p>
          </div>
        </div>

        <div className="sticky bottom-0 grid grid-cols-2 gap-2.5 border-t border-red-200 bg-[#ffeedb] px-6 py-4 dark:border-red-900/50 dark:bg-orange-950/40">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
