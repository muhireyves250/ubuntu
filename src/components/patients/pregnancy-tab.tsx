"use client";

import { useState } from "react";
import {
  usePregnanciesForPatient,
  useVisitsForPregnancy,
  useReferrals,
} from "@/lib/patients/use-patients";
import { gestationalAgeWeeks, effectiveLmpDate } from "@/lib/patients/pregnancy";
import { NewPregnancyModal } from "@/components/patients/pregnancy/new-pregnancy-modal";
import { ClosePregnancyModal } from "@/components/patients/pregnancy/close-pregnancy-modal";
import { PregnancyTimeline } from "@/components/patients/pregnancy/pregnancy-timeline";
import { VisitHistoryTab } from "@/components/patients/visit-history-tab";
import { IconAlert, IconCalendar, IconClipboard, IconClose, IconChevronRight } from "@/components/dashboard/icons";
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
  const weeks = gestationalAgeWeeks(effectiveLmpDate(pregnancy));
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

const DELIVERY_OUTCOME_BADGE: Record<string, string> = {
  "live-birth": "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
  stillbirth: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  "maternal-death": "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400",
};

function PastPregnancyRow({
  pregnancy,
  selected,
  onSelect,
}: {
  pregnancy: Pregnancy;
  selected: boolean;
  onSelect: () => void;
}) {
  const outcome = pregnancy.delivery?.outcome ?? "live-birth";
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
        selected
          ? "border-teal-400 bg-teal-50 dark:border-teal-700 dark:bg-teal-950/30"
          : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          #{pregnancy.pregnancyNumber}
        </span>
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            Delivered {pregnancy.delivery?.date ?? "—"}
          </p>
          <p className="text-xs text-zinc-400">
            G{pregnancy.gravidity} P{pregnancy.parity} · LMP {pregnancy.lmpDate}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${DELIVERY_OUTCOME_BADGE[outcome]}`}
        >
          {outcome.replace("-", " ")}
        </span>
        <IconChevronRight
          className={`h-4 w-4 text-zinc-400 transition-transform ${selected ? "rotate-90" : ""}`}
        />
      </div>
    </button>
  );
}

const ARCHIVE_TABS = ["Summary", "Visit History", "Timeline"] as const;
type ArchiveTab = (typeof ARCHIVE_TABS)[number];

function ArchivedPregnancyRecord({
  pregnancy,
  onClose,
}: {
  pregnancy: Pregnancy;
  onClose: () => void;
}) {
  const visits = useVisitsForPregnancy(pregnancy.id);
  const referrals = useReferrals().filter((r) => r.patientId === pregnancy.patientId);
  const [tab, setTab] = useState<ArchiveTab>("Summary");

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-300 dark:border-zinc-700">
      <div className="flex items-center justify-between gap-3 bg-zinc-100 px-5 py-3 dark:bg-zinc-800">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
            <IconClipboard className="h-3.5 w-3.5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Archived Pregnancy Record
            </p>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Pregnancy #{pregnancy.pregnancyNumber} — Closed
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-700"
          aria-label="Close archived record"
        >
          <IconClose className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col gap-4 bg-zinc-50 p-4 dark:bg-zinc-950/40">
        <div className="scrollbar-hidden flex w-fit gap-1 overflow-x-auto rounded-full border border-zinc-200 bg-white p-1 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          {ARCHIVE_TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === t
                  ? "bg-zinc-700 text-white shadow-sm dark:bg-zinc-600"
                  : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "Summary" && <PregnancySummaryCard pregnancy={pregnancy} />}
        {tab === "Visit History" && (
          <VisitHistoryTab pregnancy={pregnancy} visits={visits} readOnly />
        )}
        {tab === "Timeline" && <PregnancyTimeline visits={visits} referrals={referrals} readOnly />}
      </div>
    </div>
  );
}

export function PregnancyTab({
  patientId,
  onGoToVisitHistory,
  readOnly = false,
}: {
  patientId: string;
  onGoToVisitHistory: () => void;
  readOnly?: boolean;
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
        <div className="flex flex-col gap-2.5 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2">
            <IconClipboard className="h-4 w-4 text-zinc-400" />
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Past Pregnancies ({closedPregnancies.length})
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {closedPregnancies.map((p) => (
              <PastPregnancyRow
                key={p.id}
                pregnancy={p}
                selected={selectedClosedId === p.id}
                onSelect={() =>
                  setSelectedClosedId(selectedClosedId === p.id ? null : p.id)
                }
              />
            ))}
          </div>
        </div>
      )}

      {selectedClosed && (
        <ArchivedPregnancyRecord
          pregnancy={selectedClosed}
          onClose={() => setSelectedClosedId(null)}
        />
      )}

      {!openPregnancy && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-10 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            This patient has no active pregnancy on record.
          </p>
          {!readOnly && (
            <button
              type="button"
              onClick={() => setShowNewPregnancy(true)}
              className="rounded-lg bg-[#0f766e] px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
            >
              New Pregnancy
            </button>
          )}

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
            {!readOnly && (
              <button
                type="button"
                onClick={() => setShowClosePregnancy(true)}
                className="w-fit rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Close Pregnancy
              </button>
            )}
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
