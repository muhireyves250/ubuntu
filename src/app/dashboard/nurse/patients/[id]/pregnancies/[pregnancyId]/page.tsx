"use client";

import { use } from "react";
import Link from "next/link";
import { RoleGuard } from "@/components/role-guard";
import { PastPregnancyDetail } from "@/components/patients/pregnancy/past-pregnancy-detail";
import { usePatient, usePatientIsLoading, usePregnanciesForPatient } from "@/lib/patients/use-patients";
import { fullName } from "@/lib/format";
import { IconChevronRight } from "@/components/dashboard/icons";

function PregnancyRecordContent({ patientId, pregnancyId }: { patientId: string; pregnancyId: string }) {
  const isLoading = usePatientIsLoading(patientId);
  const patient = usePatient(patientId);
  const pregnancies = usePregnanciesForPatient(patientId);
  const pregnancy = pregnancies.find((p) => p.id === pregnancyId);

  if (isLoading) {
    return <p className="p-6 text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>;
  }

  if (!patient || !pregnancy) {
    return (
      <div className="flex flex-col items-center gap-3 p-10 text-center">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Pregnancy record not found.</p>
        <Link href={`/dashboard/nurse/patients/${patientId}?tab=Medical History`} className="text-teal-700 underline dark:text-teal-400">
          Back to Medical History
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
        <Link
          href={`/dashboard/nurse/patients/${patientId}?tab=Medical History`}
          className="hover:text-teal-700 dark:hover:text-teal-400"
        >
          {fullName(patient)}
        </Link>
        <IconChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-zinc-900 dark:text-zinc-50">
          Pregnancy #{pregnancy.pregnancyNumber}
        </span>
      </div>

      <PastPregnancyDetail pregnancy={pregnancy} />
    </div>
  );
}

export default function PregnancyRecordPage({
  params,
}: {
  params: Promise<{ id: string; pregnancyId: string }>;
}) {
  const { id, pregnancyId } = use(params);

  return (
    <RoleGuard roles={["nurse", "gynecologist", "hospital_admin"]}>
      <PregnancyRecordContent patientId={id} pregnancyId={pregnancyId} />
    </RoleGuard>
  );
}
