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

export interface LabTestResult {
  id: string;
  testName: string;
  result: string;
  unit: string;
  referenceRange: string;
  interpretation: "Normal" | "Abnormal" | "Critical";
  comments?: string;
  completedAt?: string;
  completedBy?: string;
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
  labResults?: LabTestResult[];
  labStatus?: "pending" | "in_progress" | "completed";
  hasCriticalLabResults?: boolean;
  acceptedByLabNurse?: string;
  labAcceptedAt?: string;
  treatment?: string;
  followUpPlan?: string;
  emergencySummary?: string;
  assessmentFinalized?: boolean;
  createdAt?: string;
}

export type ReferralStatus = "pending" | "accepted" | "closed";
export type ReferralOutcome =
  | "stable"
  | "improved"
  | "recovered"
  | "admitted"
  | "delivered"
  | "referred"
  | "discharged"
  | "maternal_death"
  | "fetal_death";

export type FacilityCapacityStatus = "available" | "nearly_full" | "full";

export interface FacilityCapacity {
  max: number;
  active: number;
  remaining: number;
  status: FacilityCapacityStatus;
}

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

export type RecommendationStatus = "open" | "responded";

export interface Recommendation {
  id: string;
  patientId: string;
  createdAt: string;
  createdByGynecologist: string;
  createdByFacility: string;
  riskLevelAtCreation: RiskLevel;
  message: string;
  status: RecommendationStatus;
  nurseResponse?: string;
  respondedByNurse?: string;
  respondedAt?: string;
  acknowledgedByGynecologistAt?: string;
}

export type FollowUpReason =
  | "missed_anc"
  | "high_risk_followup"
  | "medication_adherence"
  | "bp_monitoring"
  | "nutrition_counseling"
  | "post_emergency_followup"
  | "general_monitoring";

export const FOLLOW_UP_REASON_LABELS: Record<FollowUpReason, string> = {
  missed_anc: "Missed ANC appointment",
  high_risk_followup: "High-risk pregnancy follow-up",
  medication_adherence: "Medication adherence",
  bp_monitoring: "Blood pressure monitoring",
  nutrition_counseling: "Nutrition counseling",
  post_emergency_followup: "Post-emergency follow-up",
  general_monitoring: "General pregnancy monitoring",
};

export type FollowUpPriority = "routine" | "high";

// "completed" is unreachable in this slice — nothing sets it yet, since the
// visit-completion workflow is a later slice. It's part of the type now so
// that slice doesn't need to touch this file again.
export type FollowUpStatus = "pending" | "completed";

export interface FollowUpAssignment {
  id: string;
  patientId: string;
  createdAt: string; // ISO datetime
  assignedByName: string;
  assignedByRole: "nurse" | "gynecologist";
  facility: string; // the CHW's facility, copied at creation time
  assignedToChwId: string; // DirectoryUser id of the CHW
  reason: FollowUpReason;
  priority: FollowUpPriority;
  dueDate: string; // ISO date "YYYY-MM-DD"
  status: FollowUpStatus;
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
