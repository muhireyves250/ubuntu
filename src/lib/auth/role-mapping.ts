import type { FacilityLevel, Role } from "./types";

const BACKEND_ROLE_TO_FRONTEND: Record<string, Role> = {
  NURSE: "nurse",
  LAB_TECHNICIAN: "lab_nurse",
  GYNECOLOGIST: "gynecologist",
  HOSPITAL_DIRECTOR: "hospital_admin",
  COMMUNITY_HEALTH_WORKER: "chw",
};

const BACKEND_FACILITY_TYPE_TO_LEVEL: Record<string, FacilityLevel> = {
  PRIMARY: "hc",
  SECONDARY: "dh",
  TERTIARY: "th",
};

const ROLE_TITLE: Record<Role, string> = {
  nurse: "In charge of ANC",
  lab_nurse: "Laboratory Nurse",
  gynecologist: "Gynecologist",
  hospital_admin: "Hospital Administrator",
  chw: "Community Health Worker",
};

export function mapBackendRole(role: string): Role {
  const mapped = BACKEND_ROLE_TO_FRONTEND[role];
  if (!mapped) throw new Error(`Unknown backend role: ${role}`);
  return mapped;
}

export function mapBackendFacilityLevel(facilityType: string): FacilityLevel {
  return BACKEND_FACILITY_TYPE_TO_LEVEL[facilityType] ?? "hc";
}

export function titleForRole(role: Role): string {
  return ROLE_TITLE[role];
}

export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@ubuntumed.rw`;
}
