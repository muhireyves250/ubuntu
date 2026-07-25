"use client";

import { useEffect, useState } from "react";
import { closePregnancy } from "@/lib/patients/use-patients";
import { IconClose } from "@/components/dashboard/icons";
import type { Pregnancy } from "@/lib/patients/types";

export function ClosePregnancyModal({
  pregnancy,
  onClose,
  onClosed,
}: {
  pregnancy: Pregnancy;
  onClose: () => void;
  onClosed: () => void;
}) {
  const [outcome, setOutcome] = useState<"live-birth" | "stillbirth" | "maternal-death">("live-birth");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<"vaginal" | "cesarean" | "assisted">("vaginal");
  const [babyStatus, setBabyStatus] = useState<"alive" | "deceased">("alive");
  const [birthWeightKg, setBirthWeightKg] = useState("");
  const [motherCondition, setMotherCondition] = useState("");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await closePregnancy(pregnancy.id, {
        outcome,
        date,
        method,
        babyStatus,
        birthWeightKg: Number(birthWeightKg),
        motherCondition,
        summary,
      });
      onClosed();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not close pregnancy",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-300 bg-[#ffeedb] p-6 shadow-2xl dark:border-zinc-700 dark:bg-orange-950/40">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Close Pregnancy</h2>
          <button type="button" onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800">
            <IconClose className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4 rounded-xl border border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </p>
          )}
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Delivery outcome
            <select value={outcome} onChange={(e) => setOutcome(e.target.value as typeof outcome)} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50">
              <option value="live-birth">Live birth</option>
              <option value="stillbirth">Stillbirth</option>
              <option value="maternal-death">Maternal death</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Delivery date
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Delivery method
            <select value={method} onChange={(e) => setMethod(e.target.value as typeof method)} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50">
              <option value="vaginal">Vaginal</option>
              <option value="cesarean">Cesarean</option>
              <option value="assisted">Assisted</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Baby status
            <select value={babyStatus} onChange={(e) => setBabyStatus(e.target.value as typeof babyStatus)} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50">
              <option value="alive">Alive</option>
              <option value="deceased">Deceased</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Birth weight (kg)
            <input type="number" required min={0} step="0.1" value={birthWeightKg} onChange={(e) => setBirthWeightKg(e.target.value)} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Mother&apos;s condition
            <input type="text" required value={motherCondition} onChange={(e) => setMotherCondition(e.target.value)} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Pregnancy summary
            <textarea required rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50" />
          </label>
          <div className="mt-2 grid grid-cols-2 gap-2.5">
            <button type="button" onClick={onClose} className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="rounded-xl bg-[#0f766e] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? "Closing…" : "Close Pregnancy"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
