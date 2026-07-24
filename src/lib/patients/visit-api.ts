import { apiFetch } from "@/lib/api/client";
import { getStoredAccessToken } from "@/lib/auth/auth-context";
import type { Visit, VisitLabs, VisitType } from "./types";

interface BackendVitalSigns {
  systolic: number | null;
  diastolic: number | null;
  temperature: number | null;
  pulse: number | null;
  weight: number | null;
  fetalHeartRate: number | null;
  fundalHeight: number | null;
  edema: string | null;
}

interface BackendVisit {
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
  riskAssessment: { riskLevel: "GREEN" | "YELLOW" | "ORANGE" | "RED" } | null;
}

// Slice 5 (Antenatal-api, Risk Classification Unification) mapping, reused
// as-is — see docs/superpowers/specs/2026-07-21-risk-classification-unification-design.md.
// 4 checklist tags are deliberately absent: `severe-anemia` (lab-domain,
// deferred), `prev-pph`/`prev-cs-2x`'s history component (already sent as
// Pregnancy fields at pregnancy-create time, not per-visit), `teenage`/
// `advanced-age` (computed backend-side from Patient.dateOfBirth).
const CHECKLIST_TAG_TO_SYMPTOM: Record<string, string> = {
  convulsions: "CONVULSION",
  bleeding: "BLEEDING",
  headache: "HEADACHE",
  fever: "FEVER",
  "chest-pain": "CHEST_PAIN",
  "abdominal-pain": "ABDOMINAL_PAIN",
  "difficulty-breathing": "DIFFICULTY_BREATHING",
  "reduced-fetal-movement": "REDUCED_FETAL_MOVEMENT",
  "uncontrolled-htn": "CHRONIC_HTN_UNCONTROLLED",
  "controlled-htn": "CHRONIC_HTN_CONTROLLED",
  preeclampsia: "PREECLAMPSIA",
  pph: "ACTIVE_PPH",
  "multiple-gestation": "MULTIPLE_GESTATION",
  "preterm-labor": "PRETERM_LABOR",
  "prev-cs-2x": "IN_LABOR",
  "teenage-labor": "IN_LABOR",
};
const SYMPTOM_TO_CHECKLIST_TAG: Record<string, string> = {
  CONVULSION: "convulsions",
  BLEEDING: "bleeding",
  HEADACHE: "headache",
  FEVER: "fever",
  CHEST_PAIN: "chest-pain",
  ABDOMINAL_PAIN: "abdominal-pain",
  DIFFICULTY_BREATHING: "difficulty-breathing",
  REDUCED_FETAL_MOVEMENT: "reduced-fetal-movement",
  CHRONIC_HTN_UNCONTROLLED: "uncontrolled-htn",
  CHRONIC_HTN_CONTROLLED: "controlled-htn",
  PREECLAMPSIA: "preeclampsia",
  ACTIVE_PPH: "pph",
  MULTIPLE_GESTATION: "multiple-gestation",
  PRETERM_LABOR: "preterm-labor",
  // IN_LABOR intentionally has no reverse mapping — it's shared by two
  // checklist tags (`prev-cs-2x`, `teenage-labor`) on the way in, so it
  // can't round-trip to a single tag on the way out. Dropped on read.
};

// New to this slice — danger-sign IDs (Emergency panel) that have a genuine
// clinical SymptomName equivalent. `very-high-bp`/`high-fever` need no entry
// (they're carried by real vitals, which the backend's rule engine reads
// directly). `loss-of-consciousness`/`ruptured-uterus` have no backend
// equivalent and are dropped, same as the checklist's own unmapped tags.
const DANGER_SIGN_TO_SYMPTOM: Record<string, string> = {
  "severe-bleeding": "BLEEDING",
  convulsions: "CONVULSION",
  "severe-headache-blurred-vision": "HEADACHE",
  "difficulty-breathing": "DIFFICULTY_BREATHING",
  "severe-abdominal-pain": "ABDOMINAL_PAIN",
  "reduced-fetal-movement": "REDUCED_FETAL_MOVEMENT",
};

function symptomIdsToBackend(symptomIds: string[], isEmergency: boolean): string[] {
  const table = isEmergency ? DANGER_SIGN_TO_SYMPTOM : CHECKLIST_TAG_TO_SYMPTOM;
  const mapped = symptomIds.map((id) => table[id]).filter((v): v is string => v !== undefined);
  return Array.from(new Set(mapped));
}

function backendSymptomsToIds(symptoms: { name: string }[]): string[] {
  return symptoms
    .map((s) => SYMPTOM_TO_CHECKLIST_TAG[s.name])
    .filter((v): v is string => v !== undefined);
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

function toFrontendVisit(v: BackendVisit): Visit {
  const labs: VisitLabs | undefined = v.vitalSigns
    ? {
        bpSystolic: v.vitalSigns.systolic ?? undefined,
        bpDiastolic: v.vitalSigns.diastolic ?? undefined,
        temperature: v.vitalSigns.temperature ?? undefined,
        pulse: v.vitalSigns.pulse ?? undefined,
        weight: v.vitalSigns.weight ?? undefined,
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
    symptomIds: backendSymptomsToIds(v.symptoms),
    notes: v.notes ?? "",
    riskLevel: v.riskAssessment ? RISK_LEVEL_TO_FRONTEND[v.riskAssessment.riskLevel] : "green",
    labs,
    // Always undefined: lab status lives in the backend's separate, not-yet-
    // migrated LabRequest/LabResult domain, which this slice doesn't touch.
    // Known consequence (found + accepted during Slice C's verification, not
    // fixed here): usePatientLock()'s cross-facility lock check and
    // patients/[id]/page.tsx's AwaitingLabsBlocker/FinalizeAssessmentBlocker
    // gating both key off labStatus, so neither can ever trigger for a real
    // visit until a future Lab Requests integration slice wires this field.
    labStatus: undefined,
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
  },
): Promise<Visit> {
  const token = getStoredAccessToken();
  const v = await apiFetch<BackendVisit>(`/pregnancies/${pregnancyId}/visits`, {
    method: "POST",
    body: {
      visitType: VISIT_TYPE_TO_BACKEND[data.type],
      gestationalWeek: data.scheduledWeek,
      ancNumber: data.ancNumber,
      symptoms: symptomIdsToBackend(data.symptomIds, data.type === "emergency"),
      notes: data.notes,
      emergencySummary: data.emergencySummary,
      vitals: data.labs
        ? {
            systolic: data.labs.bpSystolic,
            diastolic: data.labs.bpDiastolic,
            temperature: data.labs.temperature,
            pulse: data.labs.pulse,
            weight: data.labs.weight,
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
