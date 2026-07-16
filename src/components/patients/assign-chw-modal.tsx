"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { createFollowUpAssignment } from "@/lib/patients/use-patients";
import { findChwForFacility } from "@/lib/auth/user-directory";
import { IconClose } from "@/components/dashboard/icons";
import { fullName } from "@/lib/format";
import { FOLLOW_UP_REASON_LABELS } from "@/lib/patients/types";
import type { Patient, FollowUpReason, FollowUpPriority } from "@/lib/patients/types";

const REASON_OPTIONS = Object.keys(FOLLOW_UP_REASON_LABELS) as FollowUpReason[];

function defaultDueDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

export function AssignChwModal({
  patient,
  onClose,
  onCreated,
}: {
  patient: Patient;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [reason, setReason] = useState<FollowUpReason>(REASON_OPTIONS[0]);
  const [priority, setPriority] = useState<FollowUpPriority>("routine");
  const [dueDate, setDueDate] = useState(defaultDueDate());

  const chw = findChwForFacility(patient.registrationFacility);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function handleSubmit() {
    if (!chw) return;
    createFollowUpAssignment({
      patientId: patient.id,
      reason,
      priority,
      dueDate,
      assignedToChwId: chw.id,
      facility: chw.facility,
    });
    onCreated();
    onClose();
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
      />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-300 bg-[#ffeedb] p-6 shadow-2xl dark:border-zinc-700 dark:bg-orange-950/40">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            Assign Community Health Worker
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-xl border border-zinc-300 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-zinc-900 dark:text-zinc-50">{fullName(patient)}</p>
            <p className="text-xs text-zinc-500">{patient.registrationFacility}</p>
          </div>
        </div>

        {!chw ? (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            No Community Health Worker is available at this facility yet.
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-4 rounded-xl border border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
            <p className="text-xs text-zinc-400">
              Will be assigned to <span className="font-medium text-zinc-600 dark:text-zinc-300">{chw.name}</span>
              {chw.village ? ` (${chw.village})` : ""}
            </p>

            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Reason
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as FollowUpReason)}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              >
                {REASON_OPTIONS.map((r) => (
                  <option key={r} value={r}>{FOLLOW_UP_REASON_LABELS[r]}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Priority
              <div className="flex gap-2">
                {(["routine", "high"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      priority === p
                        ? p === "high"
                          ? "border-red-500 bg-red-50 text-red-700"
                          : "border-teal-500 bg-teal-50 text-teal-700"
                        : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                    }`}
                  >
                    {p === "high" ? "High" : "Routine"}
                  </button>
                ))}
              </div>
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Due date
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </label>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!dueDate}
                onClick={handleSubmit}
                className="rounded-xl bg-[#0f766e] px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Assign
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
