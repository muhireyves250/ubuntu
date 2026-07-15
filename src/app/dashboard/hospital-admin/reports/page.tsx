import { RoleGuard } from "@/components/role-guard";
import { ReportsContent } from "@/components/dashboard/reports/reports-content";

export default function HospitalAdminReportsPage() {
  return (
    <RoleGuard roles={["hospital_admin"]}>
      <ReportsContent />
    </RoleGuard>
  );
}
