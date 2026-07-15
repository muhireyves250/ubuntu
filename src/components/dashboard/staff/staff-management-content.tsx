"use client";

import { RegisterStaffForm } from "./register-staff-form";
import { StaffTable } from "./staff-table";

export function StaffManagementContent() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Staff Management</h1>
      <RegisterStaffForm />
      <StaffTable />
    </div>
  );
}
