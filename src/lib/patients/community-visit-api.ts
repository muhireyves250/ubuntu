import { apiFetch } from "@/lib/api/client";
import { getStoredAccessToken } from "@/lib/auth/auth-context";
import type { CommunityVisit } from "./types";

interface BackendCommunityVisit {
  id: string;
  pregnancyId: string;
  visitDate: string;
  notes: string | null;
  systolic: number | null;
  diastolic: number | null;
  babyWeight: number | null;
  feedingStatus: string | null;
  concerns: string | null;
  riskFlag: boolean;
  riskReasons: string[];
  nurseFlaggedEmergency: boolean;
  chw: { id: string; firstName: string; lastName: string; phone: string | null };
  pregnancy: {
    patient: { id: string; firstName: string; lastName: string; nationalId: string; phone: string | null };
  };
}

function toFrontendCommunityVisit(v: BackendCommunityVisit): CommunityVisit {
  const { patient } = v.pregnancy;
  return {
    id: v.id,
    pregnancyId: v.pregnancyId,
    patientId: patient.id,
    patientName: `${patient.firstName} ${patient.lastName}`,
    chwId: v.chw.id,
    chwName: `${v.chw.firstName} ${v.chw.lastName}`,
    visitDate: v.visitDate,
    notes: v.notes ?? "",
    systolic: v.systolic ?? undefined,
    diastolic: v.diastolic ?? undefined,
    babyWeight: v.babyWeight ?? undefined,
    feedingStatus: v.feedingStatus ?? undefined,
    concerns: v.concerns ?? undefined,
    riskFlag: v.riskFlag,
    riskReasons: v.riskReasons,
    nurseFlaggedEmergency: v.nurseFlaggedEmergency,
  };
}

export async function fetchCommunityVisitsForPregnancy(pregnancyId: string): Promise<CommunityVisit[]> {
  const token = getStoredAccessToken();
  const visits = await apiFetch<BackendCommunityVisit[]>(
    `/community-visits/pregnancy/${pregnancyId}`,
    { token: token ?? undefined },
  );
  return visits.map(toFrontendCommunityVisit);
}

export async function fetchMyCommunityVisits(): Promise<CommunityVisit[]> {
  const token = getStoredAccessToken();
  const visits = await apiFetch<BackendCommunityVisit[]>(
    "/community-visits/my-visits",
    { token: token ?? undefined },
  );
  return visits.map(toFrontendCommunityVisit);
}

export async function submitCommunityVisitApi(data: {
  pregnancyId: string;
  visitDate?: string;
  notes?: string;
  systolic?: number;
  diastolic?: number;
  babyWeight?: number;
  feedingStatus?: string;
  concerns?: string;
}): Promise<CommunityVisit> {
  const token = getStoredAccessToken();
  const v = await apiFetch<BackendCommunityVisit>("/community-visits", {
    method: "POST",
    body: data,
    token: token ?? undefined,
  });
  return toFrontendCommunityVisit(v);
}

export async function flagCommunityVisitEmergencyApi(id: string): Promise<CommunityVisit> {
  const token = getStoredAccessToken();
  const v = await apiFetch<BackendCommunityVisit>(`/community-visits/${id}/flag-emergency`, {
    method: "PATCH",
    token: token ?? undefined,
  });
  return toFrontendCommunityVisit(v);
}
