"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { createReferral } from "@/lib/patients/use-patients";
import { IconClose } from "@/components/dashboard/icons";
import { RiskBadge } from "@/components/patients/risk-badge";
import { fullName } from "@/lib/format";
import type { Patient, RiskLevel } from "@/lib/patients/types";

export const RECEIVING_FACILITIES = [
  "Nyanza District Hospital",
  "Kigali University Teaching Hospital",
  "King Faisal Hospital",
  "Rwanda Military Hospital",
  "Butaro District Hospital",
  "Kibagabaga District Hospital",
  "Muhima District Hospital",
  "Rwamagana Provincial Hospital",
  "Kabgayi District Hospital",
];

const URGENCY_LABELS: Record<string, string> = {
  routine: "Routine",
  urgent: "Urgent",
  emergency: "Emergency",
};

export function CreateReferralModal({
  patient,
  currentRisk,
  clinicalSummary,
  onClose,
  onCreated,
}: {
  patient: Patient;
  currentRisk: RiskLevel;
  clinicalSummary: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [receivingFacility, setReceivingFacility] = useState("");
  const [reason, setReason] = useState("");
  const [urgency, setUrgency] = useState<"routine" | "urgent" | "emergency">("urgent");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  async function handleSubmit() {
    if (isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await createReferral({
        patientId: patient.id,
        receivingFacility,
        reason: reason.trim(),
        urgency,
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create referral. Please try again.");
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
            Create Referral
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
          <RiskBadge level={currentRisk} size="sm" />
        </div>

        <div className="mt-4 flex flex-col gap-4 rounded-xl border border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Receiving facility
            <select
              required
              value={receivingFacility}
              onChange={(e) => setReceivingFacility(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            >
              <option value="">Select facility…</option>
              {RECEIVING_FACILITIES.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Urgency
            <div className="flex gap-2">
              {(["routine", "urgent", "emergency"] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUrgency(u)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    urgency === u
                      ? u === "emergency"
                        ? "border-red-500 bg-red-50 text-red-700"
                        : u === "urgent"
                          ? "border-orange-400 bg-orange-50 text-orange-700"
                          : "border-teal-500 bg-teal-50 text-teal-700"
                      : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                  }`}
                >
                  {URGENCY_LABELS[u]}
                </button>
              ))}
            </div>
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Reason for referral
            <textarea
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Severe preeclampsia requiring specialist management…"
              className="resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>

          {clinicalSummary && (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Clinical summary (pre-filled)
              </p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{clinicalSummary}</p>
            </div>
          )}

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
              disabled={!receivingFacility || !reason.trim() || isSubmitting}
              onClick={handleSubmit}
              className="rounded-xl bg-[#0f766e] px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Creating…" : "Create Referral"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
