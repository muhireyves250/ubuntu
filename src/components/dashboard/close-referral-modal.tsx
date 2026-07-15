"use client";

import { useEffect, useState } from "react";
import { closeReferral, createReferral } from "@/lib/patients/use-patients";
import { IconClose, IconAlert } from "./icons";
import { RECEIVING_FACILITIES } from "@/components/patients/create-referral-modal";
import type { Referral, ReferralOutcome, RiskLevel } from "@/lib/patients/types";

const RISK_OPTIONS: { value: RiskLevel; label: string }[] = [
  { value: "green", label: "Green — stable, no concerns" },
  { value: "yellow", label: "Yellow — close follow up" },
  { value: "orange", label: "Orange — urgent" },
  { value: "red", label: "Red — still critical" },
];

const ANY_CAPABLE_FACILITY = "Any capable facility";

const OUTCOME_OPTIONS: { value: ReferralOutcome; label: string; suggestedRisk: RiskLevel }[] = [
  { value: "stable", label: "Stable", suggestedRisk: "yellow" },
  { value: "improved", label: "Improved", suggestedRisk: "yellow" },
  { value: "recovered", label: "Recovered", suggestedRisk: "green" },
  { value: "admitted", label: "Admitted", suggestedRisk: "orange" },
  { value: "delivered", label: "Delivered", suggestedRisk: "green" },
  { value: "referred", label: "Referred to another facility", suggestedRisk: "orange" },
  { value: "discharged", label: "Discharged", suggestedRisk: "green" },
  { value: "maternal_death", label: "Maternal death", suggestedRisk: "red" },
  { value: "fetal_death", label: "Fetal death", suggestedRisk: "red" },
];

export function CloseReferralModal({
  referral,
  patientName,
  onClose,
  onClosed,
}: {
  referral: Referral;
  patientName: string;
  onClose: () => void;
  onClosed: () => void;
}) {
  const [outcome, setOutcome] = useState<ReferralOutcome>("recovered");
  const [outcomeStatement, setOutcomeStatement] = useState("");
  const [riskLevel, setRiskLevel] = useState<RiskLevel>("green");
  const [nextFacility, setNextFacility] = useState(ANY_CAPABLE_FACILITY);
  const isReferringOnward = outcome === "referred";

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    closeReferral(referral.id, { outcome, outcomeStatement, riskLevel });
    if (isReferringOnward && nextFacility) {
      createReferral({
        patientId: referral.patientId,
        receivingFacility: nextFacility,
        reason: outcomeStatement.trim() || "Condition did not improve — escalating to a higher-level facility.",
        urgency: "emergency",
      });
    }
    onClosed();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-300 bg-[#ffeedb] p-6 shadow-2xl dark:border-zinc-700 dark:bg-orange-950/40">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Close Referral — {patientName}</h2>
          <button type="button" onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800">
            <IconClose className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4 rounded-xl border border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Outcome
            <select
              value={outcome}
              onChange={(e) => {
                const next = e.target.value as ReferralOutcome;
                setOutcome(next);
                const suggested = OUTCOME_OPTIONS.find((o) => o.value === next)?.suggestedRisk;
                if (suggested) setRiskLevel(suggested);
              }}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            >
              {OUTCOME_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Updated risk level
            <select value={riskLevel} onChange={(e) => setRiskLevel(e.target.value as RiskLevel)} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50">
              {RISK_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Outcome statement
            <textarea required rows={4} value={outcomeStatement} onChange={(e) => setOutcomeStatement(e.target.value)} placeholder="Describe the case outcome…" className="resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50" />
          </label>

          {isReferringOnward && (
            <div className="flex flex-col gap-2.5 rounded-lg border border-orange-300 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-950/30">
              <p className="flex items-start gap-1.5 text-xs text-orange-800 dark:text-orange-400">
                <IconAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                The patient did not improve here. Closing with this outcome will also open a new
                emergency referral — broadcast it to any capable facility so whichever hospital
                accepts first can take over, or target one specific facility instead.
              </p>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Refer to
                <select
                  required={isReferringOnward}
                  value={nextFacility}
                  onChange={(e) => setNextFacility(e.target.value)}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                >
                  <option value={ANY_CAPABLE_FACILITY}>
                    Any capable facility (first to accept helps the patient)
                  </option>
                  {RECEIVING_FACILITIES.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </label>
            </div>
          )}

          <div className="mt-2 grid grid-cols-2 gap-2.5">
            <button type="button" onClick={onClose} className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800">Cancel</button>
            <button
              type="submit"
              disabled={isReferringOnward && !nextFacility}
              className="rounded-xl bg-[#0f766e] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isReferringOnward ? "Close & Refer Onward" : "Close Case"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
