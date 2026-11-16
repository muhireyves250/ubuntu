import { apiFetch } from "@/lib/api/client";
import { getStoredAccessToken } from "@/lib/auth/auth-context";
import { toFrontendPatient, type BackendPatient } from "./patient-api";
import { toFrontendVisit, type BackendVisit } from "./visit-api";
import { toFrontendReferral, type BackendReferral } from "./referral-api";
import type { Patient, Referral, RiskLevel, Visit } from "./types";

// Dashboard work lists and counters, built by the API (GET /worklists/*);
// the browser only renders them.
export const WORKLISTS_KEY = "worklists";

export interface FollowUpPatient {
  patient: Patient;
  latestRiskLevel: RiskLevel;
  reason: "high-risk" | "overdue";
}

export interface TodaysVisit {
  kind: "logged" | "due";
  visit?: Visit;
  patient: Patient | undefined;
  dueWeek?: number;
}

export type VisitsWorklistPeriod = "today" | "week" | "month" | "year";

export interface RiskSummary {
  totalPatients: number;
  totalVisits: number;
  counts: Record<RiskLevel, number>;
  highRiskRate: number; // percentage of patients currently red or orange
}

export type RiskSummaryScope = "all" | "active_pregnancy";

export interface ActiveReferral extends Referral {
  patient: Patient | undefined;
  gestationalAgeWeeks: number | null;
}

export interface ReferralCounts {
  pending: number;
  accepted: number;
  closed: number;
}

export interface ChwPatientDue {
  patient: Patient;
  nextDueDate: string | null;
  source: "automatic" | "manual" | null;
  allHomeVisitsDone: boolean;
}

const get = <T>(path: string) => apiFetch<T>(path, { token: getStoredAccessToken() ?? undefined });
const maybePatient = (p: BackendPatient | undefined) => (p ? toFrontendPatient(p) : undefined);

export async function fetchFollowUps(): Promise<FollowUpPatient[]> {
  const rows = await get<{ patient: BackendPatient; latestRiskLevel: RiskLevel; reason: FollowUpPatient["reason"] }[]>(
    "/worklists/follow-ups",
  );
  return rows.map((r) => ({ ...r, patient: toFrontendPatient(r.patient) }));
}

export async function fetchAncVisits(period: VisitsWorklistPeriod): Promise<TodaysVisit[]> {
  const rows = await get<{ kind: TodaysVisit["kind"]; visit?: BackendVisit; patient?: BackendPatient; dueWeek?: number }[]>(
    `/worklists/anc-visits?period=${period}`,
  );
  return rows.map((r) => ({
    kind: r.kind,
    visit: r.visit ? toFrontendVisit(r.visit) : undefined,
    patient: maybePatient(r.patient),
    dueWeek: r.dueWeek,
  }));
}

export function fetchRiskSummary(days: number | undefined, scope: RiskSummaryScope): Promise<RiskSummary> {
  const params = new URLSearchParams({ scope });
  if (days != null) params.set("days", String(days));
  return get<RiskSummary>(`/worklists/risk-summary?${params}`);
}

export async function fetchActiveReferrals(): Promise<ActiveReferral[]> {
  const rows = await get<(BackendReferral & { patient?: BackendPatient; gestationalAgeWeeks: number | null })[]>(
    "/worklists/active-referrals",
  );
  return rows.map((r) => ({
    ...toFrontendReferral(r),
    patient: maybePatient(r.patient),
    gestationalAgeWeeks: r.gestationalAgeWeeks,
  }));
}

export function fetchReferralCounts(): Promise<ReferralCounts> {
  return get<ReferralCounts>("/worklists/referral-counts");
}

export async function fetchChwPatients(): Promise<ChwPatientDue[]> {
  const rows = await get<(Omit<ChwPatientDue, "patient"> & { patient: BackendPatient })[]>("/worklists/chw-patients");
  return rows.map((r) => ({ ...r, patient: toFrontendPatient(r.patient) }));
}

export interface EmergencyCase {
  referral: Referral;
  patient: Patient;
  gaWeeks: number | null;
  /** The patient's latest visit recorded at this hospital, if any. */
  latestVisit: Visit | undefined;
}

// Pending emergency referrals this hospital can accept, already ranked.
export async function fetchEmergencyQueue(): Promise<EmergencyCase[]> {
  const rows = await get<
    (BackendReferral & { patient: BackendPatient; gestationalAgeWeeks: number | null; latestVisit: BackendVisit | null })[]
  >("/worklists/emergency-queue");
  return rows.map((r) => ({
    referral: toFrontendReferral(r),
    patient: toFrontendPatient(r.patient),
    gaWeeks: r.gestationalAgeWeeks,
    latestVisit: r.latestVisit ? toFrontendVisit(r.latestVisit) : undefined,
  }));
}

export interface PatientRegistryRow {
  patient: Patient;
  latestRisk: RiskLevel;
  /** Last visit recorded at this facility. */
  lastVisitDate: string | undefined;
  hospital: string | undefined;
  gaWeeks: number | null;
}

// The patient registry rows (GET /worklists/patient-registry).
export async function fetchPatientRegistry(): Promise<PatientRegistryRow[]> {
  const rows = await get<
    { patient: BackendPatient; lastVisitDate: string | null; hospital: string | null; gestationalAgeWeeks: number | null }[]
  >("/worklists/patient-registry");
  return rows.map((r) => {
    const patient = toFrontendPatient(r.patient);
    return {
      patient,
      latestRisk: patient.currentRisk,
      lastVisitDate: r.lastVisitDate ?? undefined,
      hospital: r.hospital ?? undefined,
      gaWeeks: r.gestationalAgeWeeks,
    };
  });
}

export interface LabSummary {
  pending: number;
  inProgress: number;
  completed: number;
  emergencies: number;
  critical: number;
}

export interface PharmacySummary {
  pending: number;
  inProgress: number;
  dispensed: number;
  lowStock: number;
}

export const fetchLabSummary = () => get<LabSummary>("/worklists/lab-summary");
export const fetchPharmacySummary = () => get<PharmacySummary>("/worklists/pharmacy-summary");
