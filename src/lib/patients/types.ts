export type RiskLevel = "green" | "yellow" | "orange" | "red";

export interface Patient {
  id: string;
  nationalId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // ISO date "YYYY-MM-DD"
  phone: string;
  altPhone?: string;
  maritalStatus?: string;
  address: {
    district: string;
    sector: string;
    cell: string;
    village: string;
  };
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  bloodGroup?: string;
  rhFactor?: "positive" | "negative";
  allergies?: string;
  chronicConditions?: string[];
  registeredAt: string; // ISO date
  registeredBy: string;
  registrationFacility: string;
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

export type VisitType = "scheduled" | "unscheduled" | "emergency";

export interface Visit {
  id: string;
  pregnancyId: string;
  date: string;
  type: VisitType;
  ancNumber?: number;
  scheduledWeek?: number;
  hospital: string;
  attendingNurse: string;
  symptomIds: string[];
  riskLevel: RiskLevel;
  notes: string;
  labs?: VisitLabs;
  labStatus?: "pending" | "completed";
  treatment?: string;
  followUpPlan?: string;
  emergencySummary?: string;
}

export type ReferralStatus = "pending" | "accepted" | "closed";
export type ReferralOutcome = "recovered" | "died";

export interface Referral {
  id: string;
  patientId: string;
  createdAt: string;
  status: ReferralStatus;
  receivingFacility: string;
  reason: string;
  urgency: "routine" | "urgent" | "emergency";
  referredByNurse: string;
  referredByFacility: string;
  acceptedAt?: string;
  acceptedByNurse?: string;
  acceptedByFacility?: string;
  closedAt?: string;
  outcome?: ReferralOutcome;
  outcomeStatement?: string;
}

export interface Pregnancy {
  id: string;
  patientId: string;
  pregnancyNumber: number;
  gravidity: number;
  parity: number;
  previousCS: number;
  previousPPH: boolean;
  previousEclampsia: boolean;
  previousStillbirth: boolean;
  lmpDate: string;
  eddDate: string;
  startDate: string;
  status: "open" | "closed";
  createdAt: string; // ISO datetime
  delivery?: {
    outcome: "live-birth" | "stillbirth" | "maternal-death";
    date: string;
    method: "vaginal" | "cesarean" | "assisted";
    babyStatus: "alive" | "deceased";
    birthWeightKg: number;
    motherCondition: string;
    summary: string;
  };
}
