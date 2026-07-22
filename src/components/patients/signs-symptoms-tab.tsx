"use client";

import { useState } from "react";
import {
  DANGER_SIGNS,
  VERY_HIGH_BP_SYSTOLIC,
  VERY_HIGH_BP_DIASTOLIC,
  HIGH_FEVER_CELSIUS,
} from "@/lib/patients/danger-signs";
import { createEmergencyVisit } from "@/lib/patients/use-patients";
import { IconAlert } from "@/components/dashboard/icons";
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

  async function handleFlagEmergency() {
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
    const result = await createEmergencyVisit(patientId, activeDangerSignIds, summary);
    onFlagged(result);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="overflow-hidden rounded-2xl border border-red-200 dark:border-red-900/50">
        <div className="flex items-center gap-3 bg-red-50 px-5 py-4 dark:bg-red-950/30">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-600 text-white">
            <IconAlert className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-semibold text-red-900 dark:text-red-300">
              Emergency Danger-Sign Triage
            </h3>
            <p className="text-sm text-red-700/80 dark:text-red-400/80">
              Quick triage for obvious maternal danger signs — this does not replace a full
              assessment, use it only to identify emergencies fast.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-5 bg-white p-5 dark:bg-zinc-900">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Quick vitals
            </p>
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
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
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
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
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
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                />
              </label>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Danger signs
              </p>
              {activeDangerSignIds.length > 0 && (
                <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-bold text-white">
                  {activeDangerSignIds.length} selected
                </span>
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {DANGER_SIGNS.map((sign) => {
                if (sign.autoDetected) {
                  const isActive = sign.autoDetected === "bp" ? isVeryHighBp : isHighFever;
                  return (
                    <div
                      key={sign.id}
                      className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-sm transition-colors ${
                        isActive
                          ? "border-red-400 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300"
                          : "border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-500"
                      }`}
                    >
                      <span className="font-medium">{sign.label}</span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                          isActive
                            ? "bg-red-600 text-white"
                            : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800"
                        }`}
                      >
                        {isActive ? "Detected" : "Auto"}
                      </span>
                    </div>
                  );
                }
                const checked = manualCheckedIds.includes(sign.id);
                return (
                  <button
                    key={sign.id}
                    type="button"
                    onClick={() => toggleManual(sign.id)}
                    className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-sm font-medium transition-colors ${
                      checked
                        ? "border-red-400 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300"
                        : "border-zinc-200 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                        checked
                          ? "border-red-600 bg-red-600"
                          : "border-zinc-300 dark:border-zinc-600"
                      }`}
                    >
                      {checked && (
                        <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 text-white" fill="none">
                          <path
                            d="M5 13l4 4L19 7"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                    {sign.label}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            disabled={activeDangerSignIds.length === 0}
            onClick={handleFlagEmergency}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3.5 font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <IconAlert className="h-4.5 w-4.5" />
            Flag Emergency
          </button>
        </div>
      </div>
    </div>
  );
}
