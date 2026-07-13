import { fullName, computeAge } from "@/lib/format";
import type { Patient } from "@/lib/patients/types";

export function PatientDetailsTab({ patient }: { patient: Patient }) {
  const fields = [
    { label: "National ID", value: patient.nationalId },
    { label: "Full name", value: fullName(patient) },
    { label: "Date of birth", value: patient.dateOfBirth },
    { label: "Age", value: `${computeAge(patient.dateOfBirth)} years` },
    { label: "Phone", value: patient.phone },
    { label: "Alternative phone", value: patient.altPhone || "—" },
    { label: "Marital status", value: patient.maritalStatus || "—" },
    {
      label: "Address",
      value: [patient.address.district, patient.address.sector, patient.address.cell, patient.address.village]
        .filter(Boolean)
        .join(" / ") || "—",
    },
    {
      label: "Emergency contact",
      value: `${patient.emergencyContact.name} — ${patient.emergencyContact.relationship} — ${patient.emergencyContact.phone}`,
    },
    { label: "Blood group", value: patient.bloodGroup || "—" },
    { label: "Rh factor", value: patient.rhFactor || "—" },
    { label: "Allergies", value: patient.allergies || "—" },
    { label: "Chronic conditions", value: patient.chronicConditions?.join(", ") || "—" },
    { label: "Registered on", value: patient.registeredAt },
    { label: "Registered by", value: patient.registeredBy },
    { label: "Registration facility", value: patient.registrationFacility },
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
