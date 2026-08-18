"use client";

import { VaccinationCard } from "@/components/patients/pregnancy/vaccination-card";

export function VaccinationStep({
  pregnancyId,
  onContinue,
  continueLabel = "Continue to Discharge →",
}: {
  pregnancyId: string;
  onContinue: () => void;
  continueLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Vaccination
      </p>
      <VaccinationCard pregnancyId={pregnancyId} />
      <button
        type="button"
        onClick={onContinue}
        className="w-full rounded-xl bg-[#0f766e] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-800"
      >
        {continueLabel}
      </button>
    </div>
  );
}
