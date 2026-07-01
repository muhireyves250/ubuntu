import { RoleGuard } from "@/components/role-guard";
import { DashboardOverview } from "@/components/dashboard/overview";

export default function HcDashboardPage() {
  return (
    <RoleGuard path="/dashboard/hc">
      <DashboardOverview />
    </RoleGuard>
  );
}
