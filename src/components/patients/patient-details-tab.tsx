import { fullName, computeAge } from "@/lib/format";
import { IconUsers, IconAlert, IconClipboard } from "@/components/dashboard/icons";
import type { Patient } from "@/lib/patients/types";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-medium text-zinc-900 dark:text-zinc-50">
        {value}
      </dd>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center gap-2.5 border-b border-zinc-200 bg-[#ffeedb] px-4 py-3 dark:border-zinc-800 dark:bg-orange-950/40">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-teal-700 dark:bg-zinc-900 dark:text-teal-400">
          {icon}
        </span>
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
      </div>
      <dl className="grid gap-4 bg-white p-4 sm:grid-cols-2 dark:bg-zinc-900">
        {children}
      </dl>
    </div>
  );
}

export function PatientDetailsTab({ patient }: { patient: Patient }) {
  return (
    <div className="flex flex-col gap-4">
      <Section icon={<IconUsers className="h-4 w-4" />} title="Personal Information">
        <Field label="National ID" value={patient.nationalId} />
        <Field label="Full name" value={fullName(patient)} />
        <Field label="Date of birth" value={patient.dateOfBirth} />
        <Field label="Age" value={`${computeAge(patient.dateOfBirth)} years`} />
        <Field label="Phone" value={patient.phone} />
        <Field label="Alternative phone" value={patient.altPhone || "—"} />
        <Field label="Marital status" value={patient.maritalStatus || "—"} />
      </Section>

      <Section icon={<IconUsers className="h-4 w-4" />} title="Address">
        <div className="sm:col-span-2">
          <Field
            label="Location"
            value={
              [
                patient.address.district,
                patient.address.sector,
                patient.address.cell,
                patient.address.village,
              ]
                .filter(Boolean)
                .join(" / ") || "—"
            }
          />
        </div>
      </Section>

      <Section icon={<IconAlert className="h-4 w-4" />} title="Emergency Contact">
        <Field label="Name" value={patient.emergencyContact.name} />
        <Field label="Relationship" value={patient.emergencyContact.relationship} />
        <div className="sm:col-span-2">
          <Field label="Phone" value={patient.emergencyContact.phone} />
        </div>
      </Section>

      <Section icon={<IconAlert className="h-4 w-4" />} title="Basic Medical Information">
        <Field label="Blood group" value={patient.bloodGroup || "—"} />
        <Field label="Rh factor" value={patient.rhFactor || "—"} />
        <Field label="Allergies" value={patient.allergies || "—"} />
        <Field
          label="Chronic conditions"
          value={patient.chronicConditions?.join(", ") || "—"}
        />
      </Section>

      <Section icon={<IconClipboard className="h-4 w-4" />} title="Registration">
        <Field label="Registered on" value={patient.registeredAt} />
        <Field label="Registered by" value={patient.registeredBy} />
        <div className="sm:col-span-2">
          <Field label="Registration facility" value={patient.registrationFacility} />
        </div>
      </Section>
    </div>
  );
}
