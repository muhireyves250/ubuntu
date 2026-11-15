"use client";

import { useMemo } from "react";
import { keepPreviousData, useQuery, useQueries } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { fetchPatients, fetchPatient, createPatientApi, updatePatientApi } from "./patient-api";
import { fetchPregnanciesForPatient, fetchAllPregnancies, createPregnancyApi, closePregnancyApi, updatePregnancyApi, type PregnancyUpdatableFields } from "./pregnancy-api";
import { fetchVisitsForPregnancy, fetchVisitsForPatient, fetchAllVisits, createVisitApi, finalizeVisitApi, confirmAiRiskApi, createEmergencyVisitApi, escalateVisitApi } from "./visit-api";
import { fetchAllCommunityVisits, fetchCommunityVisitsForPregnancy, fetchMyCommunityVisits } from "./community-visit-api";
import { fetchVaccinationsForPregnancy, recordVaccinationApi, type Vaccination } from "./vaccination-api";
import { fetchDiagnosesForVisit, createDiagnosisApi, type VisitDiagnosis } from "./diagnosis-api";
import {
  fetchPartnerForPatient,
  upsertPartnerApi,
  fetchPartnerLabTests,
  addPartnerLabTestApi,
  type Partner,
  type PartnerLabTest,
} from "./partner-api";
import {
  fetchInventory,
  createInventoryItemApi,
  adjustStockApi,
  fetchPrescriptionsForVisit,
  createPrescriptionApi,
  fetchConsumablesForVisit,
  createConsumableUsageApi,
  type InventoryItem,
  type InventoryCategory,
  type Prescription,
  type ConsumableUsage,
} from "./pharmacy-api";
import { fetchInvoiceForVisit, generateInvoiceApi, markInvoicePaidApi, type Invoice } from "./billing-api";
import { runAiPredictionApi, fetchRiskPredictionForVisit, type RiskPrediction } from "./risk-prediction-api";
import {
  fetchReferrals,
  createReferralApi,
  acceptReferralApi,
  closeReferralApi,
  updateFacilityCapacityApi,
  fetchMyFacilityCapacity,
} from "./referral-api";
import { createChwAssignmentApi, fetchAssignmentsForPatient } from "./chw-assignment-api";
import {
  fetchRecommendations,
  createRecommendationApi,
  respondToRecommendationApi,
  acknowledgeRecommendationApi,
} from "./recommendation-api";
import {
  fetchCommentsForPatient,
  createCommentApi,
  fetchRepliesToMe,
  type PatientComment,
  type CommentReply,
} from "./patient-comment-api";
import { type AcknowledgedAlert } from "./alerts-storage";
import { useReadNotificationIdsQuery, markNotificationReadApi } from "./read-notifications-api";
import { useNotificationFeed } from "./notification-feed-api";
import { fetchAcknowledgments, acknowledgePatientApi } from "./patient-acknowledgment-api";
import {
  WORKLISTS_KEY,
  fetchFollowUps,
  fetchAncVisits,
  fetchRiskSummary,
  fetchActiveReferrals,
  fetchReferralCounts,
  fetchChwPatients,
  fetchEmergencyQueue,
  fetchPatientRegistry,
  type PatientRegistryRow,
  type EmergencyCase,
  type FollowUpPatient,
  type TodaysVisit,
  type VisitsWorklistPeriod,
  type RiskSummary,
  type RiskSummaryScope,
  type ActiveReferral,
  type ReferralCounts,
  type ChwPatientDue,
} from "./worklists-api";
import { getStoredAuthenticatedUser } from "../auth/auth-context";
import type {
  Patient,
  Referral,
  ReferralOutcome,
  RiskLevel,
  Visit,
  VisitLabs,
  VisitType,
  Pregnancy,
  Recommendation,
  FacilityCapacity,
  FollowUpAssignment,
  FollowUpReason,
  FollowUpPriority,
  CommunityVisit,
} from "./types";

function getCurrentUserSnapshot(): { id: string; name: string; facility: string; facilityLevel: string; role: string } {
  const user = typeof window !== "undefined" ? getStoredAuthenticatedUser() : null;
  return {
    id: user?.id ?? "",
    name: user?.name ?? "Unknown",
    facility: user?.facility ?? "Unknown facility",
    facilityLevel: user?.facilityLevel ?? "hc",
    role: user?.role ?? "nurse",
  };
}

// The system holds one shared patient record — every facility can see every
// patient and their full history, not just the ones they registered.
export function usePatients(): Patient[] {
  // Patient roster changes far less often than visits/referrals — a longer
  // staleTime here cuts the refetch-storm this list causes by being pulled
  // from many widgets (dashboard cards, topbar search, patient lists) that
  // all mount/remount on ordinary navigation.
  const { data } = useQuery({ queryKey: ["patients"], queryFn: () => fetchPatients(), staleTime: 120_000 });
  return data ?? [];
}

export function useVisits(): Visit[] {
  // Unbounded "all visits" fetch backing patient-list risk badges — real
  // freshness after any mutation already comes from each mutation's own
  // explicit invalidateQueries(["visits"]) call, not from a short
  // staleTime, so this can safely sit longer than the 30s global default.
  const { data } = useQuery({ queryKey: ["visits", "all"], queryFn: fetchAllVisits, staleTime: 60_000 });
  return data ?? [];
}


export function usePatient(patientId: string): Patient | undefined {
  const { data } = useQuery({
    queryKey: ["patients", patientId],
    queryFn: () => fetchPatient(patientId),
    enabled: !!patientId,
  });
  return data;
}

// `usePatient()` returns `undefined` both while the fetch is in flight and when the
// patient genuinely doesn't exist. Callers that render a not-found state (e.g. via
// `notFound()`) must check this first, or every fresh navigation/reload false-404s
// before the fetch resolves. Shares the query cache with `usePatient()` (same key),
// so calling both in one component does not trigger a second request.
export function usePatientIsLoading(patientId: string): boolean {
  const { isLoading } = useQuery({
    queryKey: ["patients", patientId],
    queryFn: () => fetchPatient(patientId),
    enabled: !!patientId,
  });
  return isLoading;
}

export function usePregnancies(): Pregnancy[] {
  const { data } = useQuery({
    queryKey: ["pregnancies", "all"],
    queryFn: fetchAllPregnancies,
    staleTime: 120_000,
  });
  return data ?? [];
}

// The Overview skeleton shows until the API's summary for the chosen window
// first arrives (same query as useRiskSummary, so no extra request).
export function useIsOverviewDataLoading(days?: number, scope: RiskSummaryScope = "all"): boolean {
  return useQuery(riskSummaryQuery(days, scope)).isLoading;
}

// The Patient Registry rows: each patient with her last visit at this
// facility and current gestation, from the API.
export function usePatientRegistry(): { rows: PatientRegistryRow[]; isLoading: boolean } {
  const { data, isLoading } = useQuery({ queryKey: [WORKLISTS_KEY, "patient-registry"], queryFn: fetchPatientRegistry });
  return { rows: data ?? [], isLoading };
}

export function usePregnanciesForPatient(patientId: string): Pregnancy[] {
  const { data } = useQuery({
    queryKey: ["pregnancies", patientId],
    queryFn: () => fetchPregnanciesForPatient(patientId),
    enabled: !!patientId,
  });
  return data ?? [];
}

export function useVisitsForPregnancy(pregnancyId: string): Visit[] {
  const { data } = useQuery({
    queryKey: ["visits", "pregnancy", pregnancyId],
    queryFn: () => fetchVisitsForPregnancy(pregnancyId),
    enabled: !!pregnancyId,
  });
  return data ?? [];
}

export function useAllVisitsForPatient(patientId: string): Visit[] {
  // Single request across every pregnancy the patient has, instead of one
  // parallel request per pregnancy (was a real N+1 — a patient with 4
  // pregnancies fired 4 separate HTTP requests just to render this list).
  const { data } = useQuery({
    queryKey: ["visits", "patient", patientId],
    queryFn: () => fetchVisitsForPatient(patientId),
    enabled: !!patientId,
  });
  return useMemo(() => {
    const allVisits = data ?? [];
    return [...allVisits].sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
    });
  }, [data]);
}

// All CHW home-visit reports for a patient, across every pregnancy they've
// ever had (not just the currently open one) — for a full history view, not
// just the active pregnancy's schedule.
export function useAllCommunityVisitsForPatient(patientId: string): CommunityVisit[] {
  const pregnancies = usePregnanciesForPatient(patientId);
  const results = useQueries({
    queries: pregnancies.map((p) => ({
      queryKey: ["community-visits", "pregnancy", p.id],
      queryFn: () => fetchCommunityVisitsForPregnancy(p.id),
      enabled: !!p.id,
    })),
  });
  return useMemo(() => {
    const all = results.flatMap((r) => r.data ?? []);
    return all.sort((a, b) => b.visitDate.localeCompare(a.visitDate));
  }, [results]);
}

export function useReferrals(): Referral[] {
  const { data } = useQuery({ queryKey: ["referrals"], queryFn: fetchReferrals });
  return data ?? [];
}

// Facility-wide community (CHW home) visits, used to drive the nurse-facing
// "CHW report submitted" notification feed — scoped server-side to the
// current user's facility via GET /community-visits.
export function useAllCommunityVisits(): CommunityVisit[] {
  const { role } = getCurrentUserSnapshot();
  const query = useQuery({
    queryKey: ["community-visits", "all"],
    queryFn: fetchAllCommunityVisits,
    staleTime: 30_000,
    retry: 1,
    enabled: role === "nurse" || role === "gynecologist",
  });
  return query.data ?? [];
}

export function useCommunityVisitsForPregnancy(pregnancyId: string): CommunityVisit[] {
  const { data } = useQuery({
    queryKey: ["community-visits", "pregnancy", pregnancyId],
    queryFn: () => fetchCommunityVisitsForPregnancy(pregnancyId),
    enabled: !!pregnancyId,
  });
  return data ?? [];
}

export function useInvoiceForVisit(visitId: string): Invoice | null {
  const { data } = useQuery({
    queryKey: ["invoice", "visit", visitId],
    queryFn: () => fetchInvoiceForVisit(visitId),
    enabled: !!visitId,
  });
  return data ?? null;
}

export async function generateInvoice(visitId: string, coveragePercentOverride?: number): Promise<Invoice> {
  const invoice = await generateInvoiceApi(visitId, coveragePercentOverride);
  await queryClient.invalidateQueries({ queryKey: ["invoice", "visit", visitId] });
  return invoice;
}

export async function markInvoicePaid(id: string, visitId: string): Promise<Invoice> {
  const invoice = await markInvoicePaidApi(id);
  await queryClient.invalidateQueries({ queryKey: ["invoice", "visit", visitId] });
  return invoice;
}

export function useRiskPredictionForVisit(visitId: string): RiskPrediction | null {
  const { data } = useQuery({
    queryKey: ["risk-prediction", "visit", visitId],
    queryFn: () => fetchRiskPredictionForVisit(visitId),
    enabled: !!visitId,
  });
  return data ?? null;
}

export async function runAiPrediction(visitId: string): Promise<RiskPrediction> {
  const prediction = await runAiPredictionApi(visitId);
  queryClient.setQueryData(["risk-prediction", "visit", visitId], prediction);
  return prediction;
}

export function useInventory(): InventoryItem[] {
  const { data } = useQuery({ queryKey: ["inventory"], queryFn: fetchInventory, staleTime: 120_000 });
  return data ?? [];
}

export async function createInventoryItem(data: {
  name: string;
  category: InventoryCategory;
  unit: string;
  quantityOnHand?: number;
  reorderLevel?: number;
  unitPrice?: number;
}): Promise<InventoryItem> {
  const item = await createInventoryItemApi(data);
  await queryClient.invalidateQueries({ queryKey: ["inventory"] });
  return item;
}

export async function adjustStock(id: string, delta: number): Promise<InventoryItem> {
  const item = await adjustStockApi(id, delta);
  await queryClient.invalidateQueries({ queryKey: ["inventory"] });
  return item;
}

export function usePrescriptionsForVisit(visitId: string): Prescription[] {
  const { data } = useQuery({
    queryKey: ["prescriptions", visitId],
    queryFn: () => fetchPrescriptionsForVisit(visitId),
    enabled: !!visitId,
  });
  return data ?? [];
}

export async function createPrescription(data: {
  visitId: string;
  inventoryItemId?: string;
  drugName: string;
  perDose?: string;
  unit?: string;
  frequency?: string;
  durationDays?: number;
  quantity?: number;
  patientInstructions?: string;
  forPartner?: boolean;
}): Promise<Prescription> {
  const prescription = await createPrescriptionApi(data);
  await queryClient.invalidateQueries({ queryKey: ["prescriptions", data.visitId] });
  if (data.inventoryItemId) await queryClient.invalidateQueries({ queryKey: ["inventory"] });
  return prescription;
}

export function useConsumablesForVisit(visitId: string): ConsumableUsage[] {
  const { data } = useQuery({
    queryKey: ["consumables", visitId],
    queryFn: () => fetchConsumablesForVisit(visitId),
    enabled: !!visitId,
  });
  return data ?? [];
}

export async function createConsumableUsage(data: {
  visitId: string;
  inventoryItemId?: string;
  itemName: string;
  quantity: number;
  unit?: string;
  comment?: string;
  forPartner?: boolean;
}): Promise<ConsumableUsage> {
  const usage = await createConsumableUsageApi(data);
  await queryClient.invalidateQueries({ queryKey: ["consumables", data.visitId] });
  if (data.inventoryItemId) await queryClient.invalidateQueries({ queryKey: ["inventory"] });
  return usage;
}

export function usePartnerForPatient(patientId: string): Partner | null {
  const { data } = useQuery({
    queryKey: ["partner", "patient", patientId],
    queryFn: () => fetchPartnerForPatient(patientId),
    enabled: !!patientId,
  });
  return data ?? null;
}

export async function upsertPartner(data: {
  patientId: string;
  name: string;
  phone?: string;
  nationalId?: string;
  hivTestResult?: Partner["hivTestResult"];
}): Promise<Partner> {
  const partner = await upsertPartnerApi(data);
  await queryClient.invalidateQueries({ queryKey: ["partner", "patient", data.patientId] });
  return partner;
}

export function usePartnerLabTests(partnerId: string, pregnancyId: string): PartnerLabTest[] {
  const { data } = useQuery({
    queryKey: ["partner-lab-tests", partnerId, pregnancyId],
    queryFn: () => fetchPartnerLabTests(partnerId, pregnancyId),
    enabled: !!partnerId && !!pregnancyId,
  });
  return data ?? [];
}

export async function addPartnerLabTest(
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
  const test = await addPartnerLabTestApi(partnerId, data);
  await queryClient.invalidateQueries({ queryKey: ["partner-lab-tests", partnerId, data.pregnancyId] });
  return test;
}

export function useDiagnosesForVisit(visitId: string): VisitDiagnosis[] {
  const { data } = useQuery({
    queryKey: ["diagnoses", "visit", visitId],
    queryFn: () => fetchDiagnosesForVisit(visitId),
    enabled: !!visitId,
  });
  return data ?? [];
}

export async function createDiagnosis(data: {
  visitId: string;
  code: string;
  title: string;
  uri?: string;
  caseStatus?: string;
  diagnosisType?: string;
  department?: string;
  treatmentNotes?: string;
}): Promise<VisitDiagnosis> {
  const diagnosis = await createDiagnosisApi(data);
  await queryClient.invalidateQueries({ queryKey: ["diagnoses", "visit", data.visitId] });
  return diagnosis;
}

export function useVaccinationsForPregnancy(pregnancyId: string): Vaccination[] {
  const { data } = useQuery({
    queryKey: ["vaccinations", "pregnancy", pregnancyId],
    queryFn: () => fetchVaccinationsForPregnancy(pregnancyId),
    enabled: !!pregnancyId,
    staleTime: 60_000,
  });
  return data ?? [];
}

export async function recordVaccination(data: {
  pregnancyId: string;
  vaccineName?: string;
  dosage: string;
  dateTaken?: string;
}): Promise<Vaccination> {
  const vaccination = await recordVaccinationApi(data);
  await queryClient.invalidateQueries({ queryKey: ["vaccinations", "pregnancy", data.pregnancyId] });
  return vaccination;
}

// Every community visit the current CHW has ever submitted, across all of
// their patients' pregnancies — used to drive the CHW-facing notification
// feed (which schedule slots are already done, which reports were just
// accepted) without needing a per-pregnancy hook per patient.
export function useMyCommunityVisits(): CommunityVisit[] {
  const { role } = getCurrentUserSnapshot();
  const { data } = useQuery({
    queryKey: ["community-visits", "mine"],
    queryFn: fetchMyCommunityVisits,
    enabled: role === "chw",
  });
  return data ?? [];
}

// Accepted referrals this facility sent or is handling, each with its
// patient and current gestation (GET /worklists/active-referrals).
export function useActiveReferrals(): ActiveReferral[] {
  const { data } = useQuery({ queryKey: [WORKLISTS_KEY, "active-referrals"], queryFn: fetchActiveReferrals });
  return data ?? [];
}

export function useReferralCounts(): ReferralCounts {
  const { data } = useQuery({ queryKey: [WORKLISTS_KEY, "referral-counts"], queryFn: fetchReferralCounts });
  return data ?? { pending: 0, accepted: 0, closed: 0 };
}

// Pending emergency referrals this hospital can accept, most urgent first
// (GET /worklists/emergency-queue). Only clinical staff are offered them.
const EMERGENCY_QUEUE_ROLES = ["nurse", "gynecologist", "lab_nurse"];

export function useEmergencyQueue(): EmergencyCase[] {
  const { role } = getCurrentUserSnapshot();
  const { data } = useQuery({
    queryKey: [WORKLISTS_KEY, "emergency-queue"],
    queryFn: fetchEmergencyQueue,
    enabled: EMERGENCY_QUEUE_ROLES.includes(role),
  });
  return data ?? [];
}

// A CHW's patients with the next home visit due (GET /worklists/chw-patients).
export function useChwPatientsDue(): ChwPatientDue[] | undefined {
  const { role } = getCurrentUserSnapshot();
  const { data } = useQuery({
    queryKey: [WORKLISTS_KEY, "chw-patients"],
    queryFn: fetchChwPatients,
    enabled: role === "chw",
  });
  return data;
}

export function useRecommendationsForPatient(patientId: string): Recommendation[] {
  const { data } = useQuery({
    queryKey: ["recommendations", "patient", patientId],
    queryFn: () => fetchRecommendations(patientId),
    staleTime: 60_000,
  });
  return data ?? [];
}

export function useAllRecommendations(): Recommendation[] {
  const { data } = useQuery({
    queryKey: ["recommendations", "all"],
    queryFn: () => fetchRecommendations(),
    staleTime: 60_000,
  });
  return data ?? [];
}

export async function createRecommendation(
  patientId: string,
  message: string,
  riskLevel: RiskLevel,
): Promise<Recommendation> {
  const recommendation = await createRecommendationApi(patientId, message, riskLevel);
  await queryClient.invalidateQueries({ queryKey: ["recommendations"] });
  return recommendation;
}

export async function respondToRecommendation(id: string, response: string): Promise<Recommendation> {
  const recommendation = await respondToRecommendationApi(id, response);
  await queryClient.invalidateQueries({ queryKey: ["recommendations"] });
  return recommendation;
}

export async function acknowledgeRecommendation(id: string): Promise<Recommendation> {
  const recommendation = await acknowledgeRecommendationApi(id);
  await queryClient.invalidateQueries({ queryKey: ["recommendations"] });
  return recommendation;
}

export function useCommentsForPatient(patientId: string): PatientComment[] {
  const { data } = useQuery({
    queryKey: ["comments", "patient", patientId],
    queryFn: () => fetchCommentsForPatient(patientId),
    staleTime: 30_000,
  });
  return data ?? [];
}

export async function createComment(
  patientId: string,
  body: string,
  parentId?: string,
): Promise<PatientComment> {
  const comment = await createCommentApi(patientId, body, parentId);
  await queryClient.invalidateQueries({ queryKey: ["comments", "patient", patientId] });
  await queryClient.invalidateQueries({ queryKey: ["comments", "replies-to-me"] });
  return comment;
}

// Mounted globally (useNotificationAlerts runs in the Topbar on every
// dashboard route for every role), so this gets a longer staleTime like its
// siblings there (useFacilities, useAllCommunityVisits) — replies to a
// comment don't need sub-minute freshness across the whole app.
export function useRepliesToMe(): CommentReply[] {
  const { data } = useQuery({
    queryKey: ["comments", "replies-to-me"],
    queryFn: fetchRepliesToMe,
    staleTime: 60_000,
  });
  return data ?? [];
}

export function useFollowUpAssignmentsForPatient(patientId: string): FollowUpAssignment[] {
  const { data } = useQuery({
    queryKey: ["chw-assignments", "patient", patientId],
    queryFn: () => fetchAssignmentsForPatient(patientId),
  });
  return data ?? [];
}

export async function createFollowUpAssignment(data: {
  patientId: string;
  reason: FollowUpReason;
  priority: FollowUpPriority;
  dueDate: string;
  assignedToChwId: string;
}): Promise<FollowUpAssignment> {
  const assignment = await createChwAssignmentApi(data);
  await queryClient.invalidateQueries({ queryKey: ["chw-assignments"] });
  return assignment;
}

// A patient may have several red-case referrals across their history, but only
// the most recent emergency can be "active" at once — this is what gates a new
// visit from being started until it is closed.
export function useReferralsForPatient(patientId: string): Referral[] {
  const referrals = useReferrals();
  return useMemo(
    () =>
      referrals
        .filter((r) => r.patientId === patientId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [referrals, patientId],
  );
}


// Emergency capacity of the signed-in user's facility, computed by the API
// (the same numbers it uses to refuse a new emergency once full).
export function useFacilityCapacity(): FacilityCapacity {
  const { data } = useQuery({ queryKey: ["facility-capacity"], queryFn: fetchMyFacilityCapacity });
  return data ?? { max: 0, active: 0, remaining: 0, status: "available", configured: false };
}

export async function setFacilityMaxCapacity(capacity: number): Promise<void> {
  await updateFacilityCapacityApi(capacity);
  await queryClient.invalidateQueries({ queryKey: ["facilities"] });
}

export async function finalizeAssessment(
  visitId: string,
  treatment: string,
  followUpPlan: string,
): Promise<void> {
  await finalizeVisitApi(visitId, treatment, followUpPlan);
  // Broad ["visits"] prefix, not just this pregnancy's key — also covers
  // the single-request-per-patient cache (["visits","patient",id]) used by
  // useAllVisitsForPatient.
  await queryClient.invalidateQueries({ queryKey: ["visits"] });
}

// Sets the visit's actual risk classification to match an AI-confirmed
// finding as soon as the nurse proceeds past it — independent of the
// emergency transfer, which still only happens once treatment completes.
// Invalidating ["visits"] (not just this pregnancy's key) so risk badges
// on patient lists/dashboards refresh immediately too.
export async function confirmAiRisk(
  visitId: string,
  riskLevel: RiskLevel,
  reasons: string[],
): Promise<void> {
  await confirmAiRiskApi(visitId, riskLevel, reasons);
  await queryClient.invalidateQueries({ queryKey: ["visits"] });
}

// After an AI-confirmed RED, the API opens (or returns) the patient's
// emergency referral and routes it to the right hospital.
export async function escalateVisitIfCritical(visit: Visit, riskLevel: RiskLevel): Promise<Referral | null> {
  if (riskLevel !== "red") return null;
  const referral = await escalateVisitApi(visit.id);
  await queryClient.invalidateQueries({ queryKey: ["referrals"] });
  return referral;
}

export async function acceptReferral(referralId: string): Promise<Referral> {
  // The API refuses an emergency once this facility is at capacity.
  const accepted = await acceptReferralApi(referralId);
  await queryClient.invalidateQueries({ queryKey: ["referrals"] });
  return accepted;
}

// Closing with outcome "referred" also opens the onward emergency referral
// (the API does both in one call).
export async function closeReferral(
  referralId: string,
  data: {
    outcome: ReferralOutcome;
    outcomeStatement: string;
    riskLevel: RiskLevel;
    referOnwardToFacilityId?: string;
  },
): Promise<Referral> {
  const closed = await closeReferralApi(
    referralId,
    data.outcome,
    data.outcomeStatement,
    data.riskLevel,
    data.referOnwardToFacilityId,
  );
  await queryClient.invalidateQueries({ queryKey: ["referrals"] });
  return closed;
}

// The API uses the patient's open pregnancy and keeps one active emergency
// case per patient.
export async function createReferral(data: {
  patientId: string;
  receivingFacilityId: string;
  reason: string;
  urgency: "routine" | "urgent" | "emergency";
}): Promise<Referral> {
  const referral = await createReferralApi(data.patientId, data.receivingFacilityId, data.reason, data.urgency);
  await queryClient.invalidateQueries({ queryKey: ["referrals"] });
  return referral;
}

export type {
  FollowUpPatient,
  TodaysVisit,
  VisitsWorklistPeriod,
  RiskSummary,
  RiskSummaryScope,
  ActiveReferral,
  ReferralCounts,
  ChwPatientDue,
  EmergencyCase,
  PatientRegistryRow,
};

// Yellow/orange patients and those not seen here for over 14 days
// (GET /worklists/follow-ups).
export function useFollowUpPatients(): FollowUpPatient[] {
  const { data } = useQuery({ queryKey: [WORKLISTS_KEY, "follow-ups"], queryFn: fetchFollowUps });
  return data ?? [];
}

// Mothers due an ANC checkpoint in the period who haven't arrived yet, then
// the visits already logged in it (GET /worklists/anc-visits).
export function useTodaysVisits(period: VisitsWorklistPeriod = "today"): TodaysVisit[] {
  const { data } = useQuery({ queryKey: [WORKLISTS_KEY, "anc-visits", period], queryFn: () => fetchAncVisits(period) });
  return data ?? [];
}

const EMPTY_RISK_SUMMARY: RiskSummary = {
  totalPatients: 0,
  totalVisits: 0,
  counts: { green: 0, yellow: 0, orange: 0, red: 0 },
  highRiskRate: 0,
};

// Patient/visit counts and the risk-colour breakdown for a window
// (GET /worklists/risk-summary).
function riskSummaryQuery(days: number | undefined, scope: RiskSummaryScope) {
  return {
    queryKey: [WORKLISTS_KEY, "risk-summary", days ?? "all", scope],
    queryFn: () => fetchRiskSummary(days, scope),
    // Keep the last numbers on screen while another window loads.
    placeholderData: keepPreviousData,
  };
}

export function useRiskSummary(days?: number, scope: RiskSummaryScope = "all"): RiskSummary {
  const { data } = useQuery(riskSummaryQuery(days, scope));
  return data ?? EMPTY_RISK_SUMMARY;
}

export async function registerPatient(
  data: Omit<Patient, "id" | "registeredAt" | "registeredBy" | "registrationFacility" | "currentRisk" | "age">,
): Promise<Patient> {
  const patient = await createPatientApi(data);
  await queryClient.invalidateQueries({ queryKey: ["patients"] });
  return patient;
}

// One API call: the server saves the visit, classifies it, finalizes it (or
// sends the patient to the lab), and opens an emergency referral for an
// emergency or RED visit.
export async function recordVisit(data: {
  pregnancyId: string;
  type: VisitType;
  ancNumber?: number;
  scheduledWeek?: number;
  symptomIds: string[];
  notes: string;
  labs?: VisitLabs;
  labStatus?: "pending";
  requestedTests?: string[];
  labNotes?: string;
  emergencySummary?: string;
  treatment?: string;
  followUpPlan?: string;
}): Promise<Visit> {
  const visit = await createVisitApi(data.pregnancyId, {
    type: data.type,
    ancNumber: data.ancNumber,
    scheduledWeek: data.scheduledWeek,
    symptomIds: data.symptomIds,
    notes: data.notes,
    labs: data.labs,
    emergencySummary: data.emergencySummary,
    treatment: data.treatment,
    followUpPlan: data.followUpPlan,
    labRequest:
      data.labStatus === "pending"
        ? { requestedTests: data.requestedTests, notes: data.labNotes }
        : undefined,
  });
  // Broad ["visits"] prefix — also covers the single-request-per-patient
  // cache (["visits","patient",id]) used by useAllVisitsForPatient.
  await queryClient.invalidateQueries({ queryKey: ["visits"] });
  await queryClient.invalidateQueries({ queryKey: ["referrals"] });
  await queryClient.invalidateQueries({ queryKey: ["lab-requests"] });
  return visit;
}

export async function createPregnancy(
  data: Omit<
    Pregnancy,
    "id" | "pregnancyNumber" | "eddDate" | "status" | "createdAt" | "schedule" | "delivery" | "numberOfBabies" | "hadHypertensionDisorder"
  >,
): Promise<Pregnancy> {
  const pregnancy = await createPregnancyApi(data);
  await queryClient.invalidateQueries({ queryKey: ["pregnancies", data.patientId] });
  return pregnancy;
}

export async function closePregnancy(
  pregnancyId: string,
  delivery: NonNullable<Pregnancy["delivery"]>,
): Promise<void> {
  const pregnancy = await closePregnancyApi(pregnancyId, delivery);
  await queryClient.invalidateQueries({ queryKey: ["pregnancies", pregnancy.patientId] });
}

export async function updatePregnancy(
  pregnancyId: string,
  updates: PregnancyUpdatableFields,
): Promise<Pregnancy> {
  const pregnancy = await updatePregnancyApi(pregnancyId, updates);
  await queryClient.invalidateQueries({ queryKey: ["pregnancies", pregnancy.patientId] });
  return pregnancy;
}

export async function createEmergencyVisit(
  patientId: string,
  checkedDangerSignIds: string[],
  vitals: { bpSystolic: string; bpDiastolic: string; temperature: string },
): Promise<{ pregnancy: Pregnancy; visit: Visit; referral: Referral }> {
  // Single backend call: it flags very high BP / high fever from the
  // readings, writes the summary, opens the visit (RED) and the emergency
  // referral.
  const result = await createEmergencyVisitApi(patientId, checkedDangerSignIds, vitals);

  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["visits"] }),
    queryClient.invalidateQueries({ queryKey: ["referrals"] }),
    queryClient.invalidateQueries({ queryKey: ["pregnancies", patientId] }),
  ]);

  return result;
}

export async function updatePatient(
  patientId: string,
  updates: Partial<Omit<Patient, "id" | "registeredAt" | "registeredBy" | "registrationFacility" | "currentRisk" | "age">>,
): Promise<void> {
  await updatePatientApi(patientId, updates);
  await queryClient.invalidateQueries({ queryKey: ["patients"] });
}

export function useAcknowledgedAlerts(): AcknowledgedAlert[] {
  const { data } = useQuery({ queryKey: ["acknowledgments"], queryFn: fetchAcknowledgments });
  return data ?? [];
}

export function useUnacknowledgedCount(): number {
  const followUps = useFollowUpPatients();
  const acknowledged = useAcknowledgedAlerts();
  const ackIds = useMemo(
    () => new Set(acknowledged.map((a) => a.patientId)),
    [acknowledged],
  );
  return followUps.filter((f) => !ackIds.has(f.patient.id)).length;
}

export async function acknowledgeAlert(patientId: string, note: string): Promise<void> {
  await acknowledgePatientApi(patientId, note);
  await queryClient.invalidateQueries({ queryKey: ["acknowledgments"] });
}

export interface NotificationAlert {
  id: string; // synthetic per-alert-type key, not always a visitId
  type:
    | "lab_request"
    | "lab_request_accepted"
    | "lab_completed"
    | "referral_pending"
    | "referral_accepted"
    | "referral_accepted_elsewhere"
    | "referral_closed"
    | "recommendation_open"
    | "recommendation_responded"
    | "risk_pregnancy"
    | "critical_lab_result"
    | "emergency_arrival"
    | "facility_full"
    | "new_followup_assignment"
    | "visit_today"
    | "chw_report_submitted"
    | "lab_result_comment"
    | "community_visit_flagged"
    | "chw_visit_due_tomorrow"
    | "chw_visit_due_today"
    | "chw_visit_missed"
    | "chw_new_assignment"
    | "chw_case_accepted"
    | "chw_assigned_to_your_patient"
    | "lab_request_overdue"
    | "lab_result_unacknowledged"
    | "red_risk_escalation"
    | "referral_activity"
    | "community_visit_emergency"
    | "comment_reply"
    | "drug_request";
  patientId: string;
  patientName: string;
  title: string;
  message: string;
  date: string;
  priority: "Normal" | "Urgent" | "Emergency";
  // The specific record this notification is about, when it's not just the
  // patient — e.g. a lab request id, so "View case" can open that exact
  // request instead of a generic list.
  targetId?: string;
}

// Built by the API for the signed-in user — role and facility come from the
// session, not from the caller.
export function useNotificationAlerts(): NotificationAlert[] {
  return useNotificationFeed();
}

// Alert ids are synthesized client-side from live data; the API stores which
// of those ids each user has read, so read state follows them across devices.
export function useReadNotificationIds(): Set<string> {
  return useReadNotificationIdsQuery();
}

export function markNotificationRead(id: string): void {
  void markNotificationReadApi(id);
}

