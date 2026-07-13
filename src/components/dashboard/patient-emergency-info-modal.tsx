"use client";

import { useEffect } from "react";
import type { Patient, Visit } from "@/lib/patients/types";
import { fullName, computeAge } from "@/lib/format";
import { IconClose } from "./icons";

export function PatientEmergencyInfoModal({
  patient,
  latestVisit,
  onClose,
  onAccept,
}: {
  patient: Patient;
  latestVisit: Visit | undefined;
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

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
      />

      <div className="relative w-full max-w-md rounded-2xl border-2 border-red-600 bg-[#ffeedb] p-6 shadow-2xl dark:border-red-500 dark:bg-orange-950/40">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
              Obstetric Emergency
            </span>
            <h2 className="mt-2 text-lg font-bold text-zinc-900 dark:text-zinc-50">
              {fullName(patient)}
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {computeAge(patient.dateOfBirth)} years
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-zinc-300 bg-white p-4 text-sm dark:border-zinc-700 dark:bg-zinc-900">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Facility
            </p>
            <p className="mt-0.5 text-zinc-900 dark:text-zinc-50">
              {latestVisit?.hospital ?? patient.registrationFacility}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Flagged
            </p>
            <p className="mt-0.5 text-zinc-900 dark:text-zinc-50">
              {latestVisit?.date ?? "Unknown"}
            </p>
          </div>
          <div className="col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Chronic conditions
            </p>
            <p className="mt-0.5 text-zinc-900 dark:text-zinc-50">
              {patient.chronicConditions?.join(", ") || "—"}
            </p>
          </div>
          <div className="col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Allergies
            </p>
            <p className="mt-0.5 text-zinc-900 dark:text-zinc-50">{patient.allergies || "—"}</p>
          </div>
          {latestVisit?.notes && (
            <div className="col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Latest visit notes
              </p>
              <p className="mt-0.5 text-zinc-900 dark:text-zinc-50">{latestVisit.notes}</p>
            </div>
          )}
        </div>

        <div className="mt-3 rounded-xl border border-red-300 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/30">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-400">
              Facility readiness (demo estimate)
            </p>
            <span className="text-sm font-bold text-red-700 dark:text-red-400">68%</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-red-200 dark:bg-red-900/60">
            <div className="h-full w-[68%] rounded-full bg-red-600" />
          </div>
          <p className="mt-2 text-xs text-red-700/80 dark:text-red-400/80">
            Estimated capacity to manage this emergency at {latestVisit?.hospital ?? patient.registrationFacility}.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
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
