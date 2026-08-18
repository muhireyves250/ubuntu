"use client";

import { useDiagnosesForVisit } from "@/lib/patients/use-patients";

export function VisitDiagnosisSection({
  visitId,
}: {
  visitId: string;
  readOnly?: boolean;
}) {
  const diagnoses = useDiagnosesForVisit(visitId);

  return (
    <div>
      <span className="font-medium text-zinc-400">Diagnosis: </span>
      {diagnoses.length === 0 ? (
        <span className="text-zinc-400">None recorded</span>
      ) : (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {diagnoses.map((d) => (
            <span
              key={d.id}
              title={d.caseStatus}
              className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800 dark:bg-teal-950/30 dark:text-teal-400"
            >
              {d.code} — {d.title}
              {d.diagnosisType === "Principal" ? "" : ` (${d.diagnosisType})`}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
