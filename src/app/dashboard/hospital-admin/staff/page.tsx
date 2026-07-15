import { RoleGuard } from "@/components/role-guard";
import { StaffManagementContent } from "@/components/dashboard/staff/staff-management-content";

export default function HospitalAdminStaffPage() {
  return (
    <RoleGuard roles={["hospital_admin"]}>
      <StaffManagementContent />
    </RoleGuard>
  );
}
