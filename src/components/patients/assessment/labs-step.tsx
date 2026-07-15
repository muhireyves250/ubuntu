"use client";

import { IconAlert, IconClipboard, IconCheckCircle, IconUsers } from "@/components/dashboard/icons";

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

      <div className="flex items-start gap-2.5 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <IconUsers className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Hemoglobin, platelets, blood sugar, and urine protein are filled in by the
          laboratory nurse, not here. Choose whether this visit needs lab work.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`relative flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-colors ${
            !labsOrdered
              ? "border-teal-500 bg-teal-50 dark:border-teal-600 dark:bg-teal-950/30"
              : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800"
          }`}
        >
          {!labsOrdered && (
            <IconCheckCircle className="absolute right-3 top-3 h-5 w-5 text-teal-600 dark:text-teal-400" />
          )}
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-teal-700 shadow-sm dark:bg-zinc-900 dark:text-teal-400">
            <IconClipboard className="h-4.5 w-4.5" />
          </span>
          <span className="font-semibold text-zinc-900 dark:text-zinc-50">
            No lab tests needed
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Continue straight to summary.
          </span>
        </button>

        <button
          type="button"
          onClick={() => onChange(true)}
          className={`relative flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-colors ${
            labsOrdered
              ? "border-amber-500 bg-amber-50 dark:border-amber-600 dark:bg-amber-950/30"
              : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800"
          }`}
        >
          {labsOrdered && (
            <IconCheckCircle className="absolute right-3 top-3 h-5 w-5 text-amber-600 dark:text-amber-400" />
          )}
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-amber-700 shadow-sm dark:bg-zinc-900 dark:text-amber-400">
            <IconAlert className="h-4.5 w-4.5" />
          </span>
          <span className="font-semibold text-zinc-900 dark:text-zinc-50">
            Order laboratory tests
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Sends this visit to the laboratory nurse for results.
          </span>
        </button>
      </div>

      {labsOrdered && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/30">
          <IconAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-xs text-amber-800 dark:text-amber-400">
            This visit will be marked as awaiting lab results once submitted. The
            laboratory nurse will fill in Hb, platelets, blood sugar, and urine
            protein.
          </p>
        </div>
      )}
    </div>
  );
}
