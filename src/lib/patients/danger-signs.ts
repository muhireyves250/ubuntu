export interface DangerSign {
  id: string;
  label: string;
  autoDetected?: "bp" | "fever";
}

export const DANGER_SIGNS: DangerSign[] = [
  { id: "severe-bleeding", label: "Severe vaginal bleeding" },
  { id: "convulsions", label: "Convulsions" },
  { id: "loss-of-consciousness", label: "Loss of consciousness" },
  { id: "severe-abdominal-pain", label: "Severe abdominal pain" },
  { id: "severe-headache-blurred-vision", label: "Severe headache with blurred vision" },
  { id: "difficulty-breathing", label: "Difficulty breathing" },
  { id: "very-high-bp", label: "Very high blood pressure", autoDetected: "bp" },
  { id: "high-fever", label: "High fever", autoDetected: "fever" },
  { id: "reduced-fetal-movement", label: "Reduced fetal movement" },
  { id: "ruptured-uterus", label: "Ruptured uterus" },
];

export const VERY_HIGH_BP_SYSTOLIC = 160;
export const VERY_HIGH_BP_DIASTOLIC = 110;
export const HIGH_FEVER_CELSIUS = 38.5;
