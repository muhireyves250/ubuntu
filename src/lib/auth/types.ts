export type Role =
  | "nurse"
  | "hc_head"
  | "dh_clinical_director"
  | "th_gynecologist"
  | "central_control"
  | "admin";

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
