import { apiFetch } from "@/lib/api/client";
import { getStoredAccessToken } from "@/lib/auth/auth-context";

export interface VisitDiagnosis {
  id: string;
  visitId: string;
  code: string;
  title: string;
  uri?: string;
  caseStatus: string;
  diagnosisType: string;
  department?: string;
  treatmentNotes?: string;
  createdAt: string;
}

interface BackendDiagnosis {
  id: string;
  visitId: string;
  code: string;
  title: string;
  uri: string | null;
  caseStatus: string;
  diagnosisType: string;
  department: string | null;
  treatmentNotes: string | null;
  createdAt: string;
}

function toFrontendDiagnosis(d: BackendDiagnosis): VisitDiagnosis {
  return {
    id: d.id,
    visitId: d.visitId,
    code: d.code,
    title: d.title,
    uri: d.uri ?? undefined,
    caseStatus: d.caseStatus,
    diagnosisType: d.diagnosisType,
    department: d.department ?? undefined,
    treatmentNotes: d.treatmentNotes ?? undefined,
    createdAt: d.createdAt,
  };
}

export async function fetchDiagnosesForVisit(visitId: string): Promise<VisitDiagnosis[]> {
  const token = getStoredAccessToken();
  const diagnoses = await apiFetch<BackendDiagnosis[]>(`/diagnoses/${visitId}`, {
    token: token ?? undefined,
  });
  return diagnoses.map(toFrontendDiagnosis);
}

export async function createDiagnosisApi(data: {
  visitId: string;
  code: string;
  title: string;
  uri?: string;
  caseStatus?: string;
  diagnosisType?: string;
  department?: string;
  treatmentNotes?: string;
}): Promise<VisitDiagnosis> {
  const token = getStoredAccessToken();
  const d = await apiFetch<BackendDiagnosis>("/diagnoses", {
    method: "POST",
    body: data,
    token: token ?? undefined,
  });
  return toFrontendDiagnosis(d);
}
