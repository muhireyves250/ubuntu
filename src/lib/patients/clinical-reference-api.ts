"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { getStoredAccessToken } from "@/lib/auth/auth-context";
import type { RiskLevel } from "./types";

// Clinical reference lists from the API (GET /clinical-reference): the ANC
// symptom checklist with the risk colour each symptom carries, the emergency
// danger signs and the vital-sign thresholds that flag them, and the CHW
// home-visit warning signs.

export interface SymptomDefinition {
  id: string;
  label: string;
  severity: RiskLevel;
}

export interface DangerSign {
  id: string;
  label: string;
  autoDetected?: "bp" | "fever";
}

export interface ChwSignDefinition {
  id: string;
  label: string;
  severity: RiskLevel;
}

export interface ClinicalReference {
  symptoms: SymptomDefinition[];
  dangerSigns: DangerSign[];
  dangerSignThresholds: { bpSystolic: number; bpDiastolic: number; temperatureCelsius: number };
  chwSigns: ChwSignDefinition[];
  /** Vital signs every visit must record (stored field names); absent until loaded. */
  requiredVitalSigns?: string[];
  /** Normal ranges per vital (stored field names); outside one is flagged. */
  vitalSignRanges?: Record<string, { min?: number; max?: number }>;
  /** BMI bands, lowest first; `below: null` has no upper bound. */
  bmiBands?: { below: number | null; label: string; flagged: boolean }[];
}

const EMPTY: ClinicalReference = {
  symptoms: [],
  dangerSigns: [],
  // Never matched while the real thresholds load.
  dangerSignThresholds: { bpSystolic: Infinity, bpDiastolic: Infinity, temperatureCelsius: Infinity },
  chwSigns: [],
};

export function useClinicalReference(): ClinicalReference {
  const { data } = useQuery({
    queryKey: ["clinical-reference"],
    queryFn: () => apiFetch<ClinicalReference>("/clinical-reference", { token: getStoredAccessToken() ?? undefined }),
    // Reference data: changes only with a new API release.
    staleTime: Infinity,
  });
  return data ?? EMPTY;
}
