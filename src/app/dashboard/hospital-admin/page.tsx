import { RoleGuard } from "@/components/role-guard";
import { DashboardOverview } from "@/components/dashboard/overview";

export default function HospitalAdminDashboardPage() {
  return (
    <RoleGuard roles={["hospital_admin"]}>
      <DashboardOverview />
    </RoleGuard>
  );
}
