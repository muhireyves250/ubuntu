"use client";

import {
  IconUsers,
  IconAlert,
  IconClipboard,
  IconReport,
  IconGrid,
} from "@/components/dashboard/icons";
import { usePregnanciesForPatient } from "@/lib/patients/use-patients";
import { effectiveLmpDate, gestationalAgeWeeksAndDays } from "@/lib/patients/pregnancy";
import type { Patient } from "@/lib/patients/types";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
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
  className = "",
  children,
}: {
  icon: React.ReactNode;
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-zinc-200 shadow-sm dark:border-zinc-800 ${className}`}
    >
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

// Consolidates the obstetric-summary block the reference system shows
// alongside patient details (Gravida/Term/Premature/Abortions/Alive
// children/LMP/Parity/EDD/Pregnancy week) — only rendered when there's an
// open pregnancy to summarize. Editing happens through the top "Update
// details" modal, same as every other section here.
function PregnancySummarySection({ patientId }: { patientId: string }) {
  const pregnancies = usePregnanciesForPatient(patientId);
  const openPregnancy = pregnancies.find((p) => p.status === "open");
  if (!openPregnancy) return null;

  const { weeks, days } = gestationalAgeWeeksAndDays(effectiveLmpDate(openPregnancy));

  return (
    <Section icon={<IconReport className="h-4 w-4" />} title="Pregnancy Summary" className="lg:col-span-2">
      <Field label="Gravida" value={openPregnancy.gravidity} />
      <Field label="Parity with alive births" value={openPregnancy.parity} />
      <Field label="Term deliveries" value={openPregnancy.termDeliveries ?? "—"} />
      <Field label="Premature deliveries" value={openPregnancy.prematureDeliveriesCount ?? "—"} />
      <Field label="Number of abortions" value={openPregnancy.numberOfAbortions ?? "—"} />
      <Field label="Alive children" value={openPregnancy.aliveChildren ?? "—"} />
      <Field
        label="Age of last born"
        value={
          openPregnancy.ageOfLastBornYears != null || openPregnancy.monthsOfLastBorn != null
            ? `${openPregnancy.ageOfLastBornYears ?? 0}y ${openPregnancy.monthsOfLastBorn ?? 0}m`
            : "—"
        }
      />
      <Field label="LMP" value={openPregnancy.lmpDate || "—"} />
      <Field label="EDD" value={openPregnancy.eddDate || "—"} />
      <Field label="Pregnancy Week(s)" value={`${weeks} weeks and ${days} day${days === 1 ? "" : "s"}`} />
    </Section>
  );
}

export function PatientDetailsTab({
  patient,
}: {
  patient: Patient;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Section icon={<IconUsers className="h-4 w-4" />} title="Personal Information">
          <Field label="National ID" value={patient.nationalId} />
          <Field label="Gender" value={patient.gender || "—"} />
          <Field label="Date of birth" value={patient.dateOfBirth} />
          <Field label="Phone" value={patient.phone} />
          <Field label="Alternative phone" value={patient.altPhone || "—"} />
          <Field label="Marital status" value={patient.maritalStatus || "—"} />
          <Field label="Religion" value={patient.religion || "—"} />
        </Section>

        <Section icon={<IconGrid className="h-4 w-4" />} title="Patient Residence">
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Location
            </dt>
            <dd className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {[
                patient.address.province,
                patient.address.district,
                patient.address.sector,
                patient.address.cell,
                patient.address.village,
                patient.address.isibo,
              ]
                .filter(Boolean)
                .map((part, i, arr) => (
                  <span key={i} className="flex items-center gap-1.5">
                    <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800 dark:bg-teal-950/30 dark:text-teal-300">
                      {part}
                    </span>
                    {i < arr.length - 1 && (
                      <span className="text-zinc-300 dark:text-zinc-700">/</span>
                    )}
                  </span>
                ))}
            </dd>
          </div>
          <div className="grid grid-cols-3 gap-x-4 gap-y-3 sm:col-span-2">
            <Field label="Province" value={patient.address.province || "—"} />
            <Field label="District" value={patient.address.district || "—"} />
            <Field label="Sector" value={patient.address.sector || "—"} />
            <Field label="Cell" value={patient.address.cell || "—"} />
            <Field label="Village" value={patient.address.village || "—"} />
            <Field label="Isibo" value={patient.address.isibo || "—"} />
          </div>
        </Section>

        <Section icon={<IconAlert className="h-4 w-4" />} title="Emergency Contact">
          <Field label="Name" value={patient.emergencyContact.name} />
          <Field label="Relationship" value={patient.emergencyContact.relationship} />
          <div className="sm:col-span-2">
            <Field label="Phone" value={patient.emergencyContact.phone} />
          </div>
        </Section>

        <Section icon={<IconReport className="h-4 w-4" />} title="Basic Medical Information">
          <Field label="Blood group" value={patient.bloodGroup || "—"} />
          <Field label="Rh factor" value={patient.rhFactor || "—"} />
          <Field label="Allergies" value={patient.allergies || "—"} />
          <Field
            label="Chronic conditions"
            value={patient.chronicConditions?.join(", ") || "—"}
          />
        </Section>

        <Section icon={<IconClipboard className="h-4 w-4" />} title="Insurance">
          <Field label="Insurance type" value={patient.insuranceType || "—"} />
          <Field label="Insurance number" value={patient.insuranceNumber || "—"} />
        </Section>

        <PregnancySummarySection patientId={patient.id} />

        <Section
          icon={<IconClipboard className="h-4 w-4" />}
          title="Registration"
          className="lg:col-span-2"
        >
          <Field label="Registered on" value={patient.registeredAt} />
          <Field label="Registered by" value={patient.registeredBy} />
          <div className="sm:col-span-2">
            <Field label="Registration facility" value={patient.registrationFacility} />
          </div>
        </Section>
      </div>
    </div>
  );
}
