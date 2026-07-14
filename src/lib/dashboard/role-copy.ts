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
};
