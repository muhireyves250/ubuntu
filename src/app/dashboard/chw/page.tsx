import { RoleGuard } from "@/components/role-guard";
import { ChwDashboardContent } from "@/components/dashboard/chw/chw-dashboard-content";

export default function ChwDashboardPage() {
  return (
    <RoleGuard roles={["chw"]}>
      <ChwDashboardContent />
    </RoleGuard>
  );
}
