"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { createFollowUpAssignment } from "@/lib/patients/use-patients";
import { fetchChwsForFacility } from "@/lib/patients/chw-assignment-api";
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
  const [chws, setChws] = useState<{ id: string; name: string }[]>([]);
  const [selectedChwId, setSelectedChwId] = useState<string | undefined>(undefined);
  const [chwLoading, setChwLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchChwsForFacility(patient.registrationFacility)
      .then((result) => {
        if (!cancelled) {
          setChws(result);
          setSelectedChwId(result[0]?.id);
        }
      })
      .finally(() => {
        if (!cancelled) setChwLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [patient.registrationFacility]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  async function handleSubmit() {
    if (!selectedChwId || isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await createFollowUpAssignment({
        patientId: patient.id,
        reason,
        priority,
        dueDate,
        assignedToChwId: selectedChwId,
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign CHW. Please try again.");
      setIsSubmitting(false);
    }
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

        {chwLoading ? null : chws.length === 0 ? (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            No Community Health Worker is available at this facility yet.
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-4 rounded-xl border border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
            {chws.length > 1 ? (
              <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Community Health Worker
                <select
                  value={selectedChwId}
                  onChange={(e) => setSelectedChwId(e.target.value)}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                >
                  {chws.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="text-xs text-zinc-400">
                Will be assigned to <span className="font-medium text-zinc-600 dark:text-zinc-300">{chws[0].name}</span>
              </p>
            )}

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

            {error && (
              <p className="rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
                {error}
              </p>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedChwId || !dueDate || isSubmitting}
                onClick={handleSubmit}
                className="rounded-xl bg-[#0f766e] px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "Assigning…" : "Assign"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
