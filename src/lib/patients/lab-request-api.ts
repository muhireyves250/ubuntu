import { apiFetch } from "@/lib/api/client";
import { getStoredAccessToken } from "@/lib/auth/auth-context";
import type { LabPriority, LabRequest } from "./types";
import type { LabTestResult } from "./types";

interface BackendLabResult {
  id: string;
  hemoglobin: number | null;
  platelets: number | null;
  bloodSugar: number | null;
  urineProtein: string | null;
  isCritical: boolean;
  interpretation: "NORMAL" | "ABNORMAL" | "CRITICAL";
  labNotes: string | null;
  createdAt: string;
}

interface BackendLabRequest {
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

// Fixed mapping for the app's 4 default requested tests — confirmed with the
// project owner. Each entry: [frontend testName, backend field, display unit].
const TEST_FIELD_MAP: [string, keyof BackendLabResult, string][] = [
  ["Hemoglobin (Hb)", "hemoglobin", "g/dL"],
  ["Complete Blood Count (CBC)", "platelets", "x10³/µL"],
  ["Blood Glucose", "bloodSugar", "mmol/L"],
  ["Urine Analysis", "urineProtein", ""],
];

function computeAge(dateOfBirth: string): number {
  const ageMs = Date.now() - new Date(dateOfBirth).getTime();
  return Math.floor(ageMs / 31_557_600_000);
}

function toFrontendLabRequest(r: BackendLabRequest): LabRequest {
  const { patient } = r.visit.pregnancy;
  const labResult = r.labResults[0];

  const results: LabTestResult[] = labResult
    ? TEST_FIELD_MAP.filter(([, field]) => labResult[field] != null).map(
        ([testName, field, unit], idx) => ({
          id: `${labResult.id}-${idx}`,
          testName,
          result: String(labResult[field]),
          unit,
          referenceRange: "Varies",
          interpretation: INTERPRETATION_TO_FRONTEND[labResult.interpretation],
          completedAt: labResult.createdAt,
          completedBy: r.assignedTo ? `${r.assignedTo.firstName} ${r.assignedTo.lastName}` : undefined,
        }),
      )
    : [];

  return {
    id: r.id,
    visitId: r.visit.id,
    patientId: patient.nationalId || patient.id,
    patientName: `${patient.firstName} ${patient.lastName}`,
    patientAge: computeAge(patient.dateOfBirth),
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
): Promise<LabRequest> {
  const token = getStoredAccessToken();
  const r = await apiFetch<BackendLabRequest>(`/lab-requests/visits/${visitId}`, {
    method: "POST",
    body: { priority: PRIORITY_TO_BACKEND[priority], notes },
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

export async function submitLabResultsApi(id: string, results: LabTestResult[]): Promise<LabRequest> {
  const token = getStoredAccessToken();
  const resultByTestName = new Map(results.map((res) => [res.testName, res]));
  const body: Record<string, unknown> = {};
  for (const [testName, field] of TEST_FIELD_MAP) {
    const res = resultByTestName.get(testName);
    if (!res || res.result === "") continue;
    if (field === "urineProtein") {
      body[field] = res.result;
    } else {
      const num = parseFloat(res.result);
      if (!isNaN(num)) body[field] = num;
    }
  }
  const hasCritical = results.some((res) => res.interpretation === "Critical");
  body.isCritical = hasCritical;
  body.interpretation = hasCritical
    ? "CRITICAL"
    : results.some((res) => res.interpretation === "Abnormal")
      ? "ABNORMAL"
      : "NORMAL";

  const r = await apiFetch<BackendLabRequest>(`/lab-requests/${id}/submit`, {
    method: "PATCH",
    body,
    token: token ?? undefined,
  });
  return toFrontendLabRequest(r);
}
