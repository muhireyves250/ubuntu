"use client";

import { use } from "react";
import { RoleGuard } from "@/components/role-guard";
import { ChwPatientView } from "@/components/dashboard/chw/chw-patient-view";

export default function ChwPatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RoleGuard roles={["chw"]}>
      <ChwPatientView patientId={id} />
    </RoleGuard>
  );
}
