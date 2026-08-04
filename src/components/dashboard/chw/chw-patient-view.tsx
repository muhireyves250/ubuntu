"use client";

import { useState } from "react";
import { notFound } from "next/navigation";
import {
  usePatient,
  usePatientIsLoading,
  usePregnanciesForPatient,
  useFollowUpAssignmentsForPatient,
} from "@/lib/patients/use-patients";
import { gestationalAgeWeeks, effectiveLmpDate } from "@/lib/patients/pregnancy";
import { fullName, getInitials } from "@/lib/format";
import { FOLLOW_UP_REASON_LABELS } from "@/lib/patients/types";
import { CommunityVisitForm } from "@/components/patients/community-visit-form";
import { AncScheduleCalendar } from "@/components/patients/anc-schedule-calendar";

export function ChwPatientView({ patientId }: { patientId: string }) {
  const patient = usePatient(patientId);
  const patientLoading = usePatientIsLoading(patientId);
  const pregnancies = usePregnanciesForPatient(patientId);
  const openPregnancy = pregnancies.find((p) => p.status === "open") ?? null;
  const assignments = useFollowUpAssignmentsForPatient(patientId);
  const [visitSubmitted, setVisitSubmitted] = useState(false);

  if (patientLoading) return null;
  if (!patient) return notFound();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-zinc-300 bg-[#ffeedb] p-5 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xl font-semibold text-teal-800 dark:bg-teal-950 dark:text-teal-300">
          {getInitials(fullName(patient))}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{fullName(patient)}</h2>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            {patient.id} • {patient.address.village}
          </p>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{patient.phone}</p>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Pregnancy</p>
        {openPregnancy ? (
          <>
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              {gestationalAgeWeeks(effectiveLmpDate(openPregnancy))} weeks gestation • EDD {openPregnancy.eddDate}
            </p>
            <div className="mt-3">
              <AncScheduleCalendar pregnancy={openPregnancy} homeVisitsOnly />
            </div>
          </>
        ) : (
          <p className="text-sm text-zinc-400">No active pregnancy on file.</p>
        )}
      </div>

      {openPregnancy && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">Home Visit Report</p>
          {visitSubmitted ? (
            <div className="flex flex-col items-start gap-3 rounded-lg border border-teal-300 bg-teal-50 px-4 py-3 text-sm text-teal-800 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-300">
              <p>Home visit report submitted successfully.</p>
              <button
                type="button"
                onClick={() => setVisitSubmitted(false)}
                className="rounded-lg border border-teal-400 bg-white px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-100 dark:border-teal-700 dark:bg-zinc-900 dark:text-teal-300 dark:hover:bg-teal-950/60"
              >
                Log another visit
              </button>
            </div>
          ) : (
            <CommunityVisitForm
              pregnancy={openPregnancy}
              onSubmitted={() => setVisitSubmitted(true)}
            />
          )}
        </div>
      )}

      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">Follow-up History</p>
        {assignments.length === 0 ? (
          <p className="text-sm text-zinc-400">No follow-up assignments yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {assignments.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">{FOLLOW_UP_REASON_LABELS[a.reason]}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Assigned by {a.assignedByName} • Due {a.dueDate}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    a.status === "completed"
                      ? "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                  }`}
                >
                  {a.status === "completed" ? "Completed" : "Pending"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
