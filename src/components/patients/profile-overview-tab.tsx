"use client";

import { useEffect, useState } from "react";
import { RiskBadge } from "@/components/patients/risk-badge";
import { SYMPTOM_CHECKLIST } from "@/lib/patients/symptom-checklist";
import { formatLabs, fullName, computeAge, relativeTime } from "@/lib/format";
import { gestationalAgeWeeks, nextDueVisit } from "@/lib/patients/pregnancy";
import {
  IconUsers,
  IconCalendar,
  IconReport,
  IconClipboard,
  IconAlert,
} from "@/components/dashboard/icons";
import type { Patient, Visit, Pregnancy, RiskLevel } from "@/lib/patients/types";

const SYMPTOM_LABEL = new Map(SYMPTOM_CHECKLIST.map((s) => [s.id, s.label]));

const RISK_HERO_STYLES: Record<RiskLevel, string> = {
  green: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/50",
  yellow: "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-900/50",
  orange: "bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-900/50",
  red: "bg-red-50 border-red-300 dark:bg-red-950/20 dark:border-red-900/50",
};

const RISK_GUIDANCE: Record<RiskLevel, string> = {
  green: "No concerns detected — continue routine antenatal care.",
  yellow: "Elevated risk. Keep a closer eye on the next visit.",
  orange: "Urgent risk factors present. Prompt follow-up recommended.",
  red: "Obstetric emergency. Immediate attention required.",
};

function fmt(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-zinc-400">{label}</dt>
      <dd className="font-medium text-zinc-900 dark:text-zinc-50">{value}</dd>
    </div>
  );
}

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 shadow-sm dark:border-zinc-800">
      <div className="flex items-center gap-2.5 border-b border-zinc-200 bg-[#ffeedb] px-4 py-3 dark:border-zinc-800 dark:bg-orange-950/40">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-teal-700 dark:bg-zinc-900 dark:text-teal-400">
          {icon}
        </span>
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
      </div>
      <div className="bg-white p-4 dark:bg-zinc-900">{children}</div>
    </div>
  );
}

function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="animate-pulse rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
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
  const pregnancyVisits = pregnancy
    ? visits.filter((v) => v.pregnancyId === pregnancy.id)
    : [];
  const ancVisitCount = pregnancyVisits.filter((v) => v.type !== "emergency").length;
  const due = pregnancy ? nextDueVisit(pregnancy, pregnancyVisits) : null;

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
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Here&apos;s today&apos;s snapshot for <span className="font-medium text-zinc-700 dark:text-zinc-300">{patient.firstName}</span>.
      </p>

      {/* Risk hero */}
      <div
        className={`flex flex-col items-center gap-2 rounded-2xl border p-6 text-center ${RISK_HERO_STYLES[currentRisk]}`}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Current Risk Level
        </p>
        <RiskBadge level={currentRisk} size="lg" />
        <p className="max-w-xs text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {RISK_GUIDANCE[currentRisk]}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {latestVisit
            ? `Last assessed ${relativeTime(latestVisit.date)} · ${latestVisit.date}`
            : "No assessments yet"}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Demographics */}
        <SectionCard icon={<IconUsers className="h-4 w-4" />} title="Demographics">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <Field label="Full name" value={fullName(patient)} />
            <Field label="Age" value={`${computeAge(patient.dateOfBirth)} years`} />
            <Field
              label="Gestational age"
              value={gaWeeks !== null ? `${gaWeeks} weeks` : "—"}
            />
            <Field label="Current hospital" value={latestVisit?.hospital ?? "Not yet seen"} />
            <Field
              label="Current assigned nurse"
              value={latestVisit?.attendingNurse ?? "Not yet seen"}
            />
            <Field label="Registered" value={patient.registeredAt} />
          </dl>
        </SectionCard>

        {/* Active pregnancy */}
        <SectionCard icon={<IconCalendar className="h-4 w-4" />} title="Active Pregnancy">
          {pregnancy ? (
            <div className="flex flex-col gap-3">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <Field label="Gestational age" value={`${gaWeeks} weeks`} />
                <Field label="EDD" value={fmt(pregnancy.eddDate)} />
                <Field label="Obstetric" value={`G${pregnancy.gravidity} P${pregnancy.parity}`} />
                <Field
                  label="ANC visits"
                  value={`${ancVisitCount} visit${ancVisitCount !== 1 ? "s" : ""} recorded`}
                />
              </dl>
              <div
                className={`rounded-lg px-3 py-2 text-xs font-medium ${
                  due?.overdue
                    ? "bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400"
                    : "bg-teal-50 text-teal-800 dark:bg-teal-950/30 dark:text-teal-400"
                }`}
              >
                {due
                  ? `Next ANC visit due: Week ${due.week}${due.overdue ? " (overdue)" : ""}`
                  : "All scheduled ANC visits are up to date."}
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-400">No active pregnancy on record.</p>
          )}
        </SectionCard>

        {/* Latest assessment */}
        <SectionCard icon={<IconReport className="h-4 w-4" />} title="Latest Assessment">
          {latestVisit ? (
            <div className="flex flex-col gap-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">
                  {latestVisit.date} · {relativeTime(latestVisit.date)}
                </span>
                <RiskBadge level={latestVisit.riskLevel} size="sm" />
              </div>
              <Field label="Symptoms" value={topSymptoms} />
              <Field label="Labs" value={formatLabs(latestVisit)} />
            </div>
          ) : (
            <p className="text-sm text-zinc-400">No assessments recorded yet.</p>
          )}
        </SectionCard>
      </div>

      {/* Quick actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => onAction("New Assessment")}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#0f766e] px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-800"
        >
          <IconClipboard className="h-4 w-4" />
          New Assessment
        </button>
        <button
          type="button"
          onClick={() => onAction("Visit History")}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-zinc-300 px-3 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          <IconCalendar className="h-4 w-4" />
          View History
        </button>
        <button
          type="button"
          disabled
          title="Coming soon"
          className="flex flex-1 cursor-not-allowed items-center justify-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-2.5 text-sm font-medium text-zinc-400 dark:border-zinc-800 dark:text-zinc-600"
        >
          <IconAlert className="h-4 w-4" />
          New Referral
        </button>
      </div>
    </div>
  );
}
