"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { fetchPatients, fetchPatient, createPatientApi, updatePatientApi } from "./patient-api";
import { fetchPregnanciesForPatient, createPregnancyApi, closePregnancyApi } from "./pregnancy-api";
import { fetchVisitsForPregnancy, createVisitApi, finalizeVisitApi } from "./visit-api";
import { createLabRequestApi } from "./lab-request-api";
import { fetchReferrals, createReferralApi, acceptReferralApi, closeReferralApi } from "./referral-api";
import { createChwAssignmentApi, fetchAssignmentsForPatient, fetchMyAssignments } from "./chw-assignment-api";
import {
  addPregnancy,
  updatePregnancy as storageUpdatePregnancy,
  updateVisit as storageUpdateVisit,
  getServerVisitsSnapshot,
  getServerPregnanciesSnapshot,
  getVisitsSnapshot,
  getPregnanciesSnapshot,
  subscribeToVisits,
  subscribeToPregnancies,
  subscribeToRecommendations,
  getRecommendationsSnapshot,
  getServerRecommendationsSnapshot,
  addRecommendation,
  updateRecommendation,
  subscribeToCapacityOverrides,
  getCapacityOverridesSnapshot,
  getServerCapacityOverridesSnapshot,
  setCapacityOverride,
} from "./storage";
import {
  subscribeToAcknowledged,
  getAcknowledgedSnapshot,
  getServerAcknowledgedSnapshot,
  acknowledgeAlert as storageAcknowledgeAlert,
  type AcknowledgedAlert,
} from "./alerts-storage";
import { classifyRiskLevel } from "./symptom-checklist";
import { computeEdd, matchScheduledVisit } from "./pregnancy";
import { getStoredAuthenticatedUser } from "../auth/auth-context";
import { FOLLOW_UP_REASON_LABELS } from "./types";
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
  FacilityCapacityStatus,
  FollowUpAssignment,
  FollowUpReason,
  FollowUpPriority,
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
  const { data } = useQuery({ queryKey: ["patients"], queryFn: fetchPatients });
  return data ?? [];
}

// Still backed by the old local-storage system — useVisitsForPregnancy() and
// useAllVisitsForPatient() below now use the real API, so a newly-recorded
// visit won't appear here. There is no "all visits" backend endpoint (only
// per-pregnancy), so useFollowUpPatients/useTodaysVisits/useRiskSummary/
// useNotificationAlerts (which all depend on this hook) stay on the old
// system too, same divergence Slice B accepted for usePregnancies(). See
// docs/superpowers/plans/2026-07-23-frontend-visits-integration.md.
export function useVisits(): Visit[] {
  return useSyncExternalStore(
    subscribeToVisits,
    getVisitsSnapshot,
    getServerVisitsSnapshot,
  );
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

// NOTE: still backed by the old local-storage system — usePregnanciesForPatient()
// below now uses the real API, so a newly-created pregnancy won't appear here
// until a future slice migrates this hook (it also depends on visit data, out of
// scope for this slice). See docs/superpowers/plans/2026-07-22-frontend-patients-pregnancies-integration.md.
export function usePregnancies(): Pregnancy[] {
  return useSyncExternalStore(
    subscribeToPregnancies,
    getPregnanciesSnapshot,
    getServerPregnanciesSnapshot,
  );
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
  const pregnancies = usePregnanciesForPatient(patientId);
  const results = useQueries({
    queries: pregnancies.map((p) => ({
      queryKey: ["visits", "pregnancy", p.id],
      queryFn: () => fetchVisitsForPregnancy(p.id),
      enabled: !!p.id,
    })),
  });
  return useMemo(() => {
    const allVisits = results.flatMap((r) => r.data ?? []);
    return allVisits.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
    });
  }, [results]);
}

export interface PatientLock {
  locked: boolean;
  lockedByFacility: string | null;
}

// While a visit is still in progress (labs pending/in-progress, or completed
// but not yet finalized) at the facility handling it, every other facility is
// locked out of the patient's record until that visit is completed — UNLESS
// an emergency referral is open for this patient and the current facility is
// a party to it (the referrer, the one it was routed to, the one that
// accepted it, or any capable facility while it's still pending and
// broadcast for acceptance). Otherwise a facility could never review or
// accept a case it was just referred, since the referring facility's visit
// is still unfinalized by definition.
export function usePatientLock(patientId: string): PatientLock {
  const visits = useAllVisitsForPatient(patientId);
  const referrals = useReferrals();
  const currentUser = getCurrentUserSnapshot();
  return useMemo(() => {
    const activeReferral = referrals
      .filter(
        (r) =>
          r.patientId === patientId &&
          r.urgency === "emergency" &&
          (r.status === "pending" || r.status === "accepted"),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

    if (activeReferral) {
      // Only the facility that referred the case, the one it's literally
      // addressed to, or the one that has actually accepted it gets full
      // record access. Any other capable facility can still see the case in
      // the broadcast panel and preview it there, but must accept before
      // opening the full patient record.
      const isParty =
        activeReferral.referredByFacility === currentUser.facility ||
        activeReferral.receivingFacility === currentUser.facility ||
        activeReferral.acceptedByFacility === currentUser.facility;
      if (isParty) return { locked: false, lockedByFacility: null };
    }

    const latest = visits[0];
    if (!latest) return { locked: false, lockedByFacility: null };
    // KNOWN GAP as of Slice C: labStatus is always undefined on real visits
    // (see visit-api.ts's toFrontendVisit) since lab status lives in the
    // backend's not-yet-migrated Lab Requests domain — so `inUse` can never
    // be true for a real visit, and this cross-facility lock never engages.
    // Deferred to a future Lab Requests integration slice, not fixed here.
    const inUse =
      latest.labStatus === "pending" ||
      latest.labStatus === "in_progress" ||
      (latest.labStatus === "completed" && latest.assessmentFinalized === false);
    if (inUse && latest.hospital !== currentUser.facility) {
      return { locked: true, lockedByFacility: latest.hospital };
    }
    return { locked: false, lockedByFacility: null };
  }, [visits, referrals, patientId, currentUser.facility]);
}

export function useLatestRiskLevel(patientId: string): RiskLevel {
  const visits = useAllVisitsForPatient(patientId);
  const activeEmergency = useActiveEmergencyReferral(patientId);
  if (activeEmergency) return "red";
  return visits[0]?.riskLevel ?? "green";
}

// Referrals are visible system-wide, same as patients and visits — a
// facility with no involvement in a case still needs to be able to see
// that an active referral exists so it can be correctly locked out of the
// record. Consumers that need to narrow this down to "what's actionable
// for me" (the broadcast panel, notification alerts) already apply their
// own facility/urgency filtering on top of this.
export function useReferrals(): Referral[] {
  const { data } = useQuery({ queryKey: ["referrals"], queryFn: fetchReferrals });
  return data ?? [];
}

// Scoped to the current facility — this drives a dashboard widget, not the
// lock/gate logic, so it should stay a "my active cases" view rather than
// showing every facility's referrals.
export function useActiveReferrals(): Referral[] {
  const referrals = useReferrals();
  const currentUser = getCurrentUserSnapshot();
  return useMemo(
    () =>
      referrals.filter(
        (r) =>
          r.status === "accepted" &&
          (r.referredByFacility === currentUser.facility ||
            r.receivingFacility === currentUser.facility ||
            r.acceptedByFacility === currentUser.facility),
      ),
    [referrals, currentUser.facility],
  );
}

// Every patient with an unresolved (pending or accepted) emergency referral
// must display as red everywhere in the app, no matter what a raw "latest
// visit" lookup would otherwise show — the case only stops being red once
// the managing facility closes it and records a new color.
export function useActiveEmergencyPatientIds(): Set<string> {
  const referrals = useReferrals();
  return useMemo(
    () =>
      new Set(
        referrals
          .filter((r) => r.urgency === "emergency" && (r.status === "pending" || r.status === "accepted"))
          .map((r) => r.patientId),
      ),
    [referrals],
  );
}

export function useRecommendationsForPatient(patientId: string): Recommendation[] {
  const all = useSyncExternalStore(
    subscribeToRecommendations,
    getRecommendationsSnapshot,
    getServerRecommendationsSnapshot,
  );
  return useMemo(
    () =>
      all
        .filter((r) => r.patientId === patientId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [all, patientId],
  );
}

export function useAllRecommendations(): Recommendation[] {
  return useSyncExternalStore(
    subscribeToRecommendations,
    getRecommendationsSnapshot,
    getServerRecommendationsSnapshot,
  );
}

export function createRecommendation(patientId: string, message: string, riskLevel: RiskLevel): Recommendation {
  const { name, facility } = getCurrentUserSnapshot();
  const recommendation: Recommendation = {
    id: `recommendation-${crypto.randomUUID()}`,
    patientId,
    createdAt: new Date().toISOString(),
    createdByGynecologist: name,
    createdByFacility: facility,
    riskLevelAtCreation: riskLevel,
    message,
    status: "open",
  };
  addRecommendation(recommendation);
  return recommendation;
}

export function respondToRecommendation(id: string, response: string): Recommendation {
  const { name } = getCurrentUserSnapshot();
  updateRecommendation(id, {
    status: "responded",
    nurseResponse: response,
    respondedByNurse: name,
    respondedAt: new Date().toISOString(),
  });
  return getRecommendationsSnapshot().find((r) => r.id === id)!;
}

export function acknowledgeRecommendation(id: string): Recommendation {
  updateRecommendation(id, { acknowledgedByGynecologistAt: new Date().toISOString() });
  return getRecommendationsSnapshot().find((r) => r.id === id)!;
}

export function useFollowUpAssignmentsForChw(): FollowUpAssignment[] {
  const { role } = getCurrentUserSnapshot();
  const { data } = useQuery({
    queryKey: ["chw-assignments", "mine"],
    queryFn: fetchMyAssignments,
    enabled: role === "chw",
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
export function useActiveEmergencyReferral(patientId: string): Referral | null {
  const referrals = useReferrals();
  return useMemo(
    () =>
      referrals
        .filter(
          (r) =>
            r.patientId === patientId &&
            r.urgency === "emergency" &&
            (r.status === "pending" || r.status === "accepted"),
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null,
    [referrals, patientId],
  );
}

const REFERRAL_ROUTING: Record<string, string> = {
  "Nyamata Health Center": "Bugesera District Hospital",
};
const DEFAULT_RECEIVING_FACILITY = "Bugesera District Hospital";

// Maximum active (accepted, unclosed) Red emergency cases a facility can
// safely manage at once. Facilities not listed here (including every
// external hospital in RECEIVING_FACILITIES, which have no real accounts)
// default to DEFAULT_CAPACITY — effectively unlimited, since capacity can't
// be tracked for a facility nobody can log into.
export const FACILITY_CAPACITY: Record<string, number> = {
  "Bugesera District Hospital": 3,
  "Nyanza District Hospital": 10,
};
export const DEFAULT_CAPACITY = 999;

function getFacilityCapacitySnapshot(facility: string, referrals: Referral[]): FacilityCapacity {
  const overrides = getCapacityOverridesSnapshot();
  const max = overrides[facility] ?? FACILITY_CAPACITY[facility] ?? DEFAULT_CAPACITY;
  const active = referrals.filter(
    (r) => r.status === "accepted" && r.acceptedByFacility === facility && r.urgency === "emergency",
  ).length;
  const remaining = max - active;
  const status: FacilityCapacityStatus =
    remaining <= 0 ? "full" : remaining <= 2 ? "nearly_full" : "available";
  return { max, active, remaining, status };
}

export function useFacilityCapacity(facility: string): FacilityCapacity {
  const referrals = useReferrals();
  const overrides = useSyncExternalStore(
    subscribeToCapacityOverrides,
    getCapacityOverridesSnapshot,
    getServerCapacityOverridesSnapshot,
  );
  return useMemo(() => {
    const max = overrides[facility] ?? FACILITY_CAPACITY[facility] ?? DEFAULT_CAPACITY;
    const active = referrals.filter(
      (r) => r.status === "accepted" && r.acceptedByFacility === facility && r.urgency === "emergency",
    ).length;
    const remaining = max - active;
    const status: FacilityCapacityStatus =
      remaining <= 0 ? "full" : remaining <= 2 ? "nearly_full" : "available";
    return { max, active, remaining, status };
  }, [referrals, facility, overrides]);
}

export function setFacilityMaxCapacity(facility: string, max: number) {
  setCapacityOverride(facility, max);
}

export async function finalizeAssessment(
  visitId: string,
  treatment: string,
  followUpPlan: string,
): Promise<void> {
  const visit = await finalizeVisitApi(visitId, treatment, followUpPlan);
  await queryClient.invalidateQueries({ queryKey: ["visits", "pregnancy", visit.pregnancyId] });
}

async function getOrCreateEmergencyReferral(patientId: string, reason: string): Promise<Referral> {
  const existingReferrals = await fetchReferrals();
  const existing = existingReferrals.find(
    (r) => r.patientId === patientId && (r.status === "pending" || r.status === "accepted"),
  );
  if (existing) return existing;

  const openPregnancy = (await fetchPregnanciesForPatient(patientId)).find((p) => p.status === "open");
  if (!openPregnancy) {
    throw new Error("Cannot create an emergency referral: patient has no open pregnancy");
  }

  const { facility, facilityLevel } = getCurrentUserSnapshot();
  // A health center always escalates up. Anything already at district-hospital
  // level or above already has the capability to manage an obstetric
  // emergency, so it self-accepts immediately instead of sitting pending. The
  // backend has no self-accept shortcut, so this is two real calls (create,
  // then accept) rather than one local object construction — same net
  // visible result (a referral that's already "accepted" by its own
  // creating facility).
  const canHandleLocally = facilityLevel !== "hc";
  const toFacilityName = canHandleLocally ? facility : (REFERRAL_ROUTING[facility] ?? DEFAULT_RECEIVING_FACILITY);

  let referral = await createReferralApi(openPregnancy.id, toFacilityName, reason, "emergency");
  if (canHandleLocally) {
    referral = await acceptReferralApi(referral.id);
  }
  await queryClient.invalidateQueries({ queryKey: ["referrals"] });
  return referral;
}

export async function escalateVisitIfCritical(visit: Visit, riskLevel: RiskLevel): Promise<Referral | null> {
  if (riskLevel !== "red") return null;

  const pregnancy = getPregnanciesSnapshot().find((p) => p.id === visit.pregnancyId);
  if (!pregnancy) return null;

  if (visit.riskLevel !== "red") {
    storageUpdateVisit(visit.id, { riskLevel: "red" });
  }

  const reason =
    visit.emergencySummary ?? "AI-confirmed critical case following laboratory review";
  return getOrCreateEmergencyReferral(pregnancy.patientId, reason);
}

export async function acceptReferral(referralId: string): Promise<Referral> {
  const { facility } = getCurrentUserSnapshot();
  const referrals = await fetchReferrals();
  const referral = referrals.find((r) => r.id === referralId);
  if (referral?.urgency === "emergency" && getFacilityCapacitySnapshot(facility, referrals).status === "full") {
    throw new Error("This facility has reached its emergency capacity. Choose another facility.");
  }
  const accepted = await acceptReferralApi(referralId);
  await queryClient.invalidateQueries({ queryKey: ["referrals"] });
  return accepted;
}

export async function closeReferral(
  referralId: string,
  data: { outcome: ReferralOutcome; outcomeStatement: string; riskLevel: RiskLevel },
): Promise<Referral> {
  const closed = await closeReferralApi(referralId, data.outcome, data.outcomeStatement, data.riskLevel);
  await queryClient.invalidateQueries({ queryKey: ["referrals"] });
  return closed;
}

export async function createReferral(data: {
  patientId: string;
  receivingFacility: string;
  reason: string;
  urgency: "routine" | "urgent" | "emergency";
}): Promise<Referral> {
  if (data.urgency === "emergency") {
    // A patient can only have one active red case at a time.
    const existing = (await fetchReferrals()).find(
      (r) =>
        r.patientId === data.patientId &&
        r.urgency === "emergency" &&
        (r.status === "pending" || r.status === "accepted"),
    );
    if (existing) return existing;
  }
  const openPregnancy = (await fetchPregnanciesForPatient(data.patientId)).find((p) => p.status === "open");
  if (!openPregnancy) {
    throw new Error("Cannot create a referral: patient has no open pregnancy");
  }
  const referral = await createReferralApi(openPregnancy.id, data.receivingFacility, data.reason, data.urgency);
  await queryClient.invalidateQueries({ queryKey: ["referrals"] });
  return referral;
}

export interface FollowUpPatient {
  patient: Patient;
  latestRiskLevel: RiskLevel;
  reason: "high-risk" | "overdue";
}

function latestVisitFor(patientId: string, pregnancies: Pregnancy[], visits: Visit[]): Visit | undefined {
  const pregnancyIds = new Set(
    pregnancies.filter((p) => p.patientId === patientId).map((p) => p.id),
  );
  return visits
    .filter((v) => pregnancyIds.has(v.pregnancyId))
    .sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
    })[0];
}

export function useFollowUpPatients(): FollowUpPatient[] {
  const patients = usePatients();
  const visits = useVisits();
  const pregnancies = usePregnancies();
  const activeEmergencyPatientIds = useActiveEmergencyPatientIds();

  return useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 14);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const results: FollowUpPatient[] = [];

    for (const patient of patients) {
      const latestVisit = latestVisitFor(patient.id, pregnancies, visits);
      const latestRiskLevel: RiskLevel = activeEmergencyPatientIds.has(patient.id)
        ? "red"
        : (latestVisit?.riskLevel ?? "green");

      if (latestRiskLevel === "yellow" || latestRiskLevel === "orange") {
        results.push({ patient, latestRiskLevel, reason: "high-risk" });
      } else if (latestVisit && latestVisit.date < cutoffStr) {
        results.push({ patient, latestRiskLevel, reason: "overdue" });
      }
    }

    return results;
  }, [patients, visits, pregnancies, activeEmergencyPatientIds]);
}

export interface TodaysVisit {
  kind: "logged" | "due";
  visit?: Visit;
  patient: Patient | undefined;
  dueWeek?: number;
}

// Shows both visits already logged today AND mothers with an open pregnancy
// whose ANC calendar puts them due today but who haven't arrived/been
// logged yet — so the nurse can see everyone expected today, not just who
// already showed up.
export function useTodaysVisits(): TodaysVisit[] {
  const visits = useVisits();
  const patients = usePatients();
  const pregnancies = usePregnancies();

  return useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const patientIdByPregnancyId = new Map(pregnancies.map((p) => [p.id, p.patientId]));

    const todaysLoggedVisits = visits.filter((v) => v.date === today);
    const logged: TodaysVisit[] = todaysLoggedVisits.map((visit) => ({
      kind: "logged",
      visit,
      patient: patients.find((p) => p.id === patientIdByPregnancyId.get(visit.pregnancyId)),
    }));

    const loggedPregnancyIdsToday = new Set(todaysLoggedVisits.map((v) => v.pregnancyId));

    const due: TodaysVisit[] = pregnancies
      .filter((p) => p.status === "open" && !loggedPregnancyIdsToday.has(p.id))
      .map((pregnancy): TodaysVisit | null => {
        const pregnancyVisits = visits.filter((v) => v.pregnancyId === pregnancy.id);
        const match = matchScheduledVisit(pregnancy, pregnancyVisits, today);
        if (!match) return null;
        return {
          kind: "due",
          patient: patients.find((p) => p.id === pregnancy.patientId),
          dueWeek: match.dueByWeek,
        };
      })
      .filter((entry): entry is TodaysVisit => entry !== null);

    return [...due, ...logged];
  }, [visits, patients, pregnancies]);
}

export interface RiskSummary {
  totalPatients: number;
  totalVisits: number;
  counts: Record<RiskLevel, number>;
  highRiskRate: number; // percentage of patients currently red or orange
}

export function useRiskSummary(days?: number): RiskSummary {
  const patients = usePatients();
  const visits = useVisits();
  const pregnancies = usePregnancies();
  const activeEmergencyPatientIds = useActiveEmergencyPatientIds();

  return useMemo(() => {
    const cutoff =
      days != null
        ? new Date(new Date().getTime() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
        : null;

    const scopedVisits = cutoff ? visits.filter((v) => v.date >= cutoff) : visits;
    // "Active in this window" means registered in it OR had a visit in it —
    // a patient registered months ago with a visit yesterday must still
    // count, not just patients who happen to be newly registered.
    const patientIdByPregnancyId = new Map(pregnancies.map((p) => [p.id, p.patientId]));
    const activePatientIdsInWindow = new Set(
      scopedVisits.map((v) => patientIdByPregnancyId.get(v.pregnancyId)).filter(Boolean),
    );
    const scopedPatients = cutoff
      ? patients.filter((p) => p.registeredAt >= cutoff || activePatientIdsInWindow.has(p.id))
      : patients;

    const counts: Record<RiskLevel, number> = {
      green: 0,
      yellow: 0,
      orange: 0,
      red: 0,
    };

    for (const patient of scopedPatients) {
      const latestVisit = latestVisitFor(patient.id, pregnancies, scopedVisits);
      const level: RiskLevel = activeEmergencyPatientIds.has(patient.id)
        ? "red"
        : (latestVisit?.riskLevel ?? "green");
      counts[level] += 1;
    }

    const totalPatients = scopedPatients.length;
    const highRiskRate =
      totalPatients === 0
        ? 0
        : Math.round(((counts.red + counts.orange) / totalPatients) * 100);

    return { totalPatients, totalVisits: scopedVisits.length, counts, highRiskRate };
  }, [patients, visits, pregnancies, days, activeEmergencyPatientIds]);
}

export async function registerPatient(
  data: Omit<Patient, "id" | "registeredAt" | "registeredBy" | "registrationFacility">,
): Promise<Patient> {
  const patient = await createPatientApi(data);
  await queryClient.invalidateQueries({ queryKey: ["patients"] });
  return patient;
}

export async function recordVisit(data: {
  pregnancyId: string;
  type: VisitType;
  ancNumber?: number;
  scheduledWeek?: number;
  symptomIds: string[];
  notes: string;
  labs?: VisitLabs;
  labStatus?: "pending";
  emergencySummary?: string;
  treatment?: string;
  followUpPlan?: string;
}): Promise<Visit> {
  // Local classification, unchanged — used below to decide whether to
  // attempt the (see KNOWN GAP comment below) referral escalation, and by
  // the lab-push block's labStatus check.
  const riskLevel = data.type === "emergency" ? "red" : classifyRiskLevel(data.symptomIds);

  let visit = await createVisitApi(data.pregnancyId, {
    type: data.type,
    ancNumber: data.ancNumber,
    scheduledWeek: data.scheduledWeek,
    symptomIds: data.symptomIds,
    notes: data.notes,
    labs: data.labs,
    emergencySummary: data.emergencySummary,
  });

  // The backend only accepts treatment/followUpPlan via /finalize, not on
  // create — the Assessment Wizard's non-lab path (labStatus undefined)
  // collects them at create time, so finalize immediately to preserve that
  // one-call UX. The lab-pending path never has them yet (finalize happens
  // later, out of this slice's scope — see finalize-assessment-blocker.tsx).
  if (data.labStatus !== "pending" && (data.treatment || data.followUpPlan)) {
    visit = await finalizeVisitApi(visit.id, data.treatment ?? "", data.followUpPlan ?? "");
  }

  await queryClient.invalidateQueries({ queryKey: ["visits", "pregnancy", data.pregnancyId] });

  if (data.labStatus === "pending") {
    await createLabRequestApi(visit.id, data.type === "emergency" ? "Emergency" : "Normal", data.notes);
  }

  // KNOWN GAP (pre-existing since the 2026-07-22 patients/pregnancies slice,
  // found during Slice C's verification, not introduced here): same cause as
  // the lab-push block above — getPregnanciesSnapshot() never holds a real
  // (API-created) pregnancy, so `pregnancy` is always undefined here and this
  // RED-classification -> emergency-referral escalation never actually runs.
  // Silently dead for every visit, not just ones migrated by this slice.
  // Deferred to a future Referrals integration slice alongside gaps 1-3.
  if (riskLevel === "red") {
    const pregnancy = getPregnanciesSnapshot().find((p) => p.id === data.pregnancyId);
    if (pregnancy) {
      const reason =
        data.type === "emergency"
          ? (data.emergencySummary ?? data.notes)
          : `Classified RED during ${data.type} visit`;
      getOrCreateEmergencyReferral(pregnancy.patientId, reason);
    }
  }

  return visit;
}

export async function createPregnancy(
  data: Omit<Pregnancy, "id" | "pregnancyNumber" | "eddDate" | "status" | "createdAt" | "delivery">,
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

export async function createEmergencyVisit(
  patientId: string,
  dangerSignIds: string[],
  summary: string,
): Promise<{ pregnancy: Pregnancy; visit: Visit; referral: Referral }> {
  // Was a KNOWN PRE-EXISTING BUG (documented during Slice C's verification):
  // this used to read getPregnanciesSnapshot(), the old local-storage system,
  // which never held real (API-created) pregnancies since Slice B — so
  // `existingOpen` was always undefined for a patient with a real active
  // pregnancy, and this always fell through to creating a duplicate
  // pregnancy, which the backend correctly 409s on. Fixed here (Slice E) by
  // reading the real pregnancy data instead, since fixing this is required
  // for this slice's own goal (the Emergency Danger-Sign panel no longer
  // 409ing) to actually work end-to-end.
  const existingOpen = (await fetchPregnanciesForPatient(patientId)).find(
    (p) => p.status === "open",
  );

  let pregnancy: Pregnancy;
  if (existingOpen) {
    pregnancy = existingOpen;
  } else {
    const today = new Date().toISOString().slice(0, 10);
    pregnancy = await createPregnancy({
      patientId,
      gravidity: 1,
      parity: 0,
      previousCS: 0,
      previousPPH: false,
      previousEclampsia: false,
      previousStillbirth: false,
      lmpDate: today,
      startDate: today,
    });
  }

  const visit = await recordVisit({
    pregnancyId: pregnancy.id,
    type: "emergency",
    symptomIds: dangerSignIds,
    notes: summary,
    emergencySummary: summary,
  });

  const referral = await getOrCreateEmergencyReferral(patientId, summary);

  return { pregnancy, visit, referral };
}

export async function updatePatient(
  patientId: string,
  updates: Partial<Omit<Patient, "id" | "registeredAt" | "registeredBy" | "registrationFacility">>,
): Promise<void> {
  await updatePatientApi(patientId, updates);
  await queryClient.invalidateQueries({ queryKey: ["patients"] });
}

export function useAcknowledgedAlerts(): AcknowledgedAlert[] {
  return useSyncExternalStore(
    subscribeToAcknowledged,
    getAcknowledgedSnapshot,
    getServerAcknowledgedSnapshot,
  );
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

export function acknowledgeAlert(patientId: string, note: string): void {
  storageAcknowledgeAlert(patientId, note);
}

export interface NotificationAlert {
  id: string; // visitId
  type:
    | "lab_request"
    | "lab_completed"
    | "referral_pending"
    | "referral_accepted"
    | "recommendation_open"
    | "recommendation_responded"
    | "risk_pregnancy"
    | "critical_lab_result"
    | "emergency_arrival"
    | "facility_full"
    | "new_followup_assignment";
  patientId: string;
  patientName: string;
  title: string;
  message: string;
  date: string;
  priority: "Normal" | "Urgent" | "Emergency";
}

export function useNotificationAlerts(role: string): NotificationAlert[] {
  const visits = useVisits();
  const patients = usePatients();
  const pregnancies = usePregnancies();
  const referrals = useReferrals();
  const recommendations = useSyncExternalStore(
    subscribeToRecommendations,
    getRecommendationsSnapshot,
    getServerRecommendationsSnapshot,
  );
  const currentUser = getCurrentUserSnapshot();
  const followUpAssignments = useFollowUpAssignmentsForChw();

  return useMemo(() => {
    const alerts: NotificationAlert[] = [];
    const pregnancyIdMap = new Map(pregnancies.map((p) => [p.id, p]));
    const today = new Date().toISOString().slice(0, 10);

    for (const v of visits) {
      const preg = pregnancyIdMap.get(v.pregnancyId);
      if (!preg) continue;
      const patient = patients.find((p) => p.id === preg.patientId);
      if (!patient) continue;

      const patientName = `${patient.firstName} ${patient.lastName}`;

      if (
        role === "nurse" &&
        v.hospital === currentUser.facility &&
        v.labStatus === "completed" &&
        v.assessmentFinalized === false
      ) {
        let hbStr = "";
        if (v.labs?.hemoglobin != null) {
          hbStr = ` (Hb: ${v.labs.hemoglobin} g/dL)`;
        }
        alerts.push({
          id: v.id,
          type: "lab_completed",
          patientId: patient.id,
          patientName,
          title: "Laboratory Results Completed",
          message: `Lab investigations resolved for ${patientName}${hbStr}. Action required: Review and finalize ANC assessment.`,
          date: v.date,
          priority: v.type === "emergency" ? "Emergency" : "Normal",
        });
      } else if (role === "lab_nurse" && v.hospital === currentUser.facility && v.labStatus === "pending") {
        alerts.push({
          id: v.id,
          type: "lab_request",
          patientId: patient.id,
          patientName,
          title: "New Lab Request Submitted",
          message: `Attending nurse ${v.attendingNurse} requested a lab screen for ${patientName}.`,
          date: v.date,
          priority: v.type === "emergency" ? "Emergency" : "Normal",
        });
      }

      if (role === "gynecologist" && v.hospital === currentUser.facility) {
        const labs = v.labs;
        const isCritical =
          (labs?.hemoglobin != null && labs.hemoglobin < 7) ||
          (labs?.bpSystolic != null && labs.bpSystolic >= 160) ||
          (labs?.bpDiastolic != null && labs.bpDiastolic >= 110) ||
          (labs?.urineProtein != null && ["2+", "3+"].includes(labs.urineProtein));
        if (isCritical && v.labStatus === "completed" && v.assessmentFinalized === false) {
          alerts.push({
            id: `critical-lab-${v.id}`,
            type: "critical_lab_result",
            patientId: patient.id,
            patientName,
            title: "Critical Laboratory Result",
            message: `${patientName} has a critical lab finding at your facility — review before the ANC assessment is finalized.`,
            date: v.date,
            priority: "Emergency",
          });
        }

        if (v.type === "emergency" && v.date === today) {
          alerts.push({
            id: `emergency-arrival-${v.id}`,
            type: "emergency_arrival",
            patientId: patient.id,
            patientName,
            title: "Emergency Patient Arrival",
            message: `${patientName} was flagged as an emergency at your facility today.`,
            date: v.date,
            priority: "Emergency",
          });
        }
      }
    }

    if (role === "gynecologist") {
      const recommendedPatientIds = new Set(recommendations.map((r) => r.patientId));
      for (const patient of patients) {
        const latestVisit = latestVisitFor(patient.id, pregnancies, visits);
        if (!latestVisit || latestVisit.hospital !== currentUser.facility) continue;
        if (recommendedPatientIds.has(patient.id)) continue;
        if (latestVisit.riskLevel !== "orange" && latestVisit.riskLevel !== "yellow") continue;
        alerts.push({
          id: `risk-pregnancy-${patient.id}`,
          type: "risk_pregnancy",
          patientId: patient.id,
          patientName: `${patient.firstName} ${patient.lastName}`,
          title: latestVisit.riskLevel === "orange" ? "New Orange-Risk Pregnancy" : "New Yellow-Risk Pregnancy",
          message: `${patient.firstName} ${patient.lastName} was classified ${latestVisit.riskLevel} at your facility and has no specialist recommendation yet.`,
          date: latestVisit.date,
          priority: latestVisit.riskLevel === "orange" ? "Urgent" : "Normal",
        });
      }
    }

    if (role === "gynecologist") {
      for (const referral of referrals) {
        if (referral.urgency !== "emergency") continue;
        const patient = patients.find((p) => p.id === referral.patientId);
        if (!patient) continue;
        const patientName = `${patient.firstName} ${patient.lastName}`;

        if (referral.status === "pending" && referral.referredByFacility !== currentUser.facility) {
          alerts.push({
            id: `referral-pending-${referral.id}`,
            type: "referral_pending",
            patientId: patient.id,
            patientName,
            title: "New Emergency Referral",
            message: `${referral.referredByFacility} referred ${patientName} — ${referral.reason}`,
            date: referral.createdAt.slice(0, 10),
            priority: "Emergency",
          });
        } else if (
          referral.status === "accepted" &&
          referral.acceptedByFacility === currentUser.facility &&
          referral.acceptedByNurse !== currentUser.name
        ) {
          alerts.push({
            id: `referral-accepted-${referral.id}`,
            type: "referral_accepted",
            patientId: patient.id,
            patientName,
            title: "Emergency Case Accepted",
            message: `${referral.acceptedByNurse} accepted the emergency referral for ${patientName} at your facility.`,
            date: (referral.acceptedAt ?? referral.createdAt).slice(0, 10),
            priority: "Emergency",
          });
        }
      }
    }

    if (role === "nurse") {
      for (const rec of recommendations) {
        if (rec.status !== "open") continue;
        const patient = patients.find((p) => p.id === rec.patientId);
        if (!patient) continue;
        alerts.push({
          id: `recommendation-open-${rec.id}`,
          type: "recommendation_open",
          patientId: patient.id,
          patientName: `${patient.firstName} ${patient.lastName}`,
          title: "New Specialist Recommendation",
          message: `${rec.createdByGynecologist} left a note for ${patient.firstName} ${patient.lastName}.`,
          date: rec.createdAt.slice(0, 10),
          priority: "Urgent",
        });
      }
    }

    if (role === "gynecologist") {
      for (const rec of recommendations) {
        if (
          rec.status === "responded" &&
          !rec.acknowledgedByGynecologistAt &&
          rec.createdByGynecologist === currentUser.name
        ) {
          const patient = patients.find((p) => p.id === rec.patientId);
          if (!patient) continue;
          alerts.push({
            id: `recommendation-responded-${rec.id}`,
            type: "recommendation_responded",
            patientId: patient.id,
            patientName: `${patient.firstName} ${patient.lastName}`,
            title: "Nurse Responded to Your Recommendation",
            message: `${rec.respondedByNurse} responded regarding ${patient.firstName} ${patient.lastName}.`,
            date: (rec.respondedAt ?? rec.createdAt).slice(0, 10),
            priority: "Normal",
          });
        }
      }
    }

    if (role === "hospital_admin" && currentUser.facility in FACILITY_CAPACITY) {
      const facilityCapacity = getFacilityCapacitySnapshot(currentUser.facility, referrals);
      if (facilityCapacity.status === "full") {
        alerts.push({
          id: `facility-full-${currentUser.facility}`,
          type: "facility_full",
          patientId: "",
          patientName: currentUser.facility,
          title: "Hospital at Full Emergency Capacity",
          message: `${currentUser.facility} has ${facilityCapacity.active}/${facilityCapacity.max} active emergency cases — no new referrals can be accepted until one closes.`,
          date: new Date().toISOString().slice(0, 10),
          priority: "Emergency",
        });
      }
    }

    if (role === "chw") {
      for (const assignment of followUpAssignments) {
        if (assignment.status !== "pending") continue;
        const patient = patients.find((p) => p.id === assignment.patientId);
        if (!patient) continue;
        const patientName = `${patient.firstName} ${patient.lastName}`;
        alerts.push({
          id: `followup-assignment-${assignment.id}`,
          type: "new_followup_assignment",
          patientId: patient.id,
          patientName,
          title: "New Follow-up Assignment",
          message: `${assignment.assignedByName} assigned ${patientName} for ${FOLLOW_UP_REASON_LABELS[assignment.reason]} — due ${assignment.dueDate}.`,
          date: assignment.createdAt.slice(0, 10),
          priority: assignment.priority === "high" ? "Urgent" : "Normal",
        });
      }
    }

    // Sort by priority (Emergency first) and then by date (descending)
    return alerts.sort((a, b) => {
      if (a.priority === "Emergency" && b.priority !== "Emergency") return -1;
      if (a.priority !== "Emergency" && b.priority === "Emergency") return 1;
      return b.date.localeCompare(a.date);
    });
  }, [visits, patients, pregnancies, referrals, recommendations, followUpAssignments, role, currentUser.facility, currentUser.name, currentUser.id]);
}

