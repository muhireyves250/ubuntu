import type { Role } from "./types";

export const ROLE_DASHBOARD_PATH: Record<Role, string> = {
  nurse: "/dashboard/nurse",
  lab_nurse: "/dashboard/lab",
};

export const ROLE_LABEL: Record<Role, string> = {
  nurse: "Nurse (ANC)",
  lab_nurse: "Laboratory Nurse",
};

export function dashboardPathForRole(role: Role): string {
  return ROLE_DASHBOARD_PATH[role];
}

export function canAccessDashboardPath(role: Role, path: string): boolean {
  return dashboardPathForRole(role) === path;
}
