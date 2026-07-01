import type { Patient, Visit } from "./types";
import { classifyRiskLevel } from "./symptom-checklist";

export const SEED_PATIENTS: Patient[] = [
  {
    id: "patient-uwimana",
    name: "Aline Uwimana",
    age: 27,
    gestationalAgeWeeks: 32,
    facility: "Nyamata Health Center",
    registeredAt: "2026-04-12",
    obstetricHistory: "G2P1, previous postpartum hemorrhage",
    medicalHistory: "No known chronic conditions",
  },
  {
    id: "patient-mukeshimana",
    name: "Claudine Mukeshimana",
    age: 19,
    gestationalAgeWeeks: 28,
    facility: "Nyamata Health Center",
    registeredAt: "2026-05-02",
    obstetricHistory: "G1P0, teenage pregnancy",
    medicalHistory: "Controlled chronic hypertension",
  },
  {
    id: "patient-ingabire",
    name: "Solange Ingabire",
    age: 35,
    gestationalAgeWeeks: 22,
    facility: "Nyamata Health Center",
    registeredAt: "2026-05-20",
    obstetricHistory: "G3P2, twin pregnancy",
    medicalHistory: "No known chronic conditions",
  },
  {
    id: "patient-nyiraneza",
    name: "Beatrice Nyiraneza",
    age: 31,
    gestationalAgeWeeks: 36,
    facility: "Nyamata Health Center",
    registeredAt: "2026-05-28",
    obstetricHistory: "G4P3, previous postpartum hemorrhage",
    medicalHistory: "Severe anemia diagnosed this pregnancy",
  },
];

function buildVisit(
  id: string,
  patientId: string,
  date: string,
  symptomIds: string[],
  notes: string,
): Visit {
  return {
    id,
    patientId,
    date,
    symptomIds,
    riskLevel: classifyRiskLevel(symptomIds),
    notes,
  };
}

export const SEED_VISITS: Visit[] = [
  buildVisit(
    "visit-uwimana-1",
    "patient-uwimana",
    "2026-06-10",
    ["prev-pph"],
    "Routine ANC visit, monitoring for recurrence given history.",
  ),
  buildVisit(
    "visit-mukeshimana-1",
    "patient-mukeshimana",
    "2026-06-15",
    ["teenage", "controlled-htn"],
    "Blood pressure stable on current medication.",
  ),
  buildVisit(
    "visit-ingabire-1",
    "patient-ingabire",
    "2026-06-20",
    ["multiple-gestation"],
    "Twin pregnancy confirmed on ultrasound, growth tracking normally.",
  ),
  buildVisit(
    "visit-nyiraneza-1",
    "patient-nyiraneza",
    "2026-06-05",
    ["prev-pph"],
    "Routine ANC visit, flagged for history of postpartum hemorrhage.",
  ),
  buildVisit(
    "visit-nyiraneza-2",
    "patient-nyiraneza",
    "2026-06-29",
    ["severe-anemia", "prev-pph"],
    "Hb dropped to 6.4 g/dl, referred for urgent management.",
  ),
];
