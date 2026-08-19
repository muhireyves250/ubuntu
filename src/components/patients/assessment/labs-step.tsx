"use client";

import { IconAlert, IconClipboard, IconCheckCircle, IconUsers } from "@/components/dashboard/icons";
import { LAB_TEST_CATEGORIES } from "@/lib/patients/lab-test-catalog";

export function LabsStep({
  labsOrdered,
  onChange,
  selectedTests,
  onTestsChange,
  otherTests,
  onOtherTestsChange,
  labNotes,
  onLabNotesChange,
}: {
  labsOrdered: boolean;
  onChange: (ordered: boolean) => void;
  selectedTests: string[];
  onTestsChange: (tests: string[]) => void;
  otherTests: string;
  onOtherTestsChange: (value: string) => void;
  labNotes: string;
  onLabNotesChange: (value: string) => void;
}) {
  function toggleTest(test: string) {
    onTestsChange(
      selectedTests.includes(test)
        ? selectedTests.filter((t) => t !== test)
        : [...selectedTests, test],
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Laboratory Tests
      </p>

      <div className="flex items-start gap-2.5 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <IconUsers className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Results are filled in by the laboratory nurse, not here. Choose whether this visit
          needs lab work, and which tests — leave none checked to send the standard ANC panel.
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
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/30">
            <IconAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-xs text-amber-800 dark:text-amber-400">
              This visit will be marked as awaiting lab results once submitted.
            </p>
          </div>

          {LAB_TEST_CATEGORIES.map((group) => (
            <div key={group.category}>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {group.category}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {group.tests.map((test) => (
                  <label
                    key={test}
                    className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 has-checked:border-teal-600 has-checked:bg-teal-50 dark:border-zinc-800 dark:text-zinc-300 dark:has-checked:border-teal-600 dark:has-checked:bg-teal-950/40"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTests.includes(test)}
                      onChange={() => toggleTest(test)}
                      className="h-4 w-4 rounded border-zinc-300 text-teal-700 focus:ring-teal-600"
                    />
                    {test}
                  </label>
                ))}
              </div>
            </div>
          ))}

          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Other tests
            <input
              type="text"
              value={otherTests}
              onChange={(e) => onOtherTestsChange(e.target.value)}
              placeholder="e.g. Stool analysis, Ultrasound — separate multiple with commas"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Notes for laboratory
            <textarea
              rows={2}
              value={labNotes}
              onChange={(e) => onLabNotesChange(e.target.value)}
              placeholder="Clinical context for the lab technician — e.g. suspected anemia, urgent turnaround needed…"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>
        </div>
      )}
    </div>
  );
}
