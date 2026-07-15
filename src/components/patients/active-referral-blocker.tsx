"use client";

import { useState } from "react";
import { IconAlert, IconActivity, IconBuilding, IconClock, IconCheckCircle } from "@/components/dashboard/icons";
import { CloseReferralModal } from "@/components/dashboard/close-referral-modal";
import { relativeTime } from "@/lib/format";
import { getInitials, fullName } from "@/lib/format";
import type { Patient, Referral } from "@/lib/patients/types";
import { useAuth } from "@/lib/auth/auth-context";

const STEPS = ["Referred", "Acceptance", "Closed"] as const;

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
          accent ? "text-red-700 dark:text-red-400" : "text-zinc-800 dark:text-zinc-200"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export function ActiveReferralBlocker({
  patient,
  referral,
}: {
  patient: Patient;
  referral: Referral;
}) {
  const { user } = useAuth();
  const [showCloseModal, setShowCloseModal] = useState(false);
  const isPending = referral.status === "pending";
  const isOwner = referral.status === "accepted" && referral.acceptedByFacility === user?.facility;
  const activeStep = isPending ? 1 : 2;

  return (
    <div className="overflow-hidden rounded-2xl border border-red-200 shadow-sm dark:border-red-900/50">
      {showCloseModal && (
        <CloseReferralModal
          referral={referral}
          patientName={`${patient.firstName} ${patient.lastName}`}
          onClose={() => setShowCloseModal(false)}
          onClosed={() => setShowCloseModal(false)}
        />
      )}

      <div className="border-b border-red-200 bg-red-50 px-6 py-4 dark:border-red-900/50 dark:bg-red-950/30">
        <div className="mx-auto flex w-full max-w-sm items-center justify-between">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold shadow-sm ${
                    i < activeStep
                      ? "bg-red-700 text-white"
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
              {i < 2 && (
                <div
                  className={`mx-1.5 h-0.5 flex-1 rounded-full ${
                    i < activeStep ? "bg-red-700" : "bg-white dark:bg-zinc-800"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center gap-6 bg-white p-8 text-center dark:bg-zinc-900">
        <div className="relative">
          <div className="absolute -inset-4 animate-pulse rounded-full bg-red-100 opacity-50 dark:bg-red-900/30" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-red-600 shadow-inner dark:bg-red-950/50 dark:text-red-400">
            <IconActivity className="h-10 w-10" />
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2.5 rounded-full border border-zinc-200 bg-zinc-50 py-1.5 pl-1.5 pr-4 dark:border-zinc-800 dark:bg-zinc-950/50">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-semibold text-red-800 dark:bg-red-950 dark:text-red-300">
              {getInitials(fullName(patient))}
            </span>
            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              {fullName(patient)}
            </span>
          </div>

          <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
            Active Emergency Case
          </h3>
          <p className="max-w-md text-sm text-zinc-500 dark:text-zinc-400">
            This patient has an unresolved red case. A patient can only have one active
            emergency at a time — this one must be closed with an outcome statement before a
            new visit can be started.
          </p>
        </div>

        <div className="grid w-full max-w-lg grid-cols-1 gap-2.5 sm:grid-cols-3">
          <StatusChip
            icon={<IconAlert className="h-3.5 w-3.5" />}
            label="Status"
            value={isPending ? "Pending acceptance" : "Awaiting closure"}
            accent
          />
          <StatusChip
            icon={<IconBuilding className="h-3.5 w-3.5" />}
            label={isPending ? "Referred to" : "Being managed by"}
            value={isPending ? referral.receivingFacility : referral.acceptedByFacility}
          />
          {isPending ? (
            <StatusChip
              icon={<IconClock className="h-3.5 w-3.5" />}
              label="Opened"
              value={relativeTime(referral.createdAt)}
            />
          ) : (
            <StatusChip
              icon={<IconCheckCircle className="h-3.5 w-3.5" />}
              label="Accepted by"
              value={referral.acceptedByNurse}
            />
          )}
        </div>

        {isOwner ? (
          <button
            type="button"
            onClick={() => setShowCloseModal(true)}
            className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700"
          >
            Close this case
          </button>
        ) : (
          <div className="flex w-full max-w-lg items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left dark:border-amber-900/50 dark:bg-amber-950/30">
            <IconAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-xs text-amber-800 dark:text-amber-400">
              {isPending
                ? "Waiting for a capable facility to accept this emergency referral."
                : "Only the facility managing this case can close it and record the outcome."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Shown instead of the full blocker to facilities already involved in the
// case (the referring facility, or the one that accepted it) — they keep
// full read access to the patient record while this stays open.
export function ActiveReferralBanner({
  patient,
  referral,
}: {
  patient: Patient;
  referral: Referral;
}) {
  const { user } = useAuth();
  const [showCloseModal, setShowCloseModal] = useState(false);
  const isPending = referral.status === "pending";
  const isOwner = referral.status === "accepted" && referral.acceptedByFacility === user?.facility;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 shadow-sm dark:border-red-900/50 dark:bg-red-950/30">
      {showCloseModal && (
        <CloseReferralModal
          referral={referral}
          patientName={`${patient.firstName} ${patient.lastName}`}
          onClose={() => setShowCloseModal(false)}
          onClosed={() => setShowCloseModal(false)}
        />
      )}
      <div className="flex items-center gap-2.5">
        <IconActivity className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
        <div>
          <p className="text-sm font-bold text-red-800 dark:text-red-300">
            Active emergency case — {isPending ? "pending acceptance" : "awaiting closure"}
          </p>
          <p className="text-xs text-red-700/80 dark:text-red-400/80">
            {isPending
              ? `Referred to ${referral.receivingFacility} · opened ${relativeTime(referral.createdAt)}`
              : `Managed by ${referral.acceptedByFacility} · accepted by ${referral.acceptedByNurse} · opened ${relativeTime(referral.createdAt)}`}
          </p>
        </div>
      </div>
      {isOwner && (
        <button
          type="button"
          onClick={() => setShowCloseModal(true)}
          className="shrink-0 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-red-700"
        >
          Close this case
        </button>
      )}
    </div>
  );
}
