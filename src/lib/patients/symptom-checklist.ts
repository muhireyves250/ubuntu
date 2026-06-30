import type { RiskLevel } from "./types";

export interface SymptomDefinition {
  id: string;
  label: string;
  severity: RiskLevel;
}

export const SYMPTOM_CHECKLIST: SymptomDefinition[] = [
  { id: "uncontrolled-htn", label: "Uncontrolled hypertension", severity: "red" },
  { id: "preeclampsia", label: "Preeclampsia / eclampsia", severity: "red" },
  { id: "pph", label: "Postpartum hemorrhage", severity: "red" },
  { id: "severe-anemia", label: "Severe anemia (Hb < 7 g/dl)", severity: "red" },
  { id: "prev-cs-2x", label: "Previous C/S ≥2 scars, on labor", severity: "red" },
  { id: "teenage-labor", label: "Teenage pregnancy (≤18), on labor", severity: "red" },
  { id: "preterm-labor", label: "Preterm labor", severity: "orange" },
  { id: "controlled-htn", label: "Controlled chronic hypertension", severity: "yellow" },
  { id: "teenage", label: "Teenage pregnancy (<18)", severity: "yellow" },
  { id: "advanced-age", label: "Advanced maternal age (>40)", severity: "yellow" },
  { id: "prev-pph", label: "Previous PPH (past obstetric history)", severity: "yellow" },
  { id: "multiple-gestation", label: "Multiple gestation", severity: "yellow" },
  { id: "headache", label: "Headache", severity: "yellow" },
  { id: "convulsions", label: "Convulsions", severity: "red" },
  { id: "bleeding", label: "Vaginal bleeding", severity: "red" },
  { id: "chest-pain", label: "Chest pain", severity: "orange" },
  { id: "fever", label: "Fever", severity: "yellow" },
  { id: "abdominal-pain", label: "Abdominal pain", severity: "yellow" },
  { id: "difficulty-breathing", label: "Difficulty breathing", severity: "orange" },
  { id: "reduced-fetal-movement", label: "Reduced fetal movement", severity: "yellow" },
];

const SEVERITY_RANK: Record<RiskLevel, number> = {
  green: 0,
  yellow: 1,
  orange: 2,
  red: 3,
};

const SYMPTOM_BY_ID = new Map(
  SYMPTOM_CHECKLIST.map((symptom) => [symptom.id, symptom]),
);

export function classifyRiskLevel(symptomIds: string[]): RiskLevel {
  let highest: RiskLevel = "green";
  for (const symptomId of symptomIds) {
    const symptom = SYMPTOM_BY_ID.get(symptomId);
    if (symptom && SEVERITY_RANK[symptom.severity] > SEVERITY_RANK[highest]) {
      highest = symptom.severity;
    }
  }
  return highest;
}
