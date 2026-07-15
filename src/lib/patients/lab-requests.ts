import {
  getVisitsSnapshot,
  getPatientsSnapshot,
  getPregnanciesSnapshot,
  updateVisit as storageUpdateVisit,
  subscribeToVisits,
} from "./storage";
import { Visit, Patient, Pregnancy, LabTestResult, VisitLabs } from "./types";

export type LabPriority = "Normal" | "Urgent" | "Emergency";
export type LabStatus = "Pending" | "In Progress" | "Completed";
export type ResultInterpretation = "Normal" | "Abnormal" | "Critical";

export interface LabRequest {
  id: string; // Same as visit.id — single source of truth
  patientId: string;
  patientName: string;
  patientAge: number;
  pregnancyNumber: number;
  visitNumber: number;
  gestationalAge: string;
  requestDate: string;
  requestingNurseId: string;
  visitType: "Scheduled ANC" | "Unscheduled ANC" | "Emergency Visit";
  priority: LabPriority;
  status: LabStatus;
  facility: string;
  requestedInvestigatonNames: string[];
  clinicalNotes: string;
  allergies?: string;
  results: LabTestResult[];
  acceptedBy?: string;
  acceptedAt?: string;
}

// ─── Helper: derive a LabRequest from a labStatus-bearing visit ─────────────
function visitToLabRequest(visit: Visit): LabRequest | null {
  if (!visit.labStatus) return null;

  const patients = getPatientsSnapshot();
  const pregnancies = getPregnanciesSnapshot();

  const pregnancy = pregnancies.find((p) => p.id === visit.pregnancyId);
  if (!pregnancy) return null;

  const patient = patients.find((p) => p.id === pregnancy.patientId);
  if (!patient) return null;

  const ageMs = Date.now() - new Date(patient.dateOfBirth).getTime();
  const ageyrs = Math.floor(ageMs / 31_557_600_000);

  // Map visit.labStatus → LabStatus
  const statusMap: Record<string, LabStatus> = {
    pending: "Pending",
    in_progress: "In Progress",
    completed: "Completed",
  };

  // Map visit.type → visitType display label
  const visitTypeMap: Record<string, LabRequest["visitType"]> = {
    scheduled: "Scheduled ANC",
    unscheduled: "Unscheduled ANC",
    emergency: "Emergency Visit",
  };

  // Count previous visits for same pregnancy
  const allVisits = getVisitsSnapshot();
  const visitNumber =
    allVisits
      .filter((v) => v.pregnancyId === visit.pregnancyId)
      .sort((a, b) => a.date.localeCompare(b.date))
      .findIndex((v) => v.id === visit.id) + 1;

  return {
    id: visit.id,
    patientId: patient.nationalId || patient.id,
    patientName: `${patient.firstName} ${patient.lastName}`,
    patientAge: ageyrs,
    pregnancyNumber: pregnancy.pregnancyNumber,
    visitNumber: visit.ancNumber ?? visitNumber,
    gestationalAge: visit.scheduledWeek ? `${visit.scheduledWeek} weeks` : "-",
    requestDate: visit.date,
    requestingNurseId: visit.attendingNurse,
    visitType: visitTypeMap[visit.type] ?? "Scheduled ANC",
    priority: visit.type === "emergency" ? "Emergency" : "Normal",
    status: statusMap[visit.labStatus] ?? "Pending",
    facility: visit.hospital,
    requestedInvestigatonNames: [
      "Hemoglobin (Hb)",
      "Complete Blood Count (CBC)",
      "Blood Glucose",
      "Urine Analysis",
    ],
    clinicalNotes: visit.notes,
    allergies: patient.allergies ?? "None",
    results: visit.labResults ?? [],
    acceptedBy: visit.acceptedByLabNurse,
    acceptedAt: visit.labAcceptedAt,
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Returns all lab requests (derived from visits) for a given facility.
 * This is the same data store the ANC nurse writes to.
 */
export function getLabRequests(facility: string): LabRequest[] {
  const visits = getVisitsSnapshot();
  return visits
    .filter((v) => v.hospital === facility && !!v.labStatus)
    .map(visitToLabRequest)
    .filter((r): r is LabRequest => r !== null)
    .sort(
      (a, b) =>
        new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime()
    );
}

/**
 * Returns a single lab request by its visit ID.
 */
export function getLabRequestById(id: string): LabRequest | undefined {
  const visits = getVisitsSnapshot();
  const visit = visits.find((v) => v.id === id && !!v.labStatus);
  if (!visit) return undefined;
  return visitToLabRequest(visit) ?? undefined;
}

/**
 * Subscribe to changes in the visits store so lab pages can react.
 * This is just an alias for subscribeToVisits.
 */
export { subscribeToVisits as subscribeToLabRequests };

/**
 * Called by the ANC nurse's recordVisit when labStatus = "pending".
 * Since the visit is already in the storage, we don't need to do anything
 * extra — getLabRequests() will derive it automatically.
 * Kept for backwards compatibility.
 */
export function pushNewLabRequest(visit: Visit, patient: Patient, pregnancy: Pregnancy) {
  // No-op: the visit is already in localStorage via storage.ts.
  // getLabRequests() will pick it up automatically.
  void visit;
  void patient;
  void pregnancy;
}

/**
 * Lab nurse accepts a request → mark as "in_progress" and record who/when
 * directly on the visit, so acceptance survives a page refresh.
 */
export function acceptLabRequest(id: string, labNurseId: string) {
  const visits = getVisitsSnapshot();
  const visit = visits.find((v) => v.id === id);
  if (visit && visit.labStatus === "pending") {
    storageUpdateVisit(id, {
      labStatus: "in_progress",
      acceptedByLabNurse: labNurseId,
      labAcceptedAt: new Date().toISOString(),
    });
  }
}

/**
 * Lab nurse submits results → persist results directly on the visit, mark
 * "completed", and update the visit with derived lab values and critical flag.
 */
export function submitLabResults(id: string, results: LabTestResult[]) {
  const visits = getVisitsSnapshot();
  const visit = visits.find((v) => v.id === id);
  if (visit && visit.labStatus === "in_progress") {
    const visitLabs: Partial<VisitLabs> = {};
    let hasCriticalLabResults = false;

    results.forEach((r) => {
      if (r.testName.includes("Hemoglobin"))
        visitLabs.hemoglobin = parseFloat(r.result) || 12;
      if (r.testName.includes("Platelet"))
        visitLabs.platelets = parseFloat(r.result) || 150;
      if (r.testName.includes("Glucose") || r.testName.includes("Blood Sugar"))
        visitLabs.bloodSugar = parseFloat(r.result) || 90;
      if (r.interpretation === "Critical") hasCriticalLabResults = true;
    });

    storageUpdateVisit(id, {
      labStatus: "completed",
      labs: visitLabs,
      labResults: results,
      hasCriticalLabResults,
    });
  }
}
