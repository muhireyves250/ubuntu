"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import {
  useRecommendationsForPatient,
  createRecommendation,
  respondToRecommendation,
  acknowledgeRecommendation,
} from "@/lib/patients/use-patients";
import { RiskBadge } from "@/components/patients/risk-badge";
import { relativeTime } from "@/lib/format";
import type { RiskLevel } from "@/lib/patients/types";

export function SpecialistNotesTab({
  patientId,
  currentRiskLevel,
}: {
  patientId: string;
  currentRiskLevel: RiskLevel;
}) {
  const { user } = useAuth();
  const recommendations = useRecommendationsForPatient(patientId);
  const [showAddForm, setShowAddForm] = useState(false);
  const [message, setMessage] = useState("");
  const [responseDrafts, setResponseDrafts] = useState<Record<string, string>>({});
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  function isPending(id: string) {
    return pendingIds.has(id);
  }

  async function withPending(id: string, action: () => Promise<unknown>) {
    setError(null);
    setPendingIds((prev) => new Set(prev).add(id));
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function handleAdd() {
    if (!message.trim() || isPending("add")) return;
    await withPending("add", async () => {
      await createRecommendation(patientId, message.trim(), currentRiskLevel);
      setMessage("");
      setShowAddForm(false);
    });
  }

  async function handleRespond(id: string) {
    const response = responseDrafts[id]?.trim();
    if (!response || isPending(id)) return;
    await withPending(id, async () => {
      await respondToRecommendation(id, response);
      setResponseDrafts((prev) => ({ ...prev, [id]: "" }));
    });
  }

  async function handleAcknowledge(id: string) {
    if (isPending(id)) return;
    await withPending(id, () => acknowledgeRecommendation(id));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Specialist Notes
        </p>
        {user?.role === "gynecologist" && !showAddForm && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="rounded-lg bg-[#0f766e] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-800"
          >
            Add Recommendation
          </button>
        )}
      </div>

      {showAddForm && (
        <div className="flex flex-col gap-2.5 rounded-xl border border-teal-300 bg-teal-50 p-4 dark:border-teal-800 dark:bg-teal-950/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-400">
              New recommendation for this {currentRiskLevel} case
            </span>
            <RiskBadge level={currentRiskLevel} size="sm" />
          </div>
          <textarea
            required
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Recommend follow-up actions, treatment adjustments, or monitoring instructions…"
            className="resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
          {error && (
            <p className="rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => { setShowAddForm(false); setMessage(""); }}
              disabled={isPending("add")}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={isPending("add")}
              className="rounded-lg bg-[#0f766e] px-3 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending("add") ? "Sending…" : "Send Recommendation"}
            </button>
          </div>
        </div>
      )}

      {recommendations.length === 0 ? (
        <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          No specialist recommendations yet.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {recommendations.map((rec) => (
            <div key={rec.id} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {rec.createdByGynecologist}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {rec.createdByFacility} · {relativeTime(rec.createdAt)}
                  </p>
                </div>
                <RiskBadge level={rec.riskLevelAtCreation} size="sm" />
              </div>
              <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{rec.message}</p>

              {rec.status === "responded" ? (
                <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/50">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Response from {rec.respondedByNurse}
                  </p>
                  <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{rec.nurseResponse}</p>
                  {user?.role === "gynecologist" &&
                    rec.createdByGynecologist === user.name &&
                    !rec.acknowledgedByGynecologistAt && (
                      <button
                        type="button"
                        onClick={() => handleAcknowledge(rec.id)}
                        disabled={isPending(rec.id)}
                        className="mt-2 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isPending(rec.id) ? "Acknowledging…" : "Acknowledge"}
                      </button>
                    )}
                </div>
              ) : user?.role === "nurse" ? (
                <div className="mt-3 flex flex-col gap-2">
                  <textarea
                    rows={2}
                    value={responseDrafts[rec.id] ?? ""}
                    onChange={(e) =>
                      setResponseDrafts((prev) => ({ ...prev, [rec.id]: e.target.value }))
                    }
                    placeholder="Respond after implementing this recommendation…"
                    className="resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                  />
                  <button
                    type="button"
                    onClick={() => handleRespond(rec.id)}
                    disabled={isPending(rec.id)}
                    className="self-end rounded-lg bg-[#0f766e] px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isPending(rec.id) ? "Sending…" : "Send Response"}
                  </button>
                </div>
              ) : (
                <p className="mt-3 text-xs text-zinc-400">Awaiting nurse response.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
