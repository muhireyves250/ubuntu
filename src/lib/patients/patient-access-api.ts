"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { getStoredAccessToken } from "@/lib/auth/auth-context";

// What the signed-in user's facility may do with a patient's record, decided
// by the API (the same rule it applies to every change):
// - full: work on the record normally
// - view_only: follow it, change nothing (directors; a referring facility
//   once another facility has accepted the emergency)
// - locked: being assessed at another facility
// - referral_preview: an active emergency referral this facility isn't
//   managing — only the referral preview (and accept) is shown
export interface PatientAccess {
  mode: "full" | "view_only" | "locked" | "referral_preview";
  reason?: "assessed_elsewhere" | "active_referral" | "managed_elsewhere" | "administrator";
  facilityName?: string;
  activeReferralId?: string;
}

async function fetchPatientAccess(patientId: string): Promise<PatientAccess> {
  return apiFetch<PatientAccess>(`/patients/${patientId}/access`, { token: getStoredAccessToken() ?? undefined });
}

export function usePatientAccess(patientId: string): { access: PatientAccess | undefined; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ["patient-access", patientId],
    queryFn: () => fetchPatientAccess(patientId),
    enabled: !!patientId,
  });
  return { access: data, isLoading };
}
