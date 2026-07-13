"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  addPatient,
  addReferral,
  addVisit,
  addPregnancy,
  updatePatient as storageUpdatePatient,
  updatePregnancy as storageUpdatePregnancy,
  getPatientsSnapshot,
  getReferralsSnapshot,
  getServerPatientsSnapshot,
  getServerReferralsSnapshot,
  getServerVisitsSnapshot,
  getServerPregnanciesSnapshot,
  getVisitsSnapshot,
  getPregnanciesSnapshot,
  subscribeToPatients,
  subscribeToReferrals,
  subscribeToVisits,
  subscribeToPregnancies,
} from "./storage";
import {
  subscribeToAcknowledged,
  getAcknowledgedSnapshot,
  getServerAcknowledgedSnapshot,
  acknowledgeAlert as storageAcknowledgeAlert,
  type AcknowledgedAlert,
} from "./alerts-storage";
import { classifyRiskLevel } from "./symptom-checklist";
import { computeEdd } from "./pregnancy";
import { findDemoUserById } from "../auth/demo-users";
import type {
  Patient,
  Referral,
  RiskLevel,
  Visit,
  VisitLabs,
  VisitType,
  Pregnancy,
} from "./types";

const SESSION_STORAGE_KEY = "ubuntumed.session";

function getCurrentUserSnapshot(): { name: string; facility: string } {
  const sessionUserId =
    typeof window !== "undefined"
      ? window.localStorage.getItem(SESSION_STORAGE_KEY)
      : null;
  const user = sessionUserId ? findDemoUserById(sessionUserId) : null;
  return { name: user?.name ?? "Unknown", facility: user?.facility ?? "Unknown facility" };
}

export function usePatients(): Patient[] {
  return useSyncExternalStore(
    subscribeToPatients,
    getPatientsSnapshot,
    getServerPatientsSnapshot,
  );
}

export function useVisits(): Visit[] {
  return useSyncExternalStore(
    subscribeToVisits,
    getVisitsSnapshot,
    getServerVisitsSnapshot,
  );
}

export function usePatient(patientId: string): Patient | undefined {
  const patients = usePatients();
  return useMemo(
    () => patients.find((patient) => patient.id === patientId),
    [patients, patientId],
  );
}

export function usePregnancies(): Pregnancy[] {
  return useSyncExternalStore(
    subscribeToPregnancies,
    getPregnanciesSnapshot,
    getServerPregnanciesSnapshot,
  );
}

export function usePregnanciesForPatient(patientId: string): Pregnancy[] {
  const pregnancies = usePregnancies();
  return useMemo(
    () =>
      pregnancies
        .filter((p) => p.patientId === patientId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [pregnancies, patientId],
  );
}

export function useVisitsForPregnancy(pregnancyId: string): Visit[] {
  const visits = useVisits();
  return useMemo(
    () =>
      visits
        .filter((v) => v.pregnancyId === pregnancyId)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [visits, pregnancyId],
  );
}

export function useAllVisitsForPatient(patientId: string): Visit[] {
  const pregnancies = usePregnanciesForPatient(patientId);
  const visits = useVisits();
  return useMemo(() => {
    const pregnancyIds = new Set(pregnancies.map((p) => p.id));
    return visits
      .filter((v) => pregnancyIds.has(v.pregnancyId))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [pregnancies, visits]);
}

export function useLatestRiskLevel(patientId: string): RiskLevel {
  const visits = useAllVisitsForPatient(patientId);
  return visits[0]?.riskLevel ?? "green";
}

export function useReferrals(): Referral[] {
  return useSyncExternalStore(
    subscribeToReferrals,
    getReferralsSnapshot,
    getServerReferralsSnapshot,
  );
}

export function useActiveReferrals(): Referral[] {
  const referrals = useReferrals();
  return useMemo(
    () => referrals.filter((r) => r.status === "active"),
    [referrals],
  );
}

export function acceptReferral(
  patientId: string,
  extra?: Partial<Omit<Referral, "id" | "patientId" | "acceptedAt" | "status">>,
): Referral {
  const referral: Referral = {
    id: `referral-${crypto.randomUUID()}`,
    patientId,
    acceptedAt: new Date().toISOString(),
    status: "active",
    ...extra,
  };
  addReferral(referral);
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
    .sort((a, b) => b.date.localeCompare(a.date))[0];
}

export function useFollowUpPatients(): FollowUpPatient[] {
  const patients = usePatients();
  const visits = useVisits();
  const pregnancies = usePregnancies();

  return useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 14);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const results: FollowUpPatient[] = [];

    for (const patient of patients) {
      const latestVisit = latestVisitFor(patient.id, pregnancies, visits);
      const latestRiskLevel: RiskLevel = latestVisit?.riskLevel ?? "green";

      if (latestRiskLevel === "yellow" || latestRiskLevel === "orange") {
        results.push({ patient, latestRiskLevel, reason: "high-risk" });
      } else if (latestVisit && latestVisit.date < cutoffStr) {
        results.push({ patient, latestRiskLevel, reason: "overdue" });
      }
    }

    return results;
  }, [patients, visits, pregnancies]);
}

export interface TodaysVisit {
  visit: Visit;
  patient: Patient | undefined;
}

export function useTodaysVisits(): TodaysVisit[] {
  const visits = useVisits();
  const patients = usePatients();
  const pregnancies = usePregnancies();

  return useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const patientIdByPregnancyId = new Map(pregnancies.map((p) => [p.id, p.patientId]));
    return visits
      .filter((v) => v.date === today)
      .map((visit) => ({
        visit,
        patient: patients.find(
          (p) => p.id === patientIdByPregnancyId.get(visit.pregnancyId),
        ),
      }));
  }, [visits, patients, pregnancies]);
}

export interface RiskSummary {
  totalPatients: number;
  totalVisits: number;
  counts: Record<RiskLevel, number>;
  highRiskRate: number; // percentage of patients currently red or orange
}

export function useRiskSummary(): RiskSummary {
  const patients = usePatients();
  const visits = useVisits();
  const pregnancies = usePregnancies();

  return useMemo(() => {
    const counts: Record<RiskLevel, number> = {
      green: 0,
      yellow: 0,
      orange: 0,
      red: 0,
    };

    for (const patient of patients) {
      const latestVisit = latestVisitFor(patient.id, pregnancies, visits);
      counts[latestVisit?.riskLevel ?? "green"] += 1;
    }

    const totalPatients = patients.length;
    const highRiskRate =
      totalPatients === 0
        ? 0
        : Math.round(((counts.red + counts.orange) / totalPatients) * 100);

    return { totalPatients, totalVisits: visits.length, counts, highRiskRate };
  }, [patients, visits, pregnancies]);
}

export function registerPatient(
  data: Omit<Patient, "id" | "registeredAt" | "registeredBy" | "registrationFacility">,
): Patient {
  const { name, facility } = getCurrentUserSnapshot();
  const patient: Patient = {
    ...data,
    id: `patient-${crypto.randomUUID()}`,
    registeredAt: new Date().toISOString().slice(0, 10),
    registeredBy: name,
    registrationFacility: facility,
  };
  addPatient(patient);
  return patient;
}

export function recordVisit(data: {
  pregnancyId: string;
  type: VisitType;
  ancNumber?: number;
  scheduledWeek?: number;
  symptomIds: string[];
  notes: string;
  labs?: VisitLabs;
  emergencySummary?: string;
}): Visit {
  const { name, facility } = getCurrentUserSnapshot();
  const visit: Visit = {
    id: `visit-${crypto.randomUUID()}`,
    pregnancyId: data.pregnancyId,
    date: new Date().toISOString().slice(0, 10),
    type: data.type,
    ancNumber: data.ancNumber,
    scheduledWeek: data.scheduledWeek,
    hospital: facility,
    attendingNurse: name,
    symptomIds: data.symptomIds,
    notes: data.notes,
    riskLevel: data.type === "emergency" ? "red" : classifyRiskLevel(data.symptomIds),
    labs: data.labs,
    emergencySummary: data.emergencySummary,
  };
  addVisit(visit);
  return visit;
}

export function createPregnancy(
  data: Omit<Pregnancy, "id" | "pregnancyNumber" | "eddDate" | "status" | "createdAt" | "delivery">,
): Pregnancy {
  const existingForPatient = getPregnanciesSnapshot().filter(
    (pregnancy) => pregnancy.patientId === data.patientId,
  );
  if (existingForPatient.some((p) => p.status === "open")) {
    throw new Error("Patient already has an open pregnancy");
  }

  const pregnancy: Pregnancy = {
    ...data,
    id: `pregnancy-${crypto.randomUUID()}`,
    pregnancyNumber: existingForPatient.length + 1,
    eddDate: computeEdd(data.lmpDate),
    status: "open",
    createdAt: new Date().toISOString(),
  };
  addPregnancy(pregnancy);
  return pregnancy;
}

export function closePregnancy(
  pregnancyId: string,
  delivery: NonNullable<Pregnancy["delivery"]>,
): void {
  storageUpdatePregnancy(pregnancyId, { status: "closed", delivery });
}

export function createEmergencyVisit(
  patientId: string,
  dangerSignIds: string[],
  summary: string,
): { pregnancy: Pregnancy; visit: Visit; referral: Referral } {
  const existingOpen = getPregnanciesSnapshot().find(
    (p) => p.patientId === patientId && p.status === "open",
  );

  let pregnancy: Pregnancy;
  if (existingOpen) {
    pregnancy = existingOpen;
  } else {
    const today = new Date().toISOString().slice(0, 10);
    pregnancy = createPregnancy({
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

  const visit = recordVisit({
    pregnancyId: pregnancy.id,
    type: "emergency",
    symptomIds: dangerSignIds,
    notes: summary,
    emergencySummary: summary,
  });

  const referral = acceptReferral(patientId, { urgency: "emergency", reason: summary });

  return { pregnancy, visit, referral };
}

export function updatePatient(
  patientId: string,
  updates: Partial<Omit<Patient, "id" | "registeredAt" | "registeredBy" | "registrationFacility">>,
): void {
  storageUpdatePatient(patientId, updates);
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
