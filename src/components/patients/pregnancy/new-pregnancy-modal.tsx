"use client";

import { useEffect, useState } from "react";
import { createPregnancy } from "@/lib/patients/use-patients";
import { computeEdd, gestationalAgeWeeks } from "@/lib/patients/pregnancy";
import { IconClose } from "@/components/dashboard/icons";
import type { Pregnancy } from "@/lib/patients/types";

export function NewPregnancyModal({
  patientId,
  onClose,
  onCreated,
}: {
  patientId: string;
  onClose: () => void;
  onCreated: (pregnancy: Pregnancy) => void;
}) {
  const [gravidity, setGravidity] = useState("");
  const [parity, setParity] = useState("");
  const [previousCS, setPreviousCS] = useState("0");
  const [previousPPH, setPreviousPPH] = useState(false);
  const [previousEclampsia, setPreviousEclampsia] = useState(false);
  const [previousStillbirth, setPreviousStillbirth] = useState(false);
  const [lmpDate, setLmpDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const edd = lmpDate ? computeEdd(lmpDate) : null;
  const weeks = lmpDate ? gestationalAgeWeeks(lmpDate) : null;

  function handleLmpChange(value: string) {
    setLmpDate(value);
    if (!startDate) setStartDate(value);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const pregnancy = await createPregnancy({
        patientId,
        gravidity: Number(gravidity),
        parity: Number(parity),
        previousCS: Number(previousCS),
        previousPPH,
        previousEclampsia,
        previousStillbirth,
        lmpDate,
        startDate,
      });
      onCreated(pregnancy);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not create pregnancy",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
      />

      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-300 bg-[#ffeedb] p-6 shadow-2xl dark:border-zinc-700 dark:bg-orange-950/40">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            New Pregnancy
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-5 flex flex-col gap-4 rounded-xl border border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
        >
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </p>
          )}

          <div className="flex gap-4">
            <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Gravidity
              <input
                type="number"
                required
                min={1}
                value={gravidity}
                onChange={(event) => setGravidity(event.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </label>
            <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Parity
              <input
                type="number"
                required
                min={0}
                value={parity}
                onChange={(event) => setParity(event.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Previous C-sections
            <input
              type="number"
              required
              min={0}
              value={previousCS}
              onChange={(event) => setPreviousCS(event.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>

          <fieldset>
            <legend className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Risk history
            </legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <label className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={previousPPH}
                  onChange={(event) => setPreviousPPH(event.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-teal-700 focus:ring-teal-600"
                />
                Previous postpartum hemorrhage (PPH)
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={previousEclampsia}
                  onChange={(event) =>
                    setPreviousEclampsia(event.target.checked)
                  }
                  className="h-4 w-4 rounded border-zinc-300 text-teal-700 focus:ring-teal-600"
                />
                Previous eclampsia
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={previousStillbirth}
                  onChange={(event) =>
                    setPreviousStillbirth(event.target.checked)
                  }
                  className="h-4 w-4 rounded border-zinc-300 text-teal-700 focus:ring-teal-600"
                />
                Previous stillbirth
              </label>
            </div>
          </fieldset>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Last menstrual period (LMP)
            <input
              type="date"
              required
              value={lmpDate}
              onChange={(event) => handleLmpChange(event.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Pregnancy start date
            <input
              type="date"
              required
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>

          {lmpDate && (
            <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
              <span>Estimated due date</span>
              <span className="font-medium text-zinc-900 dark:text-zinc-50">
                {edd} · {weeks}w now
              </span>
            </div>
          )}

          <div className="mt-2 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-[#0f766e] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Creating…" : "Create Pregnancy"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
