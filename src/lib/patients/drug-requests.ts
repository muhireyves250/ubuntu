"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { getStoredAccessToken } from "@/lib/auth/auth-context";
import { queryClient } from "@/lib/query-client";

export type DrugRequestStatus = "Pending" | "In Progress" | "Dispensed";

export interface DrugRequestItem {
  id: string;
  drugName: string;
  perDose?: string;
  unit?: string;
  frequency?: string;
  durationDays?: number;
  quantity?: number;
  dispensedQuantity?: number;
  patientInstructions?: string;
  forPartner: boolean;
  inventoryItemId?: string;
  /** Current stock of the linked inventory item; undefined when not in the catalog. */
  stockOnHand?: number;
  stockUnit?: string;
}

export interface DrugRequest {
  id: string;
  status: DrugRequestStatus;
  patientId: string;
  patientRecordId: string;
  patientName: string;
  patientPhone: string;
  patientAge: number;
  gestationalWeek?: number;
  ancNumber?: number;
  visitId: string;
  requestedBy: string;
  requestDate: string;
  acceptedAt?: string;
  dispensedAt?: string;
  dispensedBy?: string;
  notes?: string;
  facility: string;
  items: DrugRequestItem[];
}

interface BackendDrugRequest {
  id: string;
  status: "PENDING" | "IN_PROGRESS" | "DISPENSED";
  notes: string | null;
  acceptedAt: string | null;
  dispensedAt: string | null;
  createdAt: string;
  visit: {
    id: string;
    gestationalWeek: number | null;
    ancNumber: number | null;
    pregnancy: {
      patient: {
        id: string;
        firstName: string;
        lastName: string;
        nationalId: string;
        dateOfBirth: string;
        phone: string;
      };
    };
  };
  requestedBy: { firstName: string; lastName: string };
  assignedTo: { firstName: string; lastName: string } | null;
  facility: { name: string };
  prescriptions: {
    id: string;
    drugName: string;
    perDose: string | null;
    unit: string | null;
    frequency: string | null;
    durationDays: number | null;
    quantity: number | null;
    dispensedQuantity: number | null;
    patientInstructions: string | null;
    forPartner: boolean;
    inventoryItemId: string | null;
    inventoryItem: { unit: string; quantityOnHand: number } | null;
  }[];
}

const STATUS_TO_FRONTEND: Record<BackendDrugRequest["status"], DrugRequestStatus> = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  DISPENSED: "Dispensed",
};

function computeAge(dateOfBirth: string): number {
  return Math.floor((Date.now() - new Date(dateOfBirth).getTime()) / 31_557_600_000);
}

function toFrontendDrugRequest(r: BackendDrugRequest): DrugRequest {
  const { patient } = r.visit.pregnancy;
  return {
    id: r.id,
    status: STATUS_TO_FRONTEND[r.status],
    patientId: patient.nationalId,
    patientRecordId: patient.id,
    patientName: `${patient.firstName} ${patient.lastName}`,
    patientPhone: patient.phone,
    patientAge: computeAge(patient.dateOfBirth),
    gestationalWeek: r.visit.gestationalWeek ?? undefined,
    ancNumber: r.visit.ancNumber ?? undefined,
    visitId: r.visit.id,
    requestedBy: `${r.requestedBy.firstName} ${r.requestedBy.lastName}`,
    requestDate: r.createdAt,
    acceptedAt: r.acceptedAt ?? undefined,
    dispensedAt: r.dispensedAt ?? undefined,
    dispensedBy: r.assignedTo ? `${r.assignedTo.firstName} ${r.assignedTo.lastName}` : undefined,
    notes: r.notes ?? undefined,
    facility: r.facility.name,
    items: r.prescriptions.map((p) => ({
      id: p.id,
      drugName: p.drugName,
      perDose: p.perDose ?? undefined,
      unit: p.unit ?? undefined,
      frequency: p.frequency ?? undefined,
      durationDays: p.durationDays ?? undefined,
      quantity: p.quantity ?? undefined,
      dispensedQuantity: p.dispensedQuantity ?? undefined,
      patientInstructions: p.patientInstructions ?? undefined,
      forPartner: p.forPartner,
      inventoryItemId: p.inventoryItemId ?? undefined,
      stockOnHand: p.inventoryItem?.quantityOnHand,
      stockUnit: p.inventoryItem?.unit,
    })),
  };
}

async function fetchDrugRequests(): Promise<DrugRequest[]> {
  const token = getStoredAccessToken();
  const list = await apiFetch<BackendDrugRequest[]>("/drug-requests", { token: token ?? undefined });
  return list.map(toFrontendDrugRequest);
}

async function fetchDrugRequest(id: string): Promise<DrugRequest> {
  const token = getStoredAccessToken();
  return toFrontendDrugRequest(
    await apiFetch<BackendDrugRequest>(`/drug-requests/${id}`, { token: token ?? undefined }),
  );
}

/** Counter lookup: the patient gives their ID or phone at the pharmacy. */
export function matchesPatientSearch(r: DrugRequest, filter: string): boolean {
  const q = filter.trim().toLowerCase();
  return (
    r.patientId.toLowerCase().includes(q) ||
    r.patientPhone.toLowerCase().includes(q) ||
    r.patientName.toLowerCase().includes(q) ||
    r.id.toLowerCase().includes(q)
  );
}

export function useDrugRequests(): DrugRequest[] {
  const { data } = useQuery({ queryKey: ["drug-requests"], queryFn: fetchDrugRequests });
  return data ?? [];
}

// Like useLabRequest(): undefined both while loading and when not found, so
// pair with the isLoading flag before rendering a not-found state.
export function useDrugRequest(id: string): { request: DrugRequest | undefined; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ["drug-requests", id],
    queryFn: () => fetchDrugRequest(id),
    enabled: !!id,
  });
  return { request: data, isLoading };
}

async function invalidate(id: string) {
  await queryClient.invalidateQueries({ queryKey: ["drug-requests"] });
  await queryClient.invalidateQueries({ queryKey: ["drug-requests", id] });
  // Dispensing moves stock.
  await queryClient.invalidateQueries({ queryKey: ["inventory"] });
}

export async function acceptDrugRequest(id: string): Promise<void> {
  const token = getStoredAccessToken();
  await apiFetch(`/drug-requests/${id}/accept`, { method: "PATCH", token: token ?? undefined });
  await invalidate(id);
}

export async function dispenseDrugRequest(
  id: string,
  items: { prescriptionId: string; dispensedQuantity: number }[],
  notes?: string,
): Promise<void> {
  const token = getStoredAccessToken();
  await apiFetch(`/drug-requests/${id}/dispense`, {
    method: "PATCH",
    body: { items, notes },
    token: token ?? undefined,
  });
  await invalidate(id);
}
