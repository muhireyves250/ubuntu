import type { RiskLevel } from "./types";

export interface ChwSignDefinition {
  id: string;
  label: string;
  severity: RiskLevel;
}

export const CHW_SYMPTOM_CHECKLIST: ChwSignDefinition[] = [
  { id: "severe-headache", label: "Severe headache", severity: "orange" },
  { id: "blurred-vision", label: "Blurred vision", severity: "orange" },
  { id: "facial-hand-swelling", label: "Swelling of face or hands", severity: "yellow" },
  { id: "vaginal-bleeding", label: "Vaginal bleeding", severity: "red" },
  { id: "reduced-fetal-movement", label: "Reduced or absent fetal movement", severity: "yellow" },
  { id: "convulsions", label: "Convulsions", severity: "red" },
  { id: "severe-abdominal-pain", label: "Severe abdominal pain", severity: "orange" },
];
