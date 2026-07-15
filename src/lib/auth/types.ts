export type Role = "nurse" | "lab_nurse";

export type FacilityLevel = "hc" | "dh" | "th" | "central";

export interface DemoUser {
  id: string;
  name: string;
  title: string;
  facility: string;
  role: Role;
  facilityLevel: FacilityLevel;
  password: string;
}
