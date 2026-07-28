import { apiFetch } from "@/lib/api/client";
import { getStoredAccessToken } from "@/lib/auth/auth-context";
import type { Referral, ReferralOutcome } from "./types";

export interface BackendFacility {
  id: string;
  name: string;
  type: string;
  district: string;
  capacity: number | null;
}

interface BackendReferral {
  id: string;
  pregnancyId: string;
  reason: string;
  urgency: "ROUTINE" | "URGENT" | "EMERGENCY";
  status: "PENDING" | "ACCEPTED" | "CLOSED";
  outcome: string | null;
  outcomeStatement: string | null;
  acceptedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  sentBy: { id: string; firstName: string; lastName: string };
  receivedBy: { id: string; firstName: string; lastName: string } | null;
  fromFacility: { id: string; name: string; district: string };
  toFacility: { id: string; name: string; district: string };
  pregnancy: {
    patient: { id: string; firstName: string; lastName: string; nationalId: string };
  };
}

const URGENCY_TO_BACKEND: Record<Referral["urgency"], "ROUTINE" | "URGENT" | "EMERGENCY"> = {
  routine: "ROUTINE",
  urgent: "URGENT",
  emergency: "EMERGENCY",
};
const URGENCY_TO_FRONTEND: Record<string, Referral["urgency"]> = {
  ROUTINE: "routine",
  URGENT: "urgent",
  EMERGENCY: "emergency",
};

const STATUS_TO_FRONTEND: Record<string, Referral["status"]> = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  CLOSED: "closed",
};

const OUTCOME_TO_BACKEND: Record<ReferralOutcome, string> = {
  stable: "STABLE",
  improved: "IMPROVED",
  recovered: "RECOVERED",
  admitted: "ADMITTED",
  delivered: "DELIVERED",
  referred: "REFERRED",
  discharged: "DISCHARGED",
  maternal_death: "MATERNAL_DEATH",
  fetal_death: "FETAL_DEATH",
};
const OUTCOME_TO_FRONTEND: Record<string, ReferralOutcome> = {
  STABLE: "stable",
  IMPROVED: "improved",
  RECOVERED: "recovered",
  ADMITTED: "admitted",
  DELIVERED: "delivered",
  REFERRED: "referred",
  DISCHARGED: "discharged",
  MATERNAL_DEATH: "maternal_death",
  FETAL_DEATH: "fetal_death",
};

function toFrontendReferral(r: BackendReferral): Referral {
  return {
    id: r.id,
    patientId: r.pregnancy.patient.id,
    createdAt: r.createdAt,
    status: STATUS_TO_FRONTEND[r.status] ?? "pending",
    receivingFacility: r.toFacility.name,
    reason: r.reason,
    urgency: URGENCY_TO_FRONTEND[r.urgency] ?? "routine",
    referredByNurse: `${r.sentBy.firstName} ${r.sentBy.lastName}`,
    referredByNurseId: r.sentBy.id,
    referredByFacility: r.fromFacility.name,
    acceptedAt: r.acceptedAt ?? undefined,
    acceptedByNurse: r.receivedBy ? `${r.receivedBy.firstName} ${r.receivedBy.lastName}` : undefined,
    acceptedByNurseId: r.receivedBy ? r.receivedBy.id : undefined,
    acceptedByFacility: r.status !== "PENDING" ? r.toFacility.name : undefined,
    closedAt: r.closedAt ?? undefined,
    outcome: r.outcome ? OUTCOME_TO_FRONTEND[r.outcome] : undefined,
    outcomeStatement: r.outcomeStatement ?? undefined,
  };
}

export async function fetchReferrals(): Promise<Referral[]> {
  const token = getStoredAccessToken();
  const result = await apiFetch<{ data: BackendReferral[]; meta: unknown }>(
    "/referrals?limit=100",
    { token: token ?? undefined },
  );
  return result.data.map(toFrontendReferral);
}

export async function fetchFacilities(): Promise<BackendFacility[]> {
  const token = getStoredAccessToken();
  return apiFetch<BackendFacility[]>("/facilities", { token: token ?? undefined });
}

export async function updateFacilityCapacityApi(capacity: number): Promise<BackendFacility> {
  const token = getStoredAccessToken();
  return apiFetch<BackendFacility>("/facilities/capacity", {
    method: "PATCH",
    body: { capacity },
    token: token ?? undefined,
  });
}

export async function createReferralApi(
  pregnancyId: string,
  toFacilityName: string,
  reason: string,
  urgency: Referral["urgency"],
): Promise<Referral> {
  const token = getStoredAccessToken();
  const facilities = await fetchFacilities();
  const toFacility = facilities.find((f) => f.name === toFacilityName);
  if (!toFacility) {
    throw new Error(`Unknown receiving facility: ${toFacilityName}`);
  }
  const r = await apiFetch<BackendReferral>("/referrals", {
    method: "POST",
    body: {
      pregnancyId,
      toFacilityId: toFacility.id,
      reason,
      urgency: URGENCY_TO_BACKEND[urgency],
    },
    token: token ?? undefined,
  });
  return toFrontendReferral(r);
}

export async function acceptReferralApi(id: string): Promise<Referral> {
  const token = getStoredAccessToken();
  const r = await apiFetch<BackendReferral>(`/referrals/${id}/accept`, {
    method: "PATCH",
    token: token ?? undefined,
  });
  return toFrontendReferral(r);
}

export async function closeReferralApi(
  id: string,
  outcome: ReferralOutcome,
  outcomeStatement: string,
  riskLevel: "green" | "yellow" | "orange" | "red",
): Promise<Referral> {
  const token = getStoredAccessToken();
  const RISK_TO_BACKEND: Record<string, string> = {
    green: "GREEN",
    yellow: "YELLOW",
    orange: "ORANGE",
    red: "RED",
  };
  const r = await apiFetch<BackendReferral>(`/referrals/${id}/close`, {
    method: "PATCH",
    body: {
      outcome: OUTCOME_TO_BACKEND[outcome],
      outcomeStatement,
      riskLevel: RISK_TO_BACKEND[riskLevel],
    },
    token: token ?? undefined,
  });
  return toFrontendReferral(r);
}