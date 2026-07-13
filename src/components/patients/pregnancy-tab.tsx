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
import { IconAlert, IconCalendar, IconClipboard } from "@/components/dashboard/icons";
import type { Pregnancy } from "@/lib/patients/types";

const FULL_TERM_WEEKS = 40;

function StatChip({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3.5 py-3 dark:border-zinc-800 dark:bg-zinc-900">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
          {label}
        </p>
        <p className="truncate font-semibold text-zinc-900 dark:text-zinc-50">
          {value}
        </p>
      </div>
    </div>
  );
}

function PregnancySummaryCard({ pregnancy }: { pregnancy: Pregnancy }) {
  const weeks = gestationalAgeWeeks(pregnancy.lmpDate);
  const progressPct = Math.min(100, Math.round((weeks / FULL_TERM_WEEKS) * 100));
  const riskFlags = [
    pregnancy.previousPPH && "Previous PPH",
    pregnancy.previousEclampsia && "Previous eclampsia",
    pregnancy.previousStillbirth && "Previous stillbirth",
  ].filter((f): f is string => Boolean(f));

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 shadow-sm dark:border-zinc-800">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 bg-[#ffeedb] px-5 py-3.5 dark:border-zinc-800 dark:bg-orange-950/40">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
          Pregnancy #{pregnancy.pregnancyNumber}
        </h3>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
            pregnancy.status === "open"
              ? "bg-teal-700 text-white"
              : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          }`}
        >
          {pregnancy.status}
        </span>
      </div>

      <div className="flex flex-col gap-4 bg-white p-5 dark:bg-zinc-900">
        {pregnancy.status === "open" && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Week {weeks} of {FULL_TERM_WEEKS}
              </span>
              <span className="text-xs text-zinc-400">
                Due {pregnancy.eddDate}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-teal-600 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        <div className="grid gap-2.5 sm:grid-cols-2">
          <StatChip
            icon={<IconClipboard className="h-4.5 w-4.5" />}
            label="Gravidity / Parity"
            value={`G${pregnancy.gravidity} P${pregnancy.parity}`}
          />
          <StatChip
            icon={<IconAlert className="h-4.5 w-4.5" />}
            label="Previous C-sections"
            value={pregnancy.previousCS}
          />
          <StatChip
            icon={<IconCalendar className="h-4.5 w-4.5" />}
            label="LMP"
            value={pregnancy.lmpDate}
          />
          <StatChip
            icon={<IconCalendar className="h-4.5 w-4.5" />}
            label={pregnancy.status === "open" ? "EDD" : "Delivery date"}
            value={pregnancy.status === "open" ? pregnancy.eddDate : pregnancy.delivery?.date}
          />
        </div>

        {riskFlags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {riskFlags.map((flag) => (
              <span
                key={flag}
                className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700 dark:bg-orange-950/30 dark:text-orange-400"
              >
                <IconAlert className="h-3 w-3" />
                {flag}
              </span>
            ))}
          </div>
        )}

        {pregnancy.status === "closed" && pregnancy.delivery && (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
              Delivery outcome
            </p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <dt className="text-xs text-zinc-400">Outcome</dt>
                <dd className="font-medium capitalize text-zinc-900 dark:text-zinc-50">
                  {pregnancy.delivery.outcome.replace("-", " ")}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-400">Method</dt>
                <dd className="font-medium capitalize text-zinc-900 dark:text-zinc-50">
                  {pregnancy.delivery.method}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-400">Baby status</dt>
                <dd className="font-medium capitalize text-zinc-900 dark:text-zinc-50">
                  {pregnancy.delivery.babyStatus}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-400">Birth weight</dt>
                <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                  {pregnancy.delivery.birthWeightKg} kg
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-zinc-400">Mother&apos;s condition</dt>
                <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                  {pregnancy.delivery.motherCondition}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-zinc-400">Summary</dt>
                <dd className="text-zinc-700 dark:text-zinc-300">
                  {pregnancy.delivery.summary}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}

function PregnancySection({ pregnancy }: { pregnancy: Pregnancy }) {
  const visits = useVisitsForPregnancy(pregnancy.id);
  const referrals = useReferrals().filter((r) => r.patientId === pregnancy.patientId);

  return (
    <div className="flex flex-col gap-5">
      <PregnancySummaryCard pregnancy={pregnancy} />
      {pregnancy.status === "closed" && (
        <VisitHistoryTab pregnancy={pregnancy} visits={visits} readOnly />
      )}
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
