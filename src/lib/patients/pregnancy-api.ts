import { apiFetch } from "@/lib/api/client";
import { getStoredAccessToken } from "@/lib/auth/auth-context";
import { computeEdd } from "./pregnancy";
import type { Pregnancy } from "./types";

interface BackendPregnancy {
  id: string;
  patientId: string;
  gravidity: number;
  parity: number;
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
}

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

function toFrontendPregnancy(p: BackendPregnancy): Pregnancy {
  return {
    id: p.id,
    patientId: p.patientId,
    pregnancyNumber: p.pregnancyNumber,
    gravidity: p.gravidity,
    parity: p.parity,
    previousCS: p.previousCSCount,
    previousPPH: p.previousPPH,
    previousEclampsia: p.previousEclampsia,
    previousStillbirth: p.previousStillbirth,
    lmpDate: p.lmp?.slice(0, 10) ?? "",
    eddDate: p.edd.slice(0, 10),
    startDate: p.startDate.slice(0, 10),
    status: p.status === "OPEN" ? "open" : "closed",
    createdAt: p.createdAt,
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

export async function createPregnancyApi(
  data: Omit<Pregnancy, "id" | "pregnancyNumber" | "eddDate" | "status" | "createdAt" | "delivery">,
): Promise<Pregnancy> {
  const token = getStoredAccessToken();
  const p = await apiFetch<BackendPregnancy>(`/patients/${data.patientId}/pregnancies`, {
    method: "POST",
    body: {
      gravidity: data.gravidity,
      parity: data.parity,
      previousCSCount: data.previousCS,
      previousPPH: data.previousPPH,
      previousEclampsia: data.previousEclampsia,
      previousStillbirth: data.previousStillbirth,
      edd: computeEdd(data.lmpDate),
      lmp: data.lmpDate,
      startDate: data.startDate,
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
    },
    token: token ?? undefined,
  });
  return toFrontendPregnancy(p);
}
