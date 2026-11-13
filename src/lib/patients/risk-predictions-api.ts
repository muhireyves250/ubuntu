"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { getStoredAccessToken } from "@/lib/auth/auth-context";
import type { RiskLevel } from "./types";

// The "AI Prediction" tab: a risk estimate for each of the patient's visits,
// computed by the API (GET /patients/:id/risk-predictions).
export interface VisitPrediction {
  eclampsiaRisk: number; // 0–1
  hemorrhageRisk: number; // 0–1
  pretermRisk: number; // 0–1
  emergencyRisk: number; // 0–1
  confidence: number; // 0–1
  topFactors: { label: string; contribution: number }[];
  alert: string | null;
  visitId: string;
  date: string;
  riskLevel: RiskLevel;
}

export function useRiskPredictions(patientId: string): VisitPrediction[] {
  const { data } = useQuery({
    // Under ["visits"] so it refreshes whenever visits change.
    queryKey: ["visits", "risk-predictions", patientId],
    queryFn: () =>
      apiFetch<VisitPrediction[]>(`/patients/${patientId}/risk-predictions`, {
        token: getStoredAccessToken() ?? undefined,
      }),
    enabled: !!patientId,
  });
  return data ?? [];
}
