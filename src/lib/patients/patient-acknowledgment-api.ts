import { apiFetch } from "@/lib/api/client";
import { getStoredAccessToken } from "@/lib/auth/auth-context";
import type { AcknowledgedAlert } from "./alerts-storage";

interface BackendPatientAcknowledgment {
  id: string;
  patientId: string;
  createdAt: string;
  note: string | null;
}

function toFrontendAcknowledgment(a: BackendPatientAcknowledgment): AcknowledgedAlert {
  return {
    patientId: a.patientId,
    acknowledgedAt: a.createdAt,
    note: a.note ?? "",
  };
}

export async function fetchAcknowledgments(): Promise<AcknowledgedAlert[]> {
  const token = getStoredAccessToken();
  const acknowledgments = await apiFetch<BackendPatientAcknowledgment[]>("/patient-acknowledgments", {
    token: token ?? undefined,
  });
  return acknowledgments.map(toFrontendAcknowledgment);
}

export async function acknowledgePatientApi(patientId: string, note: string): Promise<AcknowledgedAlert> {
  const token = getStoredAccessToken();
  const a = await apiFetch<BackendPatientAcknowledgment>("/patient-acknowledgments", {
    method: "POST",
    body: { patientId, note: note.trim() ? note : undefined },
    token: token ?? undefined,
  });
  return toFrontendAcknowledgment(a);
}