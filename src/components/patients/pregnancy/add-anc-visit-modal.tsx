"use client";

import { useEffect, useState } from "react";
import { recordAncVisit } from "@/lib/patients/use-patients";
import { IconClose } from "@/components/dashboard/icons";
import type { AncVisit } from "@/lib/patients/types";

export function AddAncVisitModal({
  pregnancyId,
  suggestedAncNumber,
  onClose,
  onRecorded,
}: {
  pregnancyId: string;
  suggestedAncNumber: number;
  onClose: () => void;
  onRecorded: (visit: AncVisit) => void;
}) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [ancNumber, setAncNumber] = useState(String(suggestedAncNumber));
  const [provider, setProvider] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const visit = recordAncVisit({
      pregnancyId,
      date,
      ancNumber: Number(ancNumber),
      provider,
      notes,
    });
    onRecorded(visit);
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
            Add ANC Visit
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
          <div className="flex gap-4">
            <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Visit date
              <input
                type="date"
                required
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </label>
            <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              ANC number
              <input
                type="number"
                required
                min={1}
                value={ancNumber}
                onChange={(event) => setAncNumber(event.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Attending provider
            <input
              type="text"
              required
              value={provider}
              onChange={(event) => setProvider(event.target.value)}
              placeholder="e.g. Nurse Uwase"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Notes
            <textarea
              rows={2}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="e.g. No alarming signs, counseled on nutrition"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>

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
              className="rounded-xl bg-[#0f766e] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-800"
            >
              Save Visit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
