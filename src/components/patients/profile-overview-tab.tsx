"use client";

import { useEffect, useState } from "react";
import { RiskBadge } from "@/components/patients/risk-badge";
import { SYMPTOM_CHECKLIST } from "@/lib/patients/symptom-checklist";
import { formatLabs, fullName, computeAge } from "@/lib/format";
import { gestationalAgeWeeks } from "@/lib/patients/pregnancy";
import type { Patient, Visit, Pregnancy } from "@/lib/patients/types";

const SYMPTOM_LABEL = new Map(SYMPTOM_CHECKLIST.map((s) => [s.id, s.label]));

function fmt(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
        {title}
      </p>
      {children}
    </div>
  );
}

function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="animate-pulse rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-3 h-3 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-4 rounded bg-zinc-100 dark:bg-zinc-800"
            style={{ width: `${70 + (i % 3) * 10}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function ProfileOverviewTab({
  patient,
  visits,
  pregnancy,
  onAction,
}: {
  patient: Patient;
  visits: Visit[];
  pregnancy: Pregnancy | null;
  onAction: (tab: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(t);
  }, []);

  const latestVisit = visits[0] ?? null;
  const currentRisk = latestVisit?.riskLevel ?? "green";
  const gaWeeks = pregnancy ? gestationalAgeWeeks(pregnancy.lmpDate) : null;
  const ancVisitCount = pregnancy
    ? visits.filter((v) => v.pregnancyId === pregnancy.id && v.type !== "emergency").length
    : 0;

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <SkeletonCard lines={1} />
        <SkeletonCard lines={4} />
        <SkeletonCard lines={3} />
        <SkeletonCard lines={3} />
        <div className="animate-pulse flex gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-9 flex-1 rounded-lg bg-zinc-100 dark:bg-zinc-800"
            />
          ))}
        </div>
      </div>
    );
  }

  const topSymptoms =
    latestVisit && latestVisit.symptomIds.length > 0
      ? latestVisit.symptomIds
          .slice(0, 3)
          .map((id) => SYMPTOM_LABEL.get(id) ?? id)
          .join(", ")
      : "None";

  return (
    <div className="flex flex-col gap-4">
      {/* Risk card */}
      <SectionCard title="Current risk">
        <div className="flex flex-col items-center gap-2 py-2">
          <RiskBadge level={currentRisk} size="lg" />
          <p className="text-xs text-zinc-400">
            {latestVisit
              ? `Last assessed: ${latestVisit.date}`
              : "No assessments yet"}
          </p>
        </div>
      </SectionCard>

      {/* Demographics card */}
      <SectionCard title="Demographics">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <dt className="text-xs text-zinc-400">Full name</dt>
            <dd className="font-medium text-zinc-900 dark:text-zinc-50">
              {fullName(patient)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-400">Age</dt>
            <dd className="font-medium text-zinc-900 dark:text-zinc-50">
              {computeAge(patient.dateOfBirth)} years
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-400">Gestational age</dt>
            <dd className="font-medium text-zinc-900 dark:text-zinc-50">
              {gaWeeks !== null ? `${gaWeeks} weeks` : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-400">Current hospital</dt>
            <dd className="font-medium text-zinc-900 dark:text-zinc-50">
              {latestVisit?.hospital ?? "Not yet seen"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-400">Current assigned nurse</dt>
            <dd className="font-medium text-zinc-900 dark:text-zinc-50">
              {latestVisit?.attendingNurse ?? "Not yet seen"}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs text-zinc-400">Registered</dt>
            <dd className="font-medium text-zinc-900 dark:text-zinc-50">
              {patient.registeredAt}
            </dd>
          </div>
        </dl>
      </SectionCard>

      {/* Active pregnancy card */}
      <SectionCard title="Active pregnancy">
        {pregnancy ? (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <dt className="text-xs text-zinc-400">Gestational age</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                {gaWeeks} weeks
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-400">EDD</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                {fmt(pregnancy.eddDate)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-400">Obstetric</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                G{pregnancy.gravidity} P{pregnancy.parity}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-400">ANC visits</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                {ancVisitCount} visit{ancVisitCount !== 1 ? "s" : ""} recorded
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-zinc-400">No active pregnancy on record.</p>
        )}
      </SectionCard>

      {/* Latest assessment card */}
      <SectionCard title="Latest assessment">
        {latestVisit ? (
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">
                {latestVisit.date}
              </span>
              <RiskBadge level={latestVisit.riskLevel} size="sm" />
            </div>
            <div>
              <span className="text-xs text-zinc-400">Symptoms: </span>
              <span className="text-zinc-700 dark:text-zinc-300">
                {topSymptoms}
              </span>
            </div>
            <div>
              <span className="text-xs text-zinc-400">Labs: </span>
              <span className="text-zinc-700 dark:text-zinc-300">
                {formatLabs(latestVisit)}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-400">No assessments recorded yet.</p>
        )}
      </SectionCard>

      {/* Quick actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => onAction("New Assessment")}
          className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          New Assessment
        </button>
        <button
          type="button"
          onClick={() => onAction("Visit History")}
          className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          View History
        </button>
        <button
          type="button"
          disabled
          title="Coming soon"
          className="flex-1 cursor-not-allowed rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-400 dark:border-zinc-800 dark:text-zinc-600"
        >
          New Referral
        </button>
      </div>
    </div>
  );
}
