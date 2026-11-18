"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, ApiError } from "@/lib/api/client";
import { getStoredAccessToken } from "@/lib/auth/auth-context";
import type { RiskLevel } from "./types";

type BackendRiskLevel = "GREEN" | "YELLOW" | "ORANGE" | "RED";

const TO_FRONTEND: Record<BackendRiskLevel, RiskLevel> = {
  GREEN: "green",
  YELLOW: "yellow",
  ORANGE: "orange",
  RED: "red",
};

const TO_BACKEND: Record<RiskLevel, BackendRiskLevel> = {
  green: "GREEN",
  yellow: "YELLOW",
  orange: "ORANGE",
  red: "RED",
};

/** What the risk-review endpoint answers. It never carries engine details. */
interface BackendRiskReview {
  visitId: string;
  status: "PENDING" | "DECIDED";
  level: BackendRiskLevel;
  provisional: boolean;
  reasons: string[];
  /** Measurements the colour could not take into account because they are not recorded yet. */
  missing?: string[];
  decision: {
    level: BackendRiskLevel;
    note: string | null;
    decidedAt: string | null;
    decidedBy: { firstName: string; lastName: string } | null;
  } | null;
  /** How the visit's referral ended, once it has closed. */
  outcome?: { outcome: string; at: string | null } | null;
}

/** The one colour a clinician sees for a visit, with its reasons. */
export interface RiskReview {
  visitId: string;
  decided: boolean;
  level: RiskLevel;
  /** The colour is still a suggestion awaiting a clinician's decision. */
  provisional: boolean;
  reasons: string[];
  /** Measurements not recorded yet ("blood pressure"); empty when all are in or a clinician has decided. */
  missing: string[];
  decision: {
    level: RiskLevel;
    note: string | null;
    decidedAt: string | null;
    decidedBy: string;
  } | null;
  /** How the visit's referral ended ("maternal death"), once it has closed. */
  outcome: { label: string; at: string | null } | null;
}

export function toFrontendRiskReview(r: BackendRiskReview): RiskReview {
  return {
    visitId: r.visitId,
    decided: r.status === "DECIDED",
    level: TO_FRONTEND[r.level] ?? "green",
    provisional: r.provisional,
    reasons: r.reasons,
    missing: r.missing ?? [],
    outcome: r.outcome
      ? { label: r.outcome.outcome.replace(/_/g, " ").toLowerCase(), at: r.outcome.at }
      : null,
    decision: r.decision
      ? {
          level: TO_FRONTEND[r.decision.level] ?? "green",
          note: r.decision.note,
          decidedAt: r.decision.decidedAt,
          decidedBy: r.decision.decidedBy
            ? `${r.decision.decidedBy.firstName} ${r.decision.decidedBy.lastName}`
            : "",
        }
      : null,
  };
}

const reviewKey = (visitId: string) => ["visits", "risk-review", visitId] as const;

/** The review (colour, reasons, decision) for a visit; absent until the visit has been classified. */
export function useRiskReview(visitId: string | undefined) {
  const query = useQuery({
    queryKey: reviewKey(visitId ?? ""),
    queryFn: async () =>
      toFrontendRiskReview(
        await apiFetch<BackendRiskReview>(`/risk-reviews/visits/${visitId}`, {
          token: getStoredAccessToken() ?? undefined,
        }),
      ),
    enabled: !!visitId,
    // A visit with no review yet answers 404; there is nothing to retry.
    retry: (count, error) => !(error instanceof ApiError && error.statusCode === 404) && count < 1,
  });
  return { review: query.data, isLoading: query.isLoading };
}

/** A clinician confirms or changes the colour. Lowering it needs a note. */
export function useDecideRisk(visitId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: { finalLevel: RiskLevel; note?: string }) => {
      const body: Record<string, unknown> = { finalLevel: TO_BACKEND[args.finalLevel] };
      if (args.note && args.note.trim() !== "") body.note = args.note.trim();
      return toFrontendRiskReview(
        await apiFetch<BackendRiskReview>(`/risk-reviews/visits/${visitId}/decision`, {
          method: "POST",
          body,
          token: getStoredAccessToken() ?? undefined,
        }),
      );
    },
    // The decision changes the visit's colour everywhere it is shown, so
    // refresh every visit-derived answer, not just this review.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["visits"] }),
  });
}
