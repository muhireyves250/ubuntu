import { RoleGuard } from "@/components/role-guard";
import { DashboardOverview } from "@/components/dashboard/overview";

export default function GynecologistDashboardPage() {
  return (
    <RoleGuard roles={["gynecologist"]}>
      <DashboardOverview />
    </RoleGuard>
  );
}
