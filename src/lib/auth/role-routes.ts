import type { Role } from "./types";

export const ROLE_DASHBOARD_PATH: Record<Role, string> = {
  nurse: "/dashboard/nurse",
  lab_nurse: "/dashboard/lab",
  gynecologist: "/dashboard/gynecologist",
  hospital_admin: "/dashboard/hospital-admin",
};

export const ROLE_LABEL: Record<Role, string> = {
  nurse: "Nurse (ANC)",
  lab_nurse: "Laboratory Nurse",
  gynecologist: "Gynecologist",
  hospital_admin: "Hospital Administrator",
};

export function dashboardPathForRole(role: Role): string {
  return ROLE_DASHBOARD_PATH[role];
}
