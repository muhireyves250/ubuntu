export type Role = "nurse" | "lab_nurse" | "gynecologist" | "hospital_admin" | "chw";

export type FacilityLevel = "hc" | "dh" | "th" | "central";

export interface DemoUser {
  id: string;
  username: string;
  name: string;
  title: string;
  facility: string;
  village?: string; // only meaningful for chw — the sub-facility catchment they serve
  role: Role;
  facilityLevel: FacilityLevel;
  password: string;
}
