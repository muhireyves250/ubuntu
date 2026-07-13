"use client";

import { useState } from "react";
import {
  DANGER_SIGNS,
  VERY_HIGH_BP_SYSTOLIC,
  VERY_HIGH_BP_DIASTOLIC,
  HIGH_FEVER_CELSIUS,
} from "@/lib/patients/danger-signs";
import { createEmergencyVisit } from "@/lib/patients/use-patients";
import type { Pregnancy, Referral, Visit } from "@/lib/patients/types";

const DANGER_SIGN_LABEL = new Map(DANGER_SIGNS.map((s) => [s.id, s.label]));

export function SignsSymptomsTab({
  patientId,
  onFlagged,
}: {
  patientId: string;
  onFlagged: (result: { pregnancy: Pregnancy; visit: Visit; referral: Referral }) => void;
}) {
  const [bpSystolic, setBpSystolic] = useState("");
  const [bpDiastolic, setBpDiastolic] = useState("");
  const [temperature, setTemperature] = useState("");
  const [manualCheckedIds, setManualCheckedIds] = useState<string[]>([]);

  const isVeryHighBp =
    Number(bpSystolic) >= VERY_HIGH_BP_SYSTOLIC || Number(bpDiastolic) >= VERY_HIGH_BP_DIASTOLIC;
  const isHighFever = Number(temperature) >= HIGH_FEVER_CELSIUS;

  const activeDangerSignIds = [
    ...manualCheckedIds,
    ...(isVeryHighBp ? ["very-high-bp"] : []),
    ...(isHighFever ? ["high-fever"] : []),
  ];

  function toggleManual(id: string) {
    setManualCheckedIds((current) =>
      current.includes(id) ? current.filter((c) => c !== id) : [...current, id],
    );
  }

  function handleFlagEmergency() {
    const summaryParts = activeDangerSignIds.map((id) => {
      if (id === "very-high-bp") {
        return `Very high blood pressure (${bpSystolic}/${bpDiastolic})`;
      }
      if (id === "high-fever") {
        return `High fever (${temperature}°C)`;
      }
      return DANGER_SIGN_LABEL.get(id) ?? id;
    });
    const summary = summaryParts.join("; ");
    const result = createEmergencyVisit(patientId, activeDangerSignIds, summary);
    onFlagged(result);
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-zinc-600 dark:text-zinc-300">
        Quick triage for obvious maternal danger signs that require immediate emergency care.
        This does not replace a full assessment — use it only to identify emergencies fast.
      </p>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Quick vitals
        </legend>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            BP systolic
            <input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="mmHg"
              value={bpSystolic}
              onChange={(e) => setBpSystolic(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            BP diastolic
            <input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="mmHg"
              value={bpDiastolic}
              onChange={(e) => setBpDiastolic(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Temperature (°C)
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              placeholder="e.g. 36.8"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Danger signs
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {DANGER_SIGNS.map((sign) => {
            if (sign.autoDetected) {
              const isActive = sign.autoDetected === "bp" ? isVeryHighBp : isHighFever;
              return (
                <label
                  key={sign.id}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                    isActive
                      ? "border-red-400 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300"
                      : "border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-500"
                  }`}
                >
                  <input type="checkbox" checked={isActive} disabled className="h-4 w-4 rounded border-zinc-300" />
                  {sign.label}
                </label>
              );
            }
            return (
              <label
                key={sign.id}
                className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-800 dark:text-zinc-300"
              >
                <input
                  type="checkbox"
                  checked={manualCheckedIds.includes(sign.id)}
                  onChange={() => toggleManual(sign.id)}
                  className="h-4 w-4 rounded border-zinc-300 text-teal-700 focus:ring-teal-600"
                />
                {sign.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      <button
        type="button"
        disabled={activeDangerSignIds.length === 0}
        onClick={handleFlagEmergency}
        className="w-fit rounded-lg bg-red-600 px-4 py-2.5 font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Flag Emergency
      </button>
    </div>
  );
}
