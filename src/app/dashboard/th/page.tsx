import { RoleGuard } from "@/components/role-guard";
import { DashboardOverview } from "@/components/dashboard/overview";

export default function ThDashboardPage() {
  return (
    <RoleGuard path="/dashboard/th">
      <DashboardOverview />
    </RoleGuard>
  );
}
