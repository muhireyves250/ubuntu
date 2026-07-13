"use client";

import { IconAlert, IconClipboard } from "@/components/dashboard/icons";

export function LabsStep({
  labsOrdered,
  onChange,
}: {
  labsOrdered: boolean;
  onChange: (ordered: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Laboratory Tests
      </p>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Hemoglobin, platelets, blood sugar, and urine protein are filled in by the
        laboratory nurse, not here. Choose whether this visit needs lab work.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors ${
            !labsOrdered
              ? "border-teal-400 bg-teal-50 dark:border-teal-700 dark:bg-teal-950/30"
              : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800"
          }`}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-teal-700 dark:bg-zinc-900 dark:text-teal-400">
            <IconClipboard className="h-4 w-4" />
          </span>
          <span className="font-medium text-zinc-900 dark:text-zinc-50">
            No lab tests needed
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Continue straight to summary.
          </span>
        </button>

        <button
          type="button"
          onClick={() => onChange(true)}
          className={`flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors ${
            labsOrdered
              ? "border-amber-400 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30"
              : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800"
          }`}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-amber-700 dark:bg-zinc-900 dark:text-amber-400">
            <IconAlert className="h-4 w-4" />
          </span>
          <span className="font-medium text-zinc-900 dark:text-zinc-50">
            Order laboratory tests
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Sends this visit to the laboratory nurse for results.
          </span>
        </button>
      </div>

      {labsOrdered && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
          This visit will be marked as awaiting lab results once submitted. The
          laboratory nurse will fill in Hb, platelets, blood sugar, and urine
          protein.
        </p>
      )}
    </div>
  );
}
