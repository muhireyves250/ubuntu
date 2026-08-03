import { apiFetch } from "@/lib/api/client";
import { getStoredAccessToken } from "@/lib/auth/auth-context";
import type { FollowUpAssignment, FollowUpReason, FollowUpPriority, FollowUpStatus } from "./types";

interface BackendChwAssignment {
  id: string;
  patientId: string;
  createdAt: string;
  reason: string;
  priority: string;
  dueDate: string;
  status: string;
  assignedBy: { firstName: string; lastName: string; role: string };
  assignedTo: { id: string; firstName: string; lastName: string; facilityId: string };
}

const REASON_TO_BACKEND: Record<FollowUpReason, string> = {
  missed_anc: "MISSED_ANC",
  high_risk_followup: "HIGH_RISK_FOLLOWUP",
  medication_adherence: "MEDICATION_ADHERENCE",
  bp_monitoring: "BP_MONITORING",
  nutrition_counseling: "NUTRITION_COUNSELING",
  post_emergency_followup: "POST_EMERGENCY_FOLLOWUP",
  general_monitoring: "GENERAL_MONITORING",
};
const REASON_TO_FRONTEND: Record<string, FollowUpReason> = {
  MISSED_ANC: "missed_anc",
  HIGH_RISK_FOLLOWUP: "high_risk_followup",
  MEDICATION_ADHERENCE: "medication_adherence",
  BP_MONITORING: "bp_monitoring",
  NUTRITION_COUNSELING: "nutrition_counseling",
  POST_EMERGENCY_FOLLOWUP: "post_emergency_followup",
  GENERAL_MONITORING: "general_monitoring",
};

const PRIORITY_TO_BACKEND: Record<FollowUpPriority, string> = {
  routine: "ROUTINE",
  high: "HIGH",
};
const PRIORITY_TO_FRONTEND: Record<string, FollowUpPriority> = {
  ROUTINE: "routine",
  HIGH: "high",
};

const STATUS_TO_FRONTEND: Record<string, FollowUpStatus> = {
  PENDING: "pending",
  COMPLETED: "completed",
};

function toFrontendAssignment(a: BackendChwAssignment): FollowUpAssignment {
  return {
    id: a.id,
    patientId: a.patientId,
    createdAt: a.createdAt,
    assignedByName: `${a.assignedBy.firstName} ${a.assignedBy.lastName}`,
    assignedByRole: a.assignedBy.role === "GYNECOLOGIST" ? "gynecologist" : "nurse",
    facility: "",
    assignedToChwId: a.assignedTo.id,
    reason: REASON_TO_FRONTEND[a.reason] ?? "general_monitoring",
    priority: PRIORITY_TO_FRONTEND[a.priority] ?? "routine",
    dueDate: a.dueDate.slice(0, 10),
    status: STATUS_TO_FRONTEND[a.status] ?? "pending",
  };
}

interface BackendChwMatch {
  id: string;
  firstName: string;
  lastName: string;
  matchedTier: "isibo" | "village";
}

export async function fetchChwMatch(
  patientId: string,
): Promise<{ id: string; name: string; matchedTier: "isibo" | "village" } | null> {
  const token = getStoredAccessToken();
  const match = await apiFetch<BackendChwMatch | null>(
    `/users/chw-match/${patientId}`,
    { token: token ?? undefined },
  );
  if (!match) return null;
  return { id: match.id, name: `${match.firstName} ${match.lastName}`, matchedTier: match.matchedTier };
}

export async function createChwAssignmentApi(data: {
  patientId: string;
  assignedToChwId: string;
  reason: FollowUpReason;
  priority: FollowUpPriority;
  dueDate: string;
}): Promise<FollowUpAssignment> {
  const token = getStoredAccessToken();
  const a = await apiFetch<BackendChwAssignment>("/chw-assignments", {
    method: "POST",
    body: {
      patientId: data.patientId,
      assignedToId: data.assignedToChwId,
      reason: REASON_TO_BACKEND[data.reason],
      priority: PRIORITY_TO_BACKEND[data.priority],
      dueDate: data.dueDate,
    },
    token: token ?? undefined,
  });
  return toFrontendAssignment(a);
}

export async function fetchAssignmentsForPatient(patientId: string): Promise<FollowUpAssignment[]> {
  const token = getStoredAccessToken();
  const assignments = await apiFetch<BackendChwAssignment[]>(
    `/chw-assignments/patient/${patientId}`,
    { token: token ?? undefined },
  );
  return assignments.map(toFrontendAssignment);
}

export async function fetchMyAssignments(): Promise<FollowUpAssignment[]> {
  const token = getStoredAccessToken();
  const assignments = await apiFetch<BackendChwAssignment[]>(
    "/chw-assignments/my-assignments",
    { token: token ?? undefined },
  );
  return assignments.map(toFrontendAssignment);
}