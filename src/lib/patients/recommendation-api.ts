import { apiFetch } from "@/lib/api/client";
import { getStoredAccessToken } from "@/lib/auth/auth-context";
import type { Recommendation, RecommendationStatus, RiskLevel } from "./types";

interface BackendRecommendation {
  id: string;
  patientId: string;
  createdAt: string;
  riskLevelAtCreation: "GREEN" | "YELLOW" | "ORANGE" | "RED";
  message: string;
  status: "OPEN" | "RESPONDED";
  nurseResponse: string | null;
  respondedAt: string | null;
  acknowledgedAt: string | null;
  createdBy: { firstName: string; lastName: string };
  createdByFacility: { id: string; name: string };
  respondedBy: { firstName: string; lastName: string } | null;
}

const RISK_TO_FRONTEND: Record<string, RiskLevel> = {
  GREEN: "green",
  YELLOW: "yellow",
  ORANGE: "orange",
  RED: "red",
};
const RISK_TO_BACKEND: Record<RiskLevel, string> = {
  green: "GREEN",
  yellow: "YELLOW",
  orange: "ORANGE",
  red: "RED",
};

const STATUS_TO_FRONTEND: Record<string, RecommendationStatus> = {
  OPEN: "open",
  RESPONDED: "responded",
};

function toFrontendRecommendation(r: BackendRecommendation): Recommendation {
  return {
    id: r.id,
    patientId: r.patientId,
    createdAt: r.createdAt,
    createdByGynecologist: `${r.createdBy.firstName} ${r.createdBy.lastName}`,
    createdByFacility: r.createdByFacility.name,
    riskLevelAtCreation: RISK_TO_FRONTEND[r.riskLevelAtCreation] ?? "green",
    message: r.message,
    status: STATUS_TO_FRONTEND[r.status] ?? "open",
    nurseResponse: r.nurseResponse ?? undefined,
    respondedByNurse: r.respondedBy ? `${r.respondedBy.firstName} ${r.respondedBy.lastName}` : undefined,
    respondedAt: r.respondedAt ?? undefined,
    acknowledgedByGynecologistAt: r.acknowledgedAt ?? undefined,
  };
}

export async function fetchRecommendations(patientId?: string): Promise<Recommendation[]> {
  const token = getStoredAccessToken();
  const path = patientId ? `/recommendations?patientId=${patientId}&limit=100` : "/recommendations?limit=100";
  const result = await apiFetch<{ data: BackendRecommendation[]; meta: unknown }>(path, {
    token: token ?? undefined,
  });
  return result.data.map(toFrontendRecommendation);
}

export async function createRecommendationApi(
  patientId: string,
  message: string,
  riskLevel: RiskLevel,
): Promise<Recommendation> {
  const token = getStoredAccessToken();
  const r = await apiFetch<BackendRecommendation>("/recommendations", {
    method: "POST",
    body: { patientId, message, riskLevel: RISK_TO_BACKEND[riskLevel] },
    token: token ?? undefined,
  });
  return toFrontendRecommendation(r);
}

export async function respondToRecommendationApi(id: string, response: string): Promise<Recommendation> {
  const token = getStoredAccessToken();
  const r = await apiFetch<BackendRecommendation>(`/recommendations/${id}/respond`, {
    method: "PATCH",
    body: { response },
    token: token ?? undefined,
  });
  return toFrontendRecommendation(r);
}

export async function acknowledgeRecommendationApi(id: string): Promise<Recommendation> {
  const token = getStoredAccessToken();
  const r = await apiFetch<BackendRecommendation>(`/recommendations/${id}/acknowledge`, {
    method: "PATCH",
    token: token ?? undefined,
  });
  return toFrontendRecommendation(r);
}