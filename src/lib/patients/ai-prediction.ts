import type { Visit } from "./types";

export interface AiPrediction {
  eclampsiaRisk: number;   // 0–1
  hemorrhageRisk: number;  // 0–1
  pretermRisk: number;     // 0–1
  emergencyRisk: number;   // 0–1
  confidence: number;      // 0–1
  topFactors: { label: string; contribution: number }[];
  alert: string | null;
  visitId: string;
  date: string;
}

const ECLAMPSIA_WEIGHTS: Record<string, number> = {
  "preeclampsia": 0.92,
  "convulsions": 0.95,
  "uncontrolled-htn": 0.72,
  "headache": 0.38,
  "controlled-htn": 0.28,
  "advanced-age": 0.18,
};

const HEMORRHAGE_WEIGHTS: Record<string, number> = {
  "pph": 0.90,
  "bleeding": 0.82,
  "prev-pph": 0.55,
  "severe-anemia": 0.42,
  "prev-cs-2x": 0.35,
};

const PRETERM_WEIGHTS: Record<string, number> = {
  "preterm-labor": 0.91,
  "multiple-gestation": 0.52,
  "teenage": 0.38,
  "teenage-labor": 0.65,
  "abdominal-pain": 0.24,
  "reduced-fetal-movement": 0.29,
};

const EMERGENCY_WEIGHTS: Record<string, number> = {
  "convulsions": 0.96,
  "preeclampsia": 0.88,
  "bleeding": 0.85,
  "pph": 0.88,
  "difficulty-breathing": 0.74,
  "chest-pain": 0.68,
  "uncontrolled-htn": 0.70,
  "preterm-labor": 0.62,
  "severe-anemia": 0.55,
  "prev-cs-2x": 0.50,
};

function aggregateRisk(symptomIds: string[], weights: Record<string, number>): number {
  let combined = 0;
  for (const id of symptomIds) {
    const w = weights[id] ?? 0;
    combined = combined + w - combined * w;
  }
  return Math.min(combined, 0.98);
}

function topContributors(
  symptomIds: string[],
  weights: Record<string, number>,
  label: string,
): { label: string; contribution: number }[] {
  return symptomIds
    .filter((id) => weights[id])
    .map((id) => ({ label: `${label}: ${id.replace(/-/g, " ")}`, contribution: weights[id] }))
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 2);
}

export function computePrediction(visit: Visit): AiPrediction {
  const { symptomIds } = visit;

  const eclampsiaRisk = aggregateRisk(symptomIds, ECLAMPSIA_WEIGHTS);
  const hemorrhageRisk = aggregateRisk(symptomIds, HEMORRHAGE_WEIGHTS);
  const pretermRisk = aggregateRisk(symptomIds, PRETERM_WEIGHTS);
  const emergencyRisk = aggregateRisk(symptomIds, EMERGENCY_WEIGHTS);

  const hasHighRiskSymptoms = symptomIds.some((id) =>
    ["convulsions", "preeclampsia", "bleeding", "pph", "difficulty-breathing"].includes(id),
  );

  const confidence = symptomIds.length === 0
    ? 0.42
    : Math.min(0.62 + symptomIds.length * 0.04, 0.94);

  const factors = [
    ...topContributors(symptomIds, ECLAMPSIA_WEIGHTS, "Eclampsia"),
    ...topContributors(symptomIds, HEMORRHAGE_WEIGHTS, "Hemorrhage"),
    ...topContributors(symptomIds, EMERGENCY_WEIGHTS, "Emergency"),
  ]
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 5)
    .map((f) => ({ ...f, label: f.label.split(": ")[1] ?? f.label }))
    .map((f) => ({ label: f.label.charAt(0).toUpperCase() + f.label.slice(1), contribution: f.contribution }));

  const alert =
    emergencyRisk >= 0.8
      ? "High risk of deterioration within the next 12 hours"
      : eclampsiaRisk >= 0.7
        ? "Eclampsia warning — monitor blood pressure closely"
        : hemorrhageRisk >= 0.7
          ? "Hemorrhage warning — ensure IV access and blood products"
          : hasHighRiskSymptoms
            ? "Critical signs present — immediate clinical review required"
            : null;

  return {
    eclampsiaRisk,
    hemorrhageRisk,
    pretermRisk,
    emergencyRisk,
    confidence,
    topFactors: factors.length > 0 ? factors : [{ label: "No high-risk signs recorded", contribution: 0 }],
    alert,
    visitId: visit.id,
    date: visit.date,
  };
}

export function computePredictionHistory(visits: Visit[]): AiPrediction[] {
  return visits.map(computePrediction);
}
