import type { Role } from "@/lib/auth/types";

export interface RoleOverviewCopy {
  scope: string;
  description: string;
}

export const ROLE_OVERVIEW_COPY: Record<Role, RoleOverviewCopy> = {
  nurse: {
    scope: "ANC & Maternity",
    description:
      "Register patients and record visit signs & symptoms here once the patient module is built.",
  },
  lab_nurse: {
    scope: "Laboratory",
    description:
      "Pending lab requests sent by ANC nurses will appear here for you to fill in.",
  },
  gynecologist: {
    scope: "Specialist Care",
    description:
      "Emergency referrals and high-risk pregnancies at your facility appear here for specialist review.",
  },
  hospital_admin: {
    scope: "Hospital Operations",
    description:
      "Monitor performance, configure emergency capacity, and review records for your facility — read-only for clinical data.",
  },
};
