"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { getStoredAccessToken } from "@/lib/auth/auth-context";

// The director's Reports page tabs, computed by the API for their facility
// (GET /reports/*?days=); the browser only renders them.
export const REPORTS_KEY = "reports";

export interface MaternalCareReportData {
  ancVisits: number;
  highRiskPregnancies: number;
  emergencyPregnancies: number;
  deliveries: number;
  outcomes: { liveBirth: number; stillbirth: number; maternalDeath: number };
  methods: { vaginal: number; cesarean: number; assisted: number };
  neonatal: { alive: number; deceased: number };
}

export interface ReferralReportData {
  incoming: number;
  outgoing: number;
  accepted: number;
  emergency: number;
  averageHoursToAccept: number | null;
}

export interface LaboratoryReportData {
  requests: number;
  completed: number;
  pending: number;
  critical: number;
  averageHoursToAccept: number | null;
}

export interface WorkloadRow {
  name: string;
  count: number;
}

export interface StaffPerformanceReportData {
  ancNurses: WorkloadRow[];
  labNurses: WorkloadRow[];
  emergencyAcceptances: WorkloadRow[];
  recommendations: WorkloadRow[];
}

function useReport<T>(path: string, days: number | undefined) {
  const { data } = useQuery({
    queryKey: [REPORTS_KEY, path, days ?? "all"],
    queryFn: () =>
      apiFetch<T>(`/reports/${path}${days != null ? `?days=${days}` : ""}`, {
        token: getStoredAccessToken() ?? undefined,
      }),
    // Keep the last figures on screen while another window loads.
    placeholderData: keepPreviousData,
  });
  return data;
}

export const useMaternalCareReport = (days?: number) => useReport<MaternalCareReportData>("maternal-care", days);
export const useReferralReport = (days?: number) => useReport<ReferralReportData>("referral-activity", days);
export const useLaboratoryReport = (days?: number) => useReport<LaboratoryReportData>("laboratory", days);
export const useStaffPerformanceReport = (days?: number) =>
  useReport<StaffPerformanceReportData>("staff-performance", days);

/** "3.4h", or "—" when nothing has been accepted. */
export const formatHours = (hours: number | null | undefined) => (hours == null ? "—" : `${hours.toFixed(1)}h`);
