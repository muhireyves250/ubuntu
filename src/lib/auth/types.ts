export type Role = "nurse" | "lab_nurse" | "gynecologist" | "hospital_admin";

export type FacilityLevel = "hc" | "dh" | "th" | "central";

export interface DemoUser {
  id: string;
  username: string;
  name: string;
  title: string;
  facility: string;
  role: Role;
  facilityLevel: FacilityLevel;
  password: string;
}
