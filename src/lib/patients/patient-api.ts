import { apiFetch } from "@/lib/api/client";
import { getStoredAccessToken } from "@/lib/auth/auth-context";
import type { Patient } from "./types";

interface BackendPatient {
  id: string;
  nationalId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phone: string;
  altPhone: string | null;
  district: string;
  sector: string;
  cell: string;
  village: string;
  isibo: string;
  maritalStatus: string | null;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string;
  bloodGroup: string | null;
  rhFactor: string | null;
  allergies: string | null;
  chronicConditions: string[];
  createdAt: string;
  registeredBy: { id: string; firstName: string; lastName: string } | null;
  facility: { id: string; name: string } | null;
}

function toFrontendPatient(p: BackendPatient): Patient {
  return {
    id: p.id,
    nationalId: p.nationalId,
    firstName: p.firstName,
    lastName: p.lastName,
    dateOfBirth: p.dateOfBirth.slice(0, 10),
    phone: p.phone,
    altPhone: p.altPhone ?? undefined,
    maritalStatus: p.maritalStatus ?? undefined,
    address: { district: p.district, sector: p.sector, cell: p.cell, village: p.village, isibo: p.isibo },
    emergencyContact: {
      name: p.emergencyContactName,
      relationship: p.emergencyContactRelationship,
      phone: p.emergencyContactPhone,
    },
    bloodGroup: p.bloodGroup ?? undefined,
    rhFactor: p.rhFactor === "positive" || p.rhFactor === "negative" ? p.rhFactor : undefined,
    allergies: p.allergies ?? undefined,
    chronicConditions: p.chronicConditions.length > 0 ? p.chronicConditions : undefined,
    registeredAt: p.createdAt.slice(0, 10),
    registeredBy: p.registeredBy ? `${p.registeredBy.firstName} ${p.registeredBy.lastName}` : "",
    registrationFacility: p.facility?.name ?? "",
  };
}

function toBackendCreatePayload(data: Omit<Patient, "id" | "registeredAt" | "registeredBy" | "registrationFacility">) {
  return {
    nationalId: data.nationalId,
    firstName: data.firstName,
    lastName: data.lastName,
    dateOfBirth: data.dateOfBirth,
    phone: data.phone,
    altPhone: data.altPhone,
    district: data.address.district,
    sector: data.address.sector,
    cell: data.address.cell,
    village: data.address.village,
    isibo: data.address.isibo,
    maritalStatus: data.maritalStatus,
    emergencyContactName: data.emergencyContact.name,
    emergencyContactRelationship: data.emergencyContact.relationship,
    emergencyContactPhone: data.emergencyContact.phone,
    bloodGroup: data.bloodGroup,
    rhFactor: data.rhFactor,
    allergies: data.allergies,
    chronicConditions: data.chronicConditions,
  };
}

// Large page size — no pagination UI exists yet, this approximates "fetch all"
// for the current small seed dataset. Revisit if the patient count grows past
// this limit.
export async function fetchPatients(): Promise<Patient[]> {
  const token = getStoredAccessToken();
  const result = await apiFetch<{ data: BackendPatient[]; meta: unknown }>(
    "/patients?limit=200",
    { token: token ?? undefined },
  );
  return result.data.map(toFrontendPatient);
}

export async function fetchPatient(id: string): Promise<Patient> {
  const token = getStoredAccessToken();
  const p = await apiFetch<BackendPatient>(`/patients/${id}`, { token: token ?? undefined });
  return toFrontendPatient(p);
}

export async function createPatientApi(
  data: Omit<Patient, "id" | "registeredAt" | "registeredBy" | "registrationFacility">,
): Promise<Patient> {
  const token = getStoredAccessToken();
  const p = await apiFetch<BackendPatient>("/patients", {
    method: "POST",
    body: toBackendCreatePayload(data),
    token: token ?? undefined,
  });
  return toFrontendPatient(p);
}

export async function updatePatientApi(
  patientId: string,
  updates: Partial<Omit<Patient, "id" | "registeredAt" | "registeredBy" | "registrationFacility">>,
): Promise<Patient> {
  const token = getStoredAccessToken();
  const body: Record<string, unknown> = { ...updates };
  if (updates.address) {
    body.district = updates.address.district;
    body.sector = updates.address.sector;
    body.cell = updates.address.cell;
    body.village = updates.address.village;
    delete body.address;
  }
  if (updates.emergencyContact) {
    body.emergencyContactName = updates.emergencyContact.name;
    body.emergencyContactRelationship = updates.emergencyContact.relationship;
    body.emergencyContactPhone = updates.emergencyContact.phone;
    delete body.emergencyContact;
  }
  const p = await apiFetch<BackendPatient>(`/patients/${patientId}`, {
    method: "PATCH",
    body,
    token: token ?? undefined,
  });
  return toFrontendPatient(p);
}
