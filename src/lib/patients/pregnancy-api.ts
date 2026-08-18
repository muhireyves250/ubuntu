import { apiFetch } from "@/lib/api/client";
import { getStoredAccessToken } from "@/lib/auth/auth-context";
import { computeEdd } from "./pregnancy";
import type { Pregnancy, ScreeningResult, PregnancyMedicalHistory } from "./types";

interface BackendPregnancy {
  id: string;
  patientId: string;
  gravidity: number;
  parity: number;
  termDeliveries: number | null;
  prematureDeliveriesCount: number | null;
  numberOfAbortions: number | null;
  aliveChildren: number | null;
  ageOfLastBornYears: number | null;
  monthsOfLastBorn: number | null;
  previousCSCount: number;
  previousPPH: boolean;
  previousEclampsia: boolean;
  previousStillbirth: boolean;
  edd: string;
  lmp: string | null;
  startDate: string;
  pregnancyNumber: number;
  status: "OPEN" | "CLOSED";
  createdAt: string;
  deliveryOutcome: "LIVE_BIRTH" | "STILLBIRTH" | "MATERNAL_DEATH" | null;
  deliveryDate: string | null;
  deliveryMethod: "VAGINAL" | "CESAREAN" | "ASSISTED" | null;
  babyStatus: "ALIVE" | "DECEASED" | null;
  birthWeightKg: number | null;
  motherCondition: string | null;
  pregnancySummary: string | null;
  historySurgicalOrCervicalTrauma: boolean;
  historyGynecologicalProblem: boolean;
  currentlyOnMedication: boolean;
  currentMedicationDetails: string | null;
  historyDiabetes: boolean;
  historyLungDisease: boolean;
  historyHypertension: boolean;
  alcoholUse: boolean;
  mentalIllnessNotes: string | null;
  historyKidneyProblems: boolean;
  tobaccoUse: boolean;
  hivTestResult: "NEGATIVE" | "POSITIVE" | "UNKNOWN" | null;
  historyHeartDisease: boolean;
  torchScreeningNotes: string | null;
  stiScreeningResult: "NEGATIVE" | "POSITIVE" | "UNKNOWN" | null;
  historyPretermDelivery: boolean;
  historyMacrosomia: boolean;
  historyCongenitalMalformation: boolean;
  historyMultiplePregnancy: boolean;
  historyAntepartumBleeding: boolean;
  recurrentPregnancyLoss: boolean;
  familyPlanningBeforePregnancy: boolean;
  familyPlanningMethod: string | null;
  familyPlanningDurationMonths: number | null;
  historyLowBirthWeightDelivery: boolean;
  disabilitiesNotes: string | null;
  numberOfBabies: number;
  hadHypertensionDisorder: boolean;
  partnerAccompanied: boolean;
}

const SCREENING_RESULT_TO_FRONTEND: Record<string, ScreeningResult> = {
  NEGATIVE: "negative",
  POSITIVE: "positive",
  UNKNOWN: "unknown",
};
const SCREENING_RESULT_TO_BACKEND: Record<ScreeningResult, "NEGATIVE" | "POSITIVE" | "UNKNOWN"> = {
  negative: "NEGATIVE",
  positive: "POSITIVE",
  unknown: "UNKNOWN",
};

const DELIVERY_OUTCOME_TO_BACKEND = {
  "live-birth": "LIVE_BIRTH",
  stillbirth: "STILLBIRTH",
  "maternal-death": "MATERNAL_DEATH",
} as const;
const DELIVERY_OUTCOME_TO_FRONTEND: Record<string, "live-birth" | "stillbirth" | "maternal-death"> = {
  LIVE_BIRTH: "live-birth",
  STILLBIRTH: "stillbirth",
  MATERNAL_DEATH: "maternal-death",
};

const DELIVERY_METHOD_TO_BACKEND = {
  vaginal: "VAGINAL",
  cesarean: "CESAREAN",
  assisted: "ASSISTED",
} as const;
const DELIVERY_METHOD_TO_FRONTEND: Record<string, "vaginal" | "cesarean" | "assisted"> = {
  VAGINAL: "vaginal",
  CESAREAN: "cesarean",
  ASSISTED: "assisted",
};

const BABY_STATUS_TO_BACKEND = { alive: "ALIVE", deceased: "DECEASED" } as const;
const BABY_STATUS_TO_FRONTEND: Record<string, "alive" | "deceased"> = {
  ALIVE: "alive",
  DECEASED: "deceased",
};

export function toFrontendPregnancy(p: BackendPregnancy): Pregnancy {
  return {
    id: p.id,
    patientId: p.patientId,
    pregnancyNumber: p.pregnancyNumber,
    gravidity: p.gravidity,
    parity: p.parity,
    termDeliveries: p.termDeliveries ?? undefined,
    prematureDeliveriesCount: p.prematureDeliveriesCount ?? undefined,
    numberOfAbortions: p.numberOfAbortions ?? undefined,
    aliveChildren: p.aliveChildren ?? undefined,
    ageOfLastBornYears: p.ageOfLastBornYears ?? undefined,
    monthsOfLastBorn: p.monthsOfLastBorn ?? undefined,
    previousCS: p.previousCSCount,
    previousPPH: p.previousPPH,
    previousEclampsia: p.previousEclampsia,
    previousStillbirth: p.previousStillbirth,
    lmpDate: p.lmp?.slice(0, 10) ?? "",
    eddDate: p.edd.slice(0, 10),
    startDate: p.startDate.slice(0, 10),
    status: p.status === "OPEN" ? "open" : "closed",
    createdAt: p.createdAt,
    numberOfBabies: p.numberOfBabies,
    hadHypertensionDisorder: p.hadHypertensionDisorder,
    partnerAccompanied: p.partnerAccompanied,
    historySurgicalOrCervicalTrauma: p.historySurgicalOrCervicalTrauma,
    historyGynecologicalProblem: p.historyGynecologicalProblem,
    currentlyOnMedication: p.currentlyOnMedication,
    currentMedicationDetails: p.currentMedicationDetails ?? undefined,
    historyDiabetes: p.historyDiabetes,
    historyLungDisease: p.historyLungDisease,
    historyHypertension: p.historyHypertension,
    alcoholUse: p.alcoholUse,
    mentalIllnessNotes: p.mentalIllnessNotes ?? undefined,
    historyKidneyProblems: p.historyKidneyProblems,
    tobaccoUse: p.tobaccoUse,
    hivTestResult: p.hivTestResult ? SCREENING_RESULT_TO_FRONTEND[p.hivTestResult] : undefined,
    historyHeartDisease: p.historyHeartDisease,
    torchScreeningNotes: p.torchScreeningNotes ?? undefined,
    stiScreeningResult: p.stiScreeningResult ? SCREENING_RESULT_TO_FRONTEND[p.stiScreeningResult] : undefined,
    historyPretermDelivery: p.historyPretermDelivery,
    historyMacrosomia: p.historyMacrosomia,
    historyCongenitalMalformation: p.historyCongenitalMalformation,
    historyMultiplePregnancy: p.historyMultiplePregnancy,
    historyAntepartumBleeding: p.historyAntepartumBleeding,
    recurrentPregnancyLoss: p.recurrentPregnancyLoss,
    familyPlanningBeforePregnancy: p.familyPlanningBeforePregnancy,
    familyPlanningMethod: p.familyPlanningMethod ?? undefined,
    familyPlanningDurationMonths: p.familyPlanningDurationMonths ?? undefined,
    historyLowBirthWeightDelivery: p.historyLowBirthWeightDelivery,
    disabilitiesNotes: p.disabilitiesNotes ?? undefined,
    delivery:
      p.deliveryOutcome && p.deliveryDate && p.deliveryMethod && p.babyStatus && p.motherCondition
        ? {
            outcome: DELIVERY_OUTCOME_TO_FRONTEND[p.deliveryOutcome],
            date: p.deliveryDate.slice(0, 10),
            method: DELIVERY_METHOD_TO_FRONTEND[p.deliveryMethod],
            babyStatus: BABY_STATUS_TO_FRONTEND[p.babyStatus],
            birthWeightKg: p.birthWeightKg ?? 0,
            motherCondition: p.motherCondition,
            summary: p.pregnancySummary ?? "",
            numberOfBabies: p.numberOfBabies,
            hadHypertensionDisorder: p.hadHypertensionDisorder,
          }
        : undefined,
  };
}

export async function fetchPregnanciesForPatient(patientId: string): Promise<Pregnancy[]> {
  const token = getStoredAccessToken();
  const pregnancies = await apiFetch<BackendPregnancy[]>(`/patients/${patientId}/pregnancies`, {
    token: token ?? undefined,
  });
  return pregnancies.map(toFrontendPregnancy);
}

// Large page size — no pagination UI exists yet, this approximates "fetch
// all" for the current small seed dataset, matching fetchPatients()'s exact
// convention. Revisit if the pregnancy count grows past this limit.
export async function fetchAllPregnancies(): Promise<Pregnancy[]> {
  const token = getStoredAccessToken();
  const result = await apiFetch<{ data: BackendPregnancy[]; meta: unknown }>("/pregnancies?limit=200", {
    token: token ?? undefined,
  });
  return result.data.map(toFrontendPregnancy);
}

export async function createPregnancyApi(
  data: Omit<
    Pregnancy,
    "id" | "pregnancyNumber" | "eddDate" | "status" | "createdAt" | "delivery" | "numberOfBabies" | "hadHypertensionDisorder"
  >,
): Promise<Pregnancy> {
  const token = getStoredAccessToken();
  const p = await apiFetch<BackendPregnancy>(`/patients/${data.patientId}/pregnancies`, {
    method: "POST",
    body: {
      gravidity: data.gravidity,
      parity: data.parity,
      termDeliveries: data.termDeliveries,
      prematureDeliveriesCount: data.prematureDeliveriesCount,
      numberOfAbortions: data.numberOfAbortions,
      aliveChildren: data.aliveChildren,
      ageOfLastBornYears: data.ageOfLastBornYears,
      monthsOfLastBorn: data.monthsOfLastBorn,
      previousCSCount: data.previousCS,
      previousPPH: data.previousPPH,
      previousEclampsia: data.previousEclampsia,
      previousStillbirth: data.previousStillbirth,
      edd: computeEdd(data.lmpDate),
      lmp: data.lmpDate,
      startDate: data.startDate,
      historySurgicalOrCervicalTrauma: data.historySurgicalOrCervicalTrauma,
      historyGynecologicalProblem: data.historyGynecologicalProblem,
      currentlyOnMedication: data.currentlyOnMedication,
      currentMedicationDetails: data.currentMedicationDetails,
      historyDiabetes: data.historyDiabetes,
      historyLungDisease: data.historyLungDisease,
      historyHypertension: data.historyHypertension,
      alcoholUse: data.alcoholUse,
      mentalIllnessNotes: data.mentalIllnessNotes,
      historyKidneyProblems: data.historyKidneyProblems,
      tobaccoUse: data.tobaccoUse,
      hivTestResult: data.hivTestResult ? SCREENING_RESULT_TO_BACKEND[data.hivTestResult] : undefined,
      historyHeartDisease: data.historyHeartDisease,
      torchScreeningNotes: data.torchScreeningNotes,
      stiScreeningResult: data.stiScreeningResult ? SCREENING_RESULT_TO_BACKEND[data.stiScreeningResult] : undefined,
      historyPretermDelivery: data.historyPretermDelivery,
      historyMacrosomia: data.historyMacrosomia,
      historyCongenitalMalformation: data.historyCongenitalMalformation,
      historyMultiplePregnancy: data.historyMultiplePregnancy,
      historyAntepartumBleeding: data.historyAntepartumBleeding,
      recurrentPregnancyLoss: data.recurrentPregnancyLoss,
      familyPlanningBeforePregnancy: data.familyPlanningBeforePregnancy,
      familyPlanningMethod: data.familyPlanningMethod,
      familyPlanningDurationMonths: data.familyPlanningDurationMonths,
      historyLowBirthWeightDelivery: data.historyLowBirthWeightDelivery,
      disabilitiesNotes: data.disabilitiesNotes,
      partnerAccompanied: data.partnerAccompanied,
    },
    token: token ?? undefined,
  });
  return toFrontendPregnancy(p);
}

export async function closePregnancyApi(
  pregnancyId: string,
  delivery: NonNullable<Pregnancy["delivery"]>,
): Promise<Pregnancy> {
  const token = getStoredAccessToken();
  const p = await apiFetch<BackendPregnancy>(`/pregnancies/${pregnancyId}/close`, {
    method: "PATCH",
    body: {
      deliveryOutcome: DELIVERY_OUTCOME_TO_BACKEND[delivery.outcome],
      deliveryDate: delivery.date,
      deliveryMethod: DELIVERY_METHOD_TO_BACKEND[delivery.method],
      babyStatus: BABY_STATUS_TO_BACKEND[delivery.babyStatus],
      birthWeightKg: delivery.birthWeightKg,
      motherCondition: delivery.motherCondition,
      pregnancySummary: delivery.summary,
      numberOfBabies: delivery.numberOfBabies,
      hadHypertensionDisorder: delivery.hadHypertensionDisorder,
    },
    token: token ?? undefined,
  });
  return toFrontendPregnancy(p);
}

export interface PregnancyUpdatableFields extends PregnancyMedicalHistory {
  partnerAccompanied?: boolean;
  gravidity?: number;
  parity?: number;
  termDeliveries?: number;
  prematureDeliveriesCount?: number;
  numberOfAbortions?: number;
  aliveChildren?: number;
  ageOfLastBornYears?: number;
  monthsOfLastBorn?: number;
  previousCS?: number;
  previousPPH?: boolean;
  previousEclampsia?: boolean;
  previousStillbirth?: boolean;
}

export async function updatePregnancyApi(
  pregnancyId: string,
  updates: PregnancyUpdatableFields,
): Promise<Pregnancy> {
  const token = getStoredAccessToken();
  const body: Record<string, unknown> = { ...updates };
  if (updates.hivTestResult) {
    body.hivTestResult = SCREENING_RESULT_TO_BACKEND[updates.hivTestResult];
  }
  if (updates.stiScreeningResult) {
    body.stiScreeningResult = SCREENING_RESULT_TO_BACKEND[updates.stiScreeningResult];
  }
  if (updates.previousCS !== undefined) {
    body.previousCSCount = updates.previousCS;
    delete body.previousCS;
  }
  const p = await apiFetch<BackendPregnancy>(`/pregnancies/${pregnancyId}`, {
    method: "PATCH",
    body,
    token: token ?? undefined,
  });
  return toFrontendPregnancy(p);
}
