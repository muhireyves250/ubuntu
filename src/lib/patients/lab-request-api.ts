import { apiFetch } from "@/lib/api/client";
import { getStoredAccessToken } from "@/lib/auth/auth-context";
import type { LabPriority, LabRequest } from "./types";
import type { LabTestResult } from "./types";

interface BackendLabResultEntry {
  id: string;
  testName: string;
  result: string;
  unit: string | null;
  interpretation: "NORMAL" | "ABNORMAL" | "CRITICAL";
  createdAt: string;
}

interface BackendLabResult {
  id: string;
  hemoglobin: number | null;
  platelets: number | null;
  bloodSugar: number | null;
  urineProtein: string | null;
  bloodGroup: string | null;
  rhFactor: string | null;
  hivStatus: string | null;
  syphilisStatus: string | null;
  malariaTest: string | null;
  isCritical: boolean;
  interpretation: "NORMAL" | "ABNORMAL" | "CRITICAL";
  labNotes: string | null;
  createdAt: string;
  comments: { id: string; body: string; createdAt: string; author: { id: string; firstName: string; lastName: string; role: string } }[];
  entries: BackendLabResultEntry[];
}

interface BackendLabResultRow {
  id: string;
  labResultId: string;
  testName: string;
  result: string;
  unit: string;
  referenceRange: string;
  interpretation: "NORMAL" | "ABNORMAL" | "CRITICAL";
  completedAt: string;
  completedBy?: string;
  comments: BackendLabResult["comments"];
}

interface BackendLabRequest {
  /** The completed panel as display rows (from the API). */
  results: BackendLabResultRow[];
  id: string;
  priority: "NORMAL" | "URGENT" | "EMERGENCY";
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  requestedTests: string[];
  notes: string | null;
  acceptedAt: string | null;
  createdAt: string;
  visit: {
    id: string;
    visitType: "SCHEDULED" | "UNSCHEDULED" | "EMERGENCY";
    gestationalWeek: number | null;
    ancNumber: number | null;
    pregnancy: {
      id: string;
      pregnancyNumber: number;
      patient: {
        id: string;
        firstName: string;
        lastName: string;
        nationalId: string;
        dateOfBirth: string;
        age: number;
        phone: string;
      };
    };
  };
  requestedBy: { id: string; firstName: string; lastName: string; role: string };
  assignedTo: { id: string; firstName: string; lastName: string } | null;
  facility: { id: string; name: string };
  labResults: BackendLabResult[];
}

const PRIORITY_TO_BACKEND: Record<LabPriority, "NORMAL" | "URGENT" | "EMERGENCY"> = {
  Normal: "NORMAL",
  Urgent: "URGENT",
  Emergency: "EMERGENCY",
};
const PRIORITY_TO_FRONTEND: Record<string, LabPriority> = {
  NORMAL: "Normal",
  URGENT: "Urgent",
  EMERGENCY: "Emergency",
};

const STATUS_TO_FRONTEND: Record<string, LabRequest["status"]> = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
};

const VISIT_TYPE_TO_FRONTEND: Record<string, LabRequest["visitType"]> = {
  SCHEDULED: "Scheduled ANC",
  UNSCHEDULED: "Unscheduled ANC",
  EMERGENCY: "Emergency Visit",
};

const INTERPRETATION_TO_FRONTEND: Record<string, LabTestResult["interpretation"]> = {
  NORMAL: "Normal",
  ABNORMAL: "Abnormal",
  CRITICAL: "Critical",
};

function toFrontendLabRequest(r: BackendLabRequest): LabRequest {
  const { patient } = r.visit.pregnancy;
  // The API sends the completed panel as display rows; the comment thread
  // is on the first row only.
  const results: LabTestResult[] = r.results.map((row) => ({
    id: row.id,
    labResultId: row.labResultId,
    testName: row.testName,
    result: row.result,
    unit: row.unit,
    referenceRange: row.referenceRange,
    interpretation: INTERPRETATION_TO_FRONTEND[row.interpretation],
    completedAt: row.completedAt,
    completedBy: row.completedBy,
    resultComments: row.comments.map((c) => ({
      id: c.id,
      labResultId: row.labResultId,
      authorId: c.author.id,
      authorName: `${c.author.firstName} ${c.author.lastName}`,
      authorRole: c.author.role,
      body: c.body,
      createdAt: c.createdAt,
    })),
  }));

  return {
    id: r.id,
    visitId: r.visit.id,
    patientId: patient.nationalId || patient.id,
    patientName: `${patient.firstName} ${patient.lastName}`,
    patientPhone: patient.phone,
    patientAge: patient.age,
    pregnancyNumber: r.visit.pregnancy.pregnancyNumber,
    visitNumber: r.visit.ancNumber ?? 0,
    gestationalAge: r.visit.gestationalWeek ? `${r.visit.gestationalWeek} weeks` : "-",
    requestDate: r.createdAt,
    requestingNurseId: `${r.requestedBy.firstName} ${r.requestedBy.lastName}`,
    requestedById: r.requestedBy.id,
    visitType: VISIT_TYPE_TO_FRONTEND[r.visit.visitType] ?? "Scheduled ANC",
    priority: PRIORITY_TO_FRONTEND[r.priority] ?? "Normal",
    status: STATUS_TO_FRONTEND[r.status] ?? "Pending",
    facility: r.facility.name,
    requestedInvestigatonNames: r.requestedTests,
    clinicalNotes: r.notes ?? "",
    allergies: undefined,
    results,
    acceptedBy: r.assignedTo ? `${r.assignedTo.firstName} ${r.assignedTo.lastName}` : undefined,
    acceptedAt: r.acceptedAt ?? undefined,
  };
}

// QueryLabRequestsDto caps limit at 100 (unlike QueryPatientDto's 200) — no
// pagination UI exists yet, this approximates "fetch all" for the current
// small seed dataset within that cap.
export async function fetchLabRequests(): Promise<LabRequest[]> {
  const token = getStoredAccessToken();
  const result = await apiFetch<{ data: BackendLabRequest[]; meta: unknown }>(
    "/lab-requests?limit=100",
    { token: token ?? undefined },
  );
  return result.data.map(toFrontendLabRequest);
}

export async function fetchLabRequest(id: string): Promise<LabRequest> {
  const token = getStoredAccessToken();
  const r = await apiFetch<BackendLabRequest>(`/lab-requests/${id}`, { token: token ?? undefined });
  return toFrontendLabRequest(r);
}

export async function createLabRequestApi(
  visitId: string,
  priority: LabPriority,
  notes?: string,
  requestedTests?: string[],
): Promise<LabRequest> {
  const token = getStoredAccessToken();
  const r = await apiFetch<BackendLabRequest>(`/lab-requests/visits/${visitId}`, {
    method: "POST",
    body: {
      priority: PRIORITY_TO_BACKEND[priority],
      notes,
      requestedTests: requestedTests && requestedTests.length > 0 ? requestedTests : undefined,
    },
    token: token ?? undefined,
  });
  return toFrontendLabRequest(r);
}

export async function acceptLabRequestApi(id: string): Promise<LabRequest> {
  const token = getStoredAccessToken();
  const r = await apiFetch<BackendLabRequest>(`/lab-requests/${id}/accept`, {
    method: "PATCH",
    token: token ?? undefined,
  });
  return toFrontendLabRequest(r);
}

const INTERPRETATION_TO_BACKEND: Record<LabTestResult["interpretation"], "NORMAL" | "ABNORMAL" | "CRITICAL"> = {
  Normal: "NORMAL",
  Abnormal: "ABNORMAL",
  Critical: "CRITICAL",
};

export async function submitLabResultsApi(
  id: string,
  results: LabTestResult[],
  labNotes?: string,
): Promise<LabRequest> {
  const token = getStoredAccessToken();
  // The API decides where each answer is stored and the overall verdict.
  const body = {
    results: results.map((res) => ({
      testName: res.testName,
      result: res.result,
      unit: res.unit || undefined,
      interpretation: INTERPRETATION_TO_BACKEND[res.interpretation],
    })),
    labNotes: labNotes || undefined,
  };

  const r = await apiFetch<BackendLabRequest>(`/lab-requests/${id}/submit`, {
    method: "PATCH",
    body,
    token: token ?? undefined,
  });
  return toFrontendLabRequest(r);
}
