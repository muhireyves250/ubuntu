"use client";

import { useAuth } from "@/lib/auth/auth-context";
import { useMaternalCareReport } from "@/lib/reports/reports-api";
import { StatCard } from "@/components/dashboard/stat-card";
import { IconUsers, IconClipboard, IconAlert, IconActivity } from "@/components/dashboard/icons";

export function MaternalCareReport({ days }: { days?: number }) {
  const { user } = useAuth();
  const report = useMaternalCareReport(days);

  if (!user) return null;
  const outcomeCounts = report?.outcomes ?? { liveBirth: 0, stillbirth: 0, maternalDeath: 0 };
  const methodCounts = report?.methods ?? { vaginal: 0, cesarean: 0, assisted: 0 };
  const babyStatusCounts = report?.neonatal ?? { alive: 0, deceased: 0 };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={IconClipboard} value={String(report?.ancVisits ?? 0)} label="ANC visits logged" accentClass="bg-violet-100 text-violet-700" />
        <StatCard icon={IconAlert} value={String(report?.highRiskPregnancies ?? 0)} label="High-risk pregnancies" accentClass="bg-amber-100 text-amber-700" />
        <StatCard icon={IconActivity} value={String(report?.emergencyPregnancies ?? 0)} label="Emergency pregnancies" accentClass="bg-red-100 text-red-700" />
        <StatCard icon={IconUsers} value={String(report?.deliveries ?? 0)} label="Deliveries recorded" accentClass="bg-sky-100 text-sky-700" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Delivery Outcome</p>
          <dl className="flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-zinc-500 dark:text-zinc-400">Live birth</dt><dd className="font-semibold">{outcomeCounts.liveBirth}</dd></div>
            <div className="flex justify-between"><dt className="text-zinc-500 dark:text-zinc-400">Stillbirth</dt><dd className="font-semibold">{outcomeCounts.stillbirth}</dd></div>
            <div className="flex justify-between"><dt className="text-red-600 dark:text-red-400">Maternal death</dt><dd className="font-semibold text-red-600 dark:text-red-400">{outcomeCounts.maternalDeath}</dd></div>
          </dl>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Delivery Method</p>
          <dl className="flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-zinc-500 dark:text-zinc-400">Vaginal</dt><dd className="font-semibold">{methodCounts.vaginal}</dd></div>
            <div className="flex justify-between"><dt className="text-zinc-500 dark:text-zinc-400">Cesarean</dt><dd className="font-semibold">{methodCounts.cesarean}</dd></div>
            <div className="flex justify-between"><dt className="text-zinc-500 dark:text-zinc-400">Assisted</dt><dd className="font-semibold">{methodCounts.assisted}</dd></div>
          </dl>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Neonatal Outcome</p>
          <dl className="flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-zinc-500 dark:text-zinc-400">Alive</dt><dd className="font-semibold">{babyStatusCounts.alive}</dd></div>
            <div className="flex justify-between"><dt className="text-red-600 dark:text-red-400">Deceased</dt><dd className="font-semibold text-red-600 dark:text-red-400">{babyStatusCounts.deceased}</dd></div>
          </dl>
        </div>
      </div>
    </div>
  );
}
