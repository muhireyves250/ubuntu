import { apiFetch, apiFetchAllPages } from "@/lib/api/client";
import { getStoredAccessToken } from "@/lib/auth/auth-context";
import type { Visit, VisitLabs, VisitType, Pregnancy, Referral } from "./types";
import { toFrontendPregnancy, type BackendPregnancy } from "./pregnancy-api";
import { toFrontendReferral, type BackendReferral } from "./referral-api";

interface BackendVitalSigns {
  systolic: number | null;
  diastolic: number | null;
  temperature: number | null;
  pulse: number | null;
  respiratoryRate: number | null;
  weight: number | null;
  height: number | null;
  fetalHeartRate: number | null;
  fundalHeight: number | null;
  edema: string | null;
}

export interface BackendVisit {
  id: string;
  pregnancyId: string;
  visitDate: string;
  visitType: "SCHEDULED" | "UNSCHEDULED" | "EMERGENCY";
  ancNumber: number | null;
  gestationalWeek: number | null;
  facility: { id: string; name: string } | null;
  attendedBy: { firstName: string; lastName: string } | null;
  notes: string | null;
  emergencySummary: string | null;
  treatment: string | null;
  followUpPlan: string | null;
  assessmentFinalized: boolean;
  createdAt: string;
  vitalSigns: BackendVitalSigns | null;
  symptoms: { id: string; name: string; createdAt: string }[];
  /** The symptoms as checklist tags (from the API). */
  symptomTags: string[];
  riskAssessment: { riskLevel: "GREEN" | "YELLOW" | "ORANGE" | "RED" } | null;
  labRequests: { status: "PENDING" | "IN_PROGRESS" | "COMPLETED" }[];
}

const VISIT_TYPE_TO_BACKEND: Record<VisitType, "SCHEDULED" | "UNSCHEDULED" | "EMERGENCY"> = {
  scheduled: "SCHEDULED",
  unscheduled: "UNSCHEDULED",
  emergency: "EMERGENCY",
};
const VISIT_TYPE_TO_FRONTEND: Record<string, VisitType> = {
  SCHEDULED: "scheduled",
  UNSCHEDULED: "unscheduled",
  EMERGENCY: "emergency",
};

const RISK_LEVEL_TO_FRONTEND: Record<string, "green" | "yellow" | "orange" | "red"> = {
  GREEN: "green",
  YELLOW: "yellow",
  ORANGE: "orange",
  RED: "red",
};

const LAB_STATUS_TO_FRONTEND: Record<string, "pending" | "in_progress" | "completed" | undefined> = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
};

export function toFrontendVisit(v: BackendVisit): Visit {
  const labs: VisitLabs | undefined = v.vitalSigns
    ? {
        bpSystolic: v.vitalSigns.systolic ?? undefined,
        bpDiastolic: v.vitalSigns.diastolic ?? undefined,
        temperature: v.vitalSigns.temperature ?? undefined,
        pulse: v.vitalSigns.pulse ?? undefined,
        respiratoryRate: v.vitalSigns.respiratoryRate ?? undefined,
        weight: v.vitalSigns.weight ?? undefined,
        height: v.vitalSigns.height ?? undefined,
        fetalHeartRate: v.vitalSigns.fetalHeartRate ?? undefined,
        fundalHeight: v.vitalSigns.fundalHeight ?? undefined,
        edema: (v.vitalSigns.edema as VisitLabs["edema"]) ?? undefined,
      }
    : undefined;

  return {
    id: v.id,
    pregnancyId: v.pregnancyId,
    date: v.visitDate.slice(0, 10),
    type: VISIT_TYPE_TO_FRONTEND[v.visitType] ?? "scheduled",
    ancNumber: v.ancNumber ?? undefined,
    scheduledWeek: v.gestationalWeek ?? undefined,
    hospital: v.facility?.name ?? "",
    attendingNurse: v.attendedBy ? `${v.attendedBy.firstName} ${v.attendedBy.lastName}` : "",
    symptomIds: v.symptomTags,
    notes: v.notes ?? "",
    riskLevel: v.riskAssessment ? RISK_LEVEL_TO_FRONTEND[v.riskAssessment.riskLevel] : "green",
    labs,
    labStatus: LAB_STATUS_TO_FRONTEND[v.labRequests[0]?.status ?? ""],
    emergencySummary: v.emergencySummary ?? undefined,
    treatment: v.treatment ?? undefined,
    followUpPlan: v.followUpPlan ?? undefined,
    assessmentFinalized: v.assessmentFinalized,
    createdAt: v.createdAt,
  };
}

export async function fetchVisitsForPregnancy(pregnancyId: string): Promise<Visit[]> {
  const token = getStoredAccessToken();
  const visits = await apiFetch<BackendVisit[]>(`/pregnancies/${pregnancyId}/visits`, {
    token: token ?? undefined,
  });
  return visits.map(toFrontendVisit);
}

// One request across every pregnancy the patient has, instead of firing
// fetchVisitsForPregnancy once per pregnancy in parallel.
export async function fetchVisitsForPatient(patientId: string): Promise<Visit[]> {
  const token = getStoredAccessToken();
  const visits = await apiFetch<BackendVisit[]>(`/patients/${patientId}/visits`, {
    token: token ?? undefined,
  });
  return visits.map(toFrontendVisit);
}

// No pagination UI exists yet — fetch every page, like fetchPatients().
export async function fetchAllVisits(): Promise<Visit[]> {
  const token = getStoredAccessToken();
  const visits = await apiFetchAllPages<BackendVisit>("/visits", token ?? undefined);
  return visits.map(toFrontendVisit);
}

export async function createVisitApi(
  pregnancyId: string,
  data: {
    type: VisitType;
    ancNumber?: number;
    scheduledWeek?: number;
    symptomIds: string[];
    notes: string;
    labs?: VisitLabs;
    emergencySummary?: string;
    // The API finalizes the assessment straight away when it's complete
    // without labs, or sends the patient to the lab when labRequest is set.
    treatment?: string;
    followUpPlan?: string;
    labRequest?: { requestedTests?: string[]; notes?: string };
  },
): Promise<Visit> {
  const token = getStoredAccessToken();
  const v = await apiFetch<BackendVisit>(`/pregnancies/${pregnancyId}/visits`, {
    method: "POST",
    body: {
      visitType: VISIT_TYPE_TO_BACKEND[data.type],
      gestationalWeek: data.scheduledWeek,
      ancNumber: data.ancNumber,
      // The API stores the matching symptoms (and drops tags with none).
      symptomTags: data.symptomIds,
      notes: data.notes,
      emergencySummary: data.emergencySummary,
      treatment: data.treatment,
      followUpPlan: data.followUpPlan,
      labRequest: data.labRequest,
      vitals: data.labs
        ? {
            systolic: data.labs.bpSystolic,
            diastolic: data.labs.bpDiastolic,
            temperature: data.labs.temperature,
            pulse: data.labs.pulse,
            respiratoryRate: data.labs.respiratoryRate,
            weight: data.labs.weight,
            height: data.labs.height,
            fetalHeartRate: data.labs.fetalHeartRate,
            fundalHeight: data.labs.fundalHeight,
            edema: data.labs.edema,
          }
        : undefined,
    },
    token: token ?? undefined,
  });
  return toFrontendVisit(v);
}

// Opens (or returns) the emergency referral for a RED visit; null when the
// visit isn't RED. Routing to the right hospital is decided by the API.
export async function escalateVisitApi(visitId: string): Promise<Referral | null> {
  const token = getStoredAccessToken();
  const r = await apiFetch<BackendReferral | null>(`/visits/${visitId}/escalate`, {
    method: "POST",
    token: token ?? undefined,
  });
  return r ? toFrontendReferral(r) : null;
}

export async function finalizeVisitApi(
  visitId: string,
  treatment: string,
  followUpPlan: string,
): Promise<Visit> {
  const token = getStoredAccessToken();
  const v = await apiFetch<BackendVisit>(`/visits/${visitId}/finalize`, {
    method: "POST",
    body: { treatment, followUpPlan },
    token: token ?? undefined,
  });
  return toFrontendVisit(v);
}

// Single backend call that finds-or-creates the open pregnancy, creates the
// visit (forced RED), and finds-or-creates+accepts the emergency referral —
// replaces what used to be up to 4 sequential client-side round trips.
export async function createEmergencyVisitApi(
  patientId: string,
  dangerSigns: string[],
  vitals: { bpSystolic: string; bpDiastolic: string; temperature: string },
): Promise<{ pregnancy: Pregnancy; visit: Visit; referral: Referral }> {
  const token = getStoredAccessToken();
  const result = await apiFetch<{
    pregnancy: BackendPregnancy;
    visit: BackendVisit;
    referral: BackendReferral;
  }>(`/patients/${patientId}/emergency-visit`, {
    method: "POST",
    body: {
      dangerSigns,
      vitals,
    },
    token: token ?? undefined,
  });
  return {
    pregnancy: toFrontendPregnancy(result.pregnancy),
    visit: toFrontendVisit(result.visit),
    referral: toFrontendReferral(result.referral),
  };
}
