"use client";

import { useState } from "react";
import { RiskBadge } from "@/components/patients/risk-badge";
import { useDecideRisk, useRiskReview } from "@/lib/patients/risk-review-api";
import type { RiskLevel } from "@/lib/patients/types";

const LEVELS: { value: RiskLevel; label: string }[] = [
  { value: "green", label: "Green" },
  { value: "yellow", label: "Yellow" },
  { value: "orange", label: "Orange" },
  { value: "red", label: "Red" },
];

const RANK: Record<RiskLevel, number> = { green: 0, yellow: 1, orange: 2, red: 3 };

/**
 * The one risk colour for a visit, why it is that colour, and (for a clinician)
 * the form to confirm or change it. It never says how the colour was worked out.
 */
export function RiskReviewPanel({ visitId, canDecide }: { visitId: string; canDecide: boolean }) {
  const { review } = useRiskReview(visitId);
  const decide = useDecideRisk(visitId);
  const [chosen, setChosen] = useState<RiskLevel | null>(null);
  const [note, setNote] = useState("");

  if (!review) return null;

  const finalLevel = chosen ?? review.level;
  const lowering = RANK[finalLevel] < RANK[review.level];
  const needsNote = lowering && note.trim() === "";

  async function save() {
    await decide.mutateAsync({ finalLevel, note });
    setChosen(null);
    setNote("");
  }

  return (
    <section
      aria-label="Risk colour"
      className="flex flex-col gap-3 rounded-xl border border-zinc-300 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
    >
      <div className="flex flex-wrap items-center gap-3">
        <RiskBadge level={review.level} size="lg" />
        {review.provisional && (
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Suggested colour — waiting for a clinician&apos;s decision.
          </span>
        )}
      </div>

      {review.reasons.length > 0 && (
        <ul className="list-disc space-y-0.5 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
          {review.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}

      {review.decision && (
        <div className="rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-950/30">
          <p className="font-semibold text-zinc-800 dark:text-zinc-200">
            Decided by {review.decision.decidedBy || "a clinician"}
          </p>
          {review.decision.note && (
            <p className="mt-1 text-zinc-600 dark:text-zinc-400">{review.decision.note}</p>
          )}
        </div>
      )}

      {canDecide && (
        <div className="flex flex-col gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              Final colour
              <select
                value={finalLevel}
                onChange={(e) => setChosen(e.target.value as RiskLevel)}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                {LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              Note
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
            <button
              type="button"
              disabled={needsNote || decide.isPending}
              onClick={() => void save().catch(() => undefined)}
              className="rounded-xl bg-[#0f766e] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {decide.isPending ? "Saving…" : "Save decision"}
            </button>
          </div>
          {needsNote && (
            <p className="text-xs text-amber-700 dark:text-amber-400">Add a note to lower the colour.</p>
          )}
          {decide.error && (
            <p role="alert" className="text-xs text-red-600 dark:text-red-400">
              {decide.error.message}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
