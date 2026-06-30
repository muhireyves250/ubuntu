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

export interface Visit {
  id: string;
  patientId: string;
  date: string;
  symptomIds: string[];
  riskLevel: RiskLevel;
  notes: string;
}

export interface Referral {
  id: string;
  patientId: string;
  acceptedAt: string;
  status: "active";
}
