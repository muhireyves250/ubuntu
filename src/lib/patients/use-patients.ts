"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  addPatient,
  addReferral,
  addVisit,
  getPatientsSnapshot,
  getReferralsSnapshot,
  getServerPatientsSnapshot,
  getServerReferralsSnapshot,
  getServerVisitsSnapshot,
  getVisitsSnapshot,
  subscribeToPatients,
  subscribeToReferrals,
  subscribeToVisits,
} from "./storage";
import { classifyRiskLevel } from "./symptom-checklist";
import type { Patient, Referral, RiskLevel, Visit } from "./types";

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

export function useVisitsForPatient(patientId: string): Visit[] {
  const visits = useVisits();
  return useMemo(
    () =>
      visits
        .filter((visit) => visit.patientId === patientId)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [visits, patientId],
  );
}

export function useLatestRiskLevel(patientId: string): RiskLevel {
  const visits = useVisitsForPatient(patientId);
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

export function acceptReferral(patientId: string): Referral {
  const referral: Referral = {
    id: `referral-${crypto.randomUUID()}`,
    patientId,
    acceptedAt: new Date().toISOString(),
    status: "active",
  };
  addReferral(referral);
  return referral;
}

export interface FollowUpPatient {
  patient: Patient;
  latestRiskLevel: RiskLevel;
  reason: "high-risk" | "overdue";
}

export function useFollowUpPatients(): FollowUpPatient[] {
  const patients = usePatients();
  const visits = useVisits();

  return useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 14);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const results: FollowUpPatient[] = [];

    for (const patient of patients) {
      const patientVisits = visits
        .filter((v) => v.patientId === patient.id)
        .sort((a, b) => b.date.localeCompare(a.date));

      const latestVisit = patientVisits[0];
      const latestRiskLevel: RiskLevel = latestVisit?.riskLevel ?? "green";

      if (latestRiskLevel === "yellow" || latestRiskLevel === "orange") {
        results.push({ patient, latestRiskLevel, reason: "high-risk" });
      } else if (latestVisit && latestVisit.date < cutoffStr) {
        results.push({ patient, latestRiskLevel, reason: "overdue" });
      }
    }

    return results;
  }, [patients, visits]);
}

export interface TodaysVisit {
  visit: Visit;
  patient: Patient | undefined;
}

export function useTodaysVisits(): TodaysVisit[] {
  const visits = useVisits();
  const patients = usePatients();

  return useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return visits
      .filter((v) => v.date === today)
      .map((visit) => ({
        visit,
        patient: patients.find((p) => p.id === visit.patientId),
      }));
  }, [visits, patients]);
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

  return useMemo(() => {
    const counts: Record<RiskLevel, number> = {
      green: 0,
      yellow: 0,
      orange: 0,
      red: 0,
    };

    for (const patient of patients) {
      const latestVisit = visits
        .filter((visit) => visit.patientId === patient.id)
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      counts[latestVisit?.riskLevel ?? "green"] += 1;
    }

    const totalPatients = patients.length;
    const highRiskRate =
      totalPatients === 0
        ? 0
        : Math.round(((counts.red + counts.orange) / totalPatients) * 100);

    return { totalPatients, totalVisits: visits.length, counts, highRiskRate };
  }, [patients, visits]);
}

export function registerPatient(
  data: Omit<Patient, "id" | "registeredAt">,
): Patient {
  const patient: Patient = {
    ...data,
    id: `patient-${crypto.randomUUID()}`,
    registeredAt: new Date().toISOString().slice(0, 10),
  };
  addPatient(patient);
  return patient;
}

export function recordVisit(data: {
  patientId: string;
  date: string;
  symptomIds: string[];
  notes: string;
}): Visit {
  const visit: Visit = {
    id: `visit-${crypto.randomUUID()}`,
    patientId: data.patientId,
    date: data.date,
    symptomIds: data.symptomIds,
    notes: data.notes,
    riskLevel: classifyRiskLevel(data.symptomIds),
  };
  addVisit(visit);
  return visit;
}
