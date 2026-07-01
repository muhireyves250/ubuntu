import type { Patient } from "@/lib/patients/types";

export function PatientDetailsTab({ patient }: { patient: Patient }) {
  const fields = [
    { label: "Full name", value: patient.name },
    { label: "Age", value: `${patient.age} years` },
    { label: "Gestational age", value: `${patient.gestationalAgeWeeks} weeks` },
    { label: "Facility", value: patient.facility },
    { label: "Registered on", value: patient.registeredAt },
    { label: "Obstetric history", value: patient.obstetricHistory || "—" },
    { label: "Medical history", value: patient.medicalHistory || "—" },
  ];

  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => (
        <div key={field.label}>
          <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            {field.label}
          </dt>
          <dd className="mt-1 text-sm text-zinc-800 dark:text-zinc-200">
            {field.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
