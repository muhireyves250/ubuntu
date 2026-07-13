import type { Role } from "./types";

export const ROLE_DASHBOARD_PATH: Record<Role, string> = {
  nurse: "/dashboard/nurse",
  lab_nurse: "/dashboard/lab",
  hc_head: "/dashboard/hc",
  dh_clinical_director: "/dashboard/dh",
  th_gynecologist: "/dashboard/th",
  central_control: "/dashboard/central",
  admin: "/dashboard/central",
};

export const ROLE_LABEL: Record<Role, string> = {
  nurse: "Nurse (ANC)",
  lab_nurse: "Laboratory Nurse",
  hc_head: "Head of Health Center",
  dh_clinical_director: "District Hospital Clinical Director",
  th_gynecologist: "Teaching Hospital Gynecologist on call",
  central_control: "Central Control Room",
  admin: "Admin",
};

export function dashboardPathForRole(role: Role): string {
  return ROLE_DASHBOARD_PATH[role];
}

export function canAccessDashboardPath(role: Role, path: string): boolean {
  if (role === "admin") return true;
  return dashboardPathForRole(role) === path;
}
