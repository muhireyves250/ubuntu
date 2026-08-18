import { apiFetch } from "@/lib/api/client";
import { getStoredAccessToken } from "@/lib/auth/auth-context";
import type { RiskLevel } from "./types";

export interface RiskPrediction {
  visitId: string;
  predictedRiskLevel: RiskLevel;
  eclampsiaProb: number;
  hemorrhageProb: number;
  maternalDeathProb: number;
  emergencyReferralProb: number;
  withinHours: number;
  modelVersion: string;
  recommendation: string;
  createdAt: string;
}

interface BackendRiskPrediction {
  visitId: string;
  predictedRiskLevel: "GREEN" | "YELLOW" | "ORANGE" | "RED";
  eclampsiaProb: number;
  hemorrhageProb: number;
  maternalDeathProb: number;
  emergencyReferralProb: number;
  withinHours: number;
  modelVersion: string;
  recommendation: string | null;
  createdAt: string;
}

const RISK_LEVEL_TO_FRONTEND: Record<string, RiskLevel> = {
  GREEN: "green",
  YELLOW: "yellow",
  ORANGE: "orange",
  RED: "red",
};

function toFrontendRiskPrediction(p: BackendRiskPrediction): RiskPrediction {
  return {
    visitId: p.visitId,
    predictedRiskLevel: RISK_LEVEL_TO_FRONTEND[p.predictedRiskLevel] ?? "green",
    eclampsiaProb: p.eclampsiaProb,
    hemorrhageProb: p.hemorrhageProb,
    maternalDeathProb: p.maternalDeathProb,
    emergencyReferralProb: p.emergencyReferralProb,
    withinHours: p.withinHours,
    modelVersion: p.modelVersion,
    recommendation: p.recommendation ?? "",
    createdAt: p.createdAt,
  };
}

export async function runAiPredictionApi(visitId: string): Promise<RiskPrediction> {
  const token = getStoredAccessToken();
  const p = await apiFetch<BackendRiskPrediction>(`/predictions/visits/${visitId}/run`, {
    method: "POST",
    token: token ?? undefined,
  });
  return toFrontendRiskPrediction(p);
}

export async function fetchRiskPredictionForVisit(visitId: string): Promise<RiskPrediction | null> {
  const token = getStoredAccessToken();
  const p = await apiFetch<BackendRiskPrediction | null>(`/predictions/visits/${visitId}`, {
    token: token ?? undefined,
  });
  return p ? toFrontendRiskPrediction(p) : null;
}
