import { apiFetch } from "@/lib/api/client";
import { getStoredAccessToken } from "@/lib/auth/auth-context";
import type { ScreeningResult } from "./types";

export interface Partner {
  id: string;
  patientId: string;
  name: string;
  phone?: string;
  nationalId?: string;
  hivTestResult?: ScreeningResult;
}

export interface PartnerLabTest {
  id: string;
  partnerId: string;
  pregnancyId: string;
  testName: string;
  dateTaken: string;
  resultValue?: string;
  interpretation?: string;
  notes?: string;
  recordedByName: string;
}

interface BackendPartner {
  id: string;
  patientId: string;
  name: string;
  phone: string | null;
  nationalId: string | null;
  hivTestResult: "NEGATIVE" | "POSITIVE" | "UNKNOWN" | null;
}

interface BackendPartnerLabTest {
  id: string;
  partnerId: string;
  pregnancyId: string;
  testName: string;
  dateTaken: string;
  resultValue: string | null;
  interpretation: string | null;
  notes: string | null;
  recordedBy: { id: string; firstName: string; lastName: string };
}

const SCREENING_RESULT_TO_FRONTEND: Record<string, ScreeningResult> = {
  NEGATIVE: "negative",
  POSITIVE: "positive",
  UNKNOWN: "unknown",
};
const SCREENING_RESULT_TO_BACKEND: Record<ScreeningResult, "NEGATIVE" | "POSITIVE" | "UNKNOWN"> = {
  negative: "NEGATIVE",
  positive: "POSITIVE",
  unknown: "UNKNOWN",
};

function toFrontendPartner(p: BackendPartner): Partner {
  return {
    id: p.id,
    patientId: p.patientId,
    name: p.name,
    phone: p.phone ?? undefined,
    nationalId: p.nationalId ?? undefined,
    hivTestResult: p.hivTestResult ? SCREENING_RESULT_TO_FRONTEND[p.hivTestResult] : undefined,
  };
}

function toFrontendLabTest(t: BackendPartnerLabTest): PartnerLabTest {
  return {
    id: t.id,
    partnerId: t.partnerId,
    pregnancyId: t.pregnancyId,
    testName: t.testName,
    dateTaken: t.dateTaken.slice(0, 10),
    resultValue: t.resultValue ?? undefined,
    interpretation: t.interpretation ?? undefined,
    notes: t.notes ?? undefined,
    recordedByName: `${t.recordedBy.firstName} ${t.recordedBy.lastName}`,
  };
}

export async function fetchPartnerForPatient(patientId: string): Promise<Partner | null> {
  const token = getStoredAccessToken();
  const partner = await apiFetch<BackendPartner | null>(`/partners/patient/${patientId}`, {
    token: token ?? undefined,
  });
  return partner ? toFrontendPartner(partner) : null;
}

export async function upsertPartnerApi(data: {
  patientId: string;
  name: string;
  phone?: string;
  nationalId?: string;
  hivTestResult?: ScreeningResult;
}): Promise<Partner> {
  const token = getStoredAccessToken();
  const p = await apiFetch<BackendPartner>("/partners", {
    method: "POST",
    body: {
      ...data,
      hivTestResult: data.hivTestResult ? SCREENING_RESULT_TO_BACKEND[data.hivTestResult] : undefined,
    },
    token: token ?? undefined,
  });
  return toFrontendPartner(p);
}

export async function fetchPartnerLabTests(partnerId: string, pregnancyId: string): Promise<PartnerLabTest[]> {
  const token = getStoredAccessToken();
  const tests = await apiFetch<BackendPartnerLabTest[]>(`/partners/${partnerId}/lab-tests/${pregnancyId}`, {
    token: token ?? undefined,
  });
  return tests.map(toFrontendLabTest);
}

export async function addPartnerLabTestApi(
  partnerId: string,
  data: {
    pregnancyId: string;
    testName: string;
    dateTaken?: string;
    resultValue?: string;
    interpretation?: string;
    notes?: string;
  },
): Promise<PartnerLabTest> {
  const token = getStoredAccessToken();
  const t = await apiFetch<BackendPartnerLabTest>(`/partners/${partnerId}/lab-tests`, {
    method: "POST",
    body: data,
    token: token ?? undefined,
  });
  return toFrontendLabTest(t);
}
