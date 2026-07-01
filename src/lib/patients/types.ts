export type RiskLevel = "green" | "yellow" | "orange" | "red";

export interface Patient {
  id: string;
  name: string;
  age: number;
  gestationalAgeWeeks: number;
  facility: string;
  registeredAt: string;
  obstetricHistory: string;
  medicalHistory: string;
}

export interface VisitLabs {
  bpSystolic?: number;
  bpDiastolic?: number;
  hemoglobin?: number;
  platelets?: number;
  bloodSugar?: number;
  urineProtein?: "negative" | "trace" | "1+" | "2+" | "3+";
  fetalHeartRate?: number;
  temperature?: number;
  pulse?: number;
  fundalHeight?: number;
  weight?: number;
  edema?: "none" | "mild" | "moderate" | "severe";
}

export interface Visit {
  id: string;
  patientId: string;
  date: string;
  symptomIds: string[];
  riskLevel: RiskLevel;
  notes: string;
  labs?: VisitLabs;
}

export interface Referral {
  id: string;
  patientId: string;
  acceptedAt: string;
  status: "active";
  receivingFacility?: string;
  reason?: string;
  urgency?: "routine" | "urgent" | "emergency";
}

export interface Pregnancy {
  id: string;
  patientId: string;
  gravidity: number;
  parity: number;
  previousCS: number;
  previousPPH: boolean;
  previousEclampsia: boolean;
  previousStillbirth: boolean;
  lmpDate: string; // ISO date, e.g. "2026-01-15"
  eddDate: string; // ISO date, computed = lmpDate + 280 days
  status: "active";
  createdAt: string; // ISO datetime
}

export interface AncVisit {
  id: string;
  pregnancyId: string;
  date: string; // ISO date
  ancNumber: number; // 1, 2, 3, ...
  provider: string;
  notes: string;
}
