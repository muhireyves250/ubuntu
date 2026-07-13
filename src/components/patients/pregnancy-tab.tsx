"use client";

import { useState } from "react";
import {
  usePregnanciesForPatient,
  useVisitsForPregnancy,
  useReferrals,
} from "@/lib/patients/use-patients";
import { gestationalAgeWeeks } from "@/lib/patients/pregnancy";
import { NewPregnancyModal } from "@/components/patients/pregnancy/new-pregnancy-modal";
import { ClosePregnancyModal } from "@/components/patients/pregnancy/close-pregnancy-modal";
import { PregnancyTimeline } from "@/components/patients/pregnancy/pregnancy-timeline";
import { VisitHistoryTab } from "@/components/patients/visit-history-tab";
import type { Pregnancy } from "@/lib/patients/types";

function PregnancySummaryCard({ pregnancy }: { pregnancy: Pregnancy }) {
  const weeks = gestationalAgeWeeks(pregnancy.lmpDate);

  return (
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
        <span className="text-zinc-400">
          {pregnancy.status === "open" ? "Gestational age" : "Delivery date"}
        </span>
        <br />
        <span className="font-medium text-zinc-900 dark:text-zinc-50">
          {pregnancy.status === "open" ? `${weeks} weeks` : pregnancy.delivery?.date}
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
      {pregnancy.status === "closed" && pregnancy.delivery && (
        <div className="sm:col-span-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
          <p>Outcome: {pregnancy.delivery.outcome}</p>
          <p>Method: {pregnancy.delivery.method}</p>
          <p>Baby status: {pregnancy.delivery.babyStatus}</p>
          <p>Birth weight: {pregnancy.delivery.birthWeightKg} kg</p>
          <p>Mother&apos;s condition: {pregnancy.delivery.motherCondition}</p>
          <p>Summary: {pregnancy.delivery.summary}</p>
        </div>
      )}
    </div>
  );
}

function PregnancySection({ pregnancy }: { pregnancy: Pregnancy }) {
  const visits = useVisitsForPregnancy(pregnancy.id);
  const referrals = useReferrals().filter((r) => r.patientId === pregnancy.patientId);

  return (
    <div className="flex flex-col gap-5">
      <PregnancySummaryCard pregnancy={pregnancy} />
      <VisitHistoryTab pregnancy={pregnancy} visits={visits} readOnly />
      <PregnancyTimeline visits={visits} referrals={referrals} />
    </div>
  );
}

export function PregnancyTab({
  patientId,
  onGoToVisitHistory,
}: {
  patientId: string;
  onGoToVisitHistory: () => void;
}) {
  const pregnancies = usePregnanciesForPatient(patientId);
  const openPregnancy = pregnancies.find((p) => p.status === "open");
  const closedPregnancies = pregnancies.filter((p) => p.status === "closed");

  const [showNewPregnancy, setShowNewPregnancy] = useState(false);
  const [showClosePregnancy, setShowClosePregnancy] = useState(false);
  const [selectedClosedId, setSelectedClosedId] = useState<string | null>(null);

  const selectedClosed = closedPregnancies.find((p) => p.id === selectedClosedId) ?? null;

  return (
    <div className="flex flex-col gap-5">
      {closedPregnancies.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Past pregnancies
          </p>
          <div className="flex flex-col gap-1.5">
            {closedPregnancies.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() =>
                  setSelectedClosedId(selectedClosedId === p.id ? null : p.id)
                }
                className="w-fit text-left text-sm text-teal-800 hover:underline dark:text-teal-400"
              >
                Pregnancy #{p.pregnancyNumber} — Closed, delivered {p.delivery?.date}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedClosed && <PregnancySection pregnancy={selectedClosed} />}

      {!openPregnancy && (
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
      )}

      {openPregnancy && (
        <>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onGoToVisitHistory}
              className="w-fit rounded-lg bg-[#0f766e] px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
            >
              Continue to Visit History
            </button>
            <button
              type="button"
              onClick={() => setShowClosePregnancy(true)}
              className="w-fit rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Close Pregnancy
            </button>
          </div>

          <PregnancySection pregnancy={openPregnancy} />

          {showClosePregnancy && (
            <ClosePregnancyModal
              pregnancy={openPregnancy}
              onClose={() => setShowClosePregnancy(false)}
              onClosed={() => setShowClosePregnancy(false)}
            />
          )}
        </>
      )}
    </div>
  );
}
