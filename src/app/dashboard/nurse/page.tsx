import { RoleGuard } from "@/components/role-guard";
import { DashboardOverview } from "@/components/dashboard/overview";

export default function NurseDashboardPage() {
  return (
    <RoleGuard path="/dashboard/nurse">
      <DashboardOverview />
    </RoleGuard>
  );
}
