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
  hc_head: {
    scope: "Health Center",
    description:
      "Red and orange case notifications for this facility will appear here once the notification module is built.",
  },
  dh_clinical_director: {
    scope: "District Hospital",
    description:
      "Referrals and red/orange case notifications from health centers in this catchment area will appear here.",
  },
  th_gynecologist: {
    scope: "Teaching Hospital",
    description:
      "Red case alerts requiring senior consultant feedback will appear here.",
  },
  central_control: {
    scope: "Central Level",
    description: "National overview of all facility-level cases will appear here.",
  },
  admin: {
    scope: "Central Level",
    description: "National overview of all facility-level cases will appear here.",
  },
};
