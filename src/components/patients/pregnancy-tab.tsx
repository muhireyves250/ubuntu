"use client";

import { useState } from "react";
import {
  usePregnancyForPatient,
  useAncVisitsForPregnancy,
  useVisitsForPatient,
  useReferrals,
} from "@/lib/patients/use-patients";
import { gestationalAgeWeeks } from "@/lib/patients/pregnancy";
import { NewPregnancyModal } from "@/components/patients/pregnancy/new-pregnancy-modal";
import { AddAncVisitModal } from "@/components/patients/pregnancy/add-anc-visit-modal";
import { PregnancyTimeline } from "@/components/patients/pregnancy/pregnancy-timeline";

export function PregnancyTab({ patientId }: { patientId: string }) {
  const pregnancy = usePregnancyForPatient(patientId);
  const ancVisits = useAncVisitsForPregnancy(pregnancy?.id ?? "");
  const visits = useVisitsForPatient(patientId);
  const referrals = useReferrals().filter((r) => r.patientId === patientId);

  const [showNewPregnancy, setShowNewPregnancy] = useState(false);
  const [showAddVisit, setShowAddVisit] = useState(false);

  if (!pregnancy) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-10 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          This patient has no active pregnancy on record.
        </p>
        <button
          type="button"
          onClick={() => setShowNewPregnancy(true)}
          className="rounded-lg bg-[#0f766e] px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
        >
          New Pregnancy
        </button>

        {showNewPregnancy && (
          <NewPregnancyModal
            patientId={patientId}
            onClose={() => setShowNewPregnancy(false)}
            onCreated={() => setShowNewPregnancy(false)}
          />
        )}
      </div>
    );
  }

  const weeks = gestationalAgeWeeks(pregnancy.lmpDate);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900 sm:grid-cols-2">
        <p>
          <span className="text-zinc-400">Gravidity / Parity</span>
          <br />
          <span className="font-medium text-zinc-900 dark:text-zinc-50">
            G{pregnancy.gravidity} P{pregnancy.parity}
          </span>
        </p>
        <p>
          <span className="text-zinc-400">Previous C-sections</span>
          <br />
          <span className="font-medium text-zinc-900 dark:text-zinc-50">
            {pregnancy.previousCS}
          </span>
        </p>
        <p>
          <span className="text-zinc-400">LMP</span>
          <br />
          <span className="font-medium text-zinc-900 dark:text-zinc-50">
            {pregnancy.lmpDate}
          </span>
        </p>
        <p>
          <span className="text-zinc-400">EDD</span>
          <br />
          <span className="font-medium text-zinc-900 dark:text-zinc-50">
            {pregnancy.eddDate}
          </span>
        </p>
        <p>
          <span className="text-zinc-400">Gestational age</span>
          <br />
          <span className="font-medium text-zinc-900 dark:text-zinc-50">
            {weeks} weeks
          </span>
        </p>
        <div className="flex flex-wrap items-start gap-1.5">
          {pregnancy.previousPPH && (
            <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700 dark:bg-orange-950/30 dark:text-orange-400">
              Previous PPH
            </span>
          )}
          {pregnancy.previousEclampsia && (
            <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700 dark:bg-orange-950/30 dark:text-orange-400">
              Previous eclampsia
            </span>
          )}
          {pregnancy.previousStillbirth && (
            <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700 dark:bg-orange-950/30 dark:text-orange-400">
              Previous stillbirth
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowAddVisit(true)}
        className="w-fit rounded-lg bg-[#0f766e] px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
      >
        Add ANC Visit
      </button>

      <PregnancyTimeline
        pregnancy={pregnancy}
        ancVisits={ancVisits}
        visits={visits}
        referrals={referrals}
      />

      {showAddVisit && (
        <AddAncVisitModal
          pregnancyId={pregnancy.id}
          suggestedAncNumber={ancVisits.length + 1}
          onClose={() => setShowAddVisit(false)}
          onRecorded={() => setShowAddVisit(false)}
        />
      )}
    </div>
  );
}
