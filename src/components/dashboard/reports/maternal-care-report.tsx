"use client";

import { useAuth } from "@/lib/auth/auth-context";
import { useVisits, usePregnancies } from "@/lib/patients/use-patients";
import { StatCard } from "@/components/dashboard/stat-card";
import { IconUsers, IconClipboard, IconAlert, IconActivity } from "@/components/dashboard/icons";

export function MaternalCareReport({ days }: { days?: number }) {
  const { user } = useAuth();
  const visits = useVisits();
  const pregnancies = usePregnancies();

  if (!user) return null;
  const facility = user.facility;

  const cutoff = days != null ? new Date(new Date().getTime() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) : null;
  const scopedVisits = visits.filter((v) => v.hospital === facility && (!cutoff || v.date >= cutoff));

  const totalAncVisits = scopedVisits.filter((v) => v.type !== "emergency").length;
  const emergencyPatientIds = new Set(scopedVisits.filter((v) => v.type === "emergency").map((v) => v.pregnancyId));
  const patientIdByPregnancyId = new Map(pregnancies.map((p) => [p.id, p.patientId]));

  // Which patients this facility has actually seen — not "every patient in
  // the system," since patients/visits are globally readable but a report
  // must only reflect this admin's own facility.
  const patientIdsAtFacility = new Set(
    visits
      .filter((v) => v.hospital === facility)
      .map((v) => patientIdByPregnancyId.get(v.pregnancyId))
      .filter((id): id is string => !!id),
  );

  const latestVisitByPatient = new Map<string, (typeof visits)[number]>();
  for (const v of visits) {
    if (v.hospital !== facility) continue;
    const patientId = patientIdByPregnancyId.get(v.pregnancyId);
    if (!patientId) continue;
    const existing = latestVisitByPatient.get(patientId);
    if (!existing || v.date > existing.date || (v.date === existing.date && (v.createdAt ?? "") > (existing.createdAt ?? ""))) {
      latestVisitByPatient.set(patientId, v);
    }
  }
  const highRiskCount = [...latestVisitByPatient.values()].filter(
    (v) => v.riskLevel === "orange" || v.riskLevel === "red",
  ).length;

  const facilityPregnancies = pregnancies.filter((p) => patientIdsAtFacility.has(p.patientId));
  const closedWithDelivery = facilityPregnancies.filter((p) => p.status === "closed" && p.delivery);

  const outcomeCounts = { "live-birth": 0, stillbirth: 0, "maternal-death": 0 };
  const methodCounts = { vaginal: 0, cesarean: 0, assisted: 0 };
  const babyStatusCounts = { alive: 0, deceased: 0 };
  for (const p of closedWithDelivery) {
    if (!p.delivery) continue;
    outcomeCounts[p.delivery.outcome] += 1;
    methodCounts[p.delivery.method] += 1;
    babyStatusCounts[p.delivery.babyStatus] += 1;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={IconClipboard} value={String(totalAncVisits)} label="ANC visits logged" accentClass="bg-violet-100 text-violet-700" />
        <StatCard icon={IconAlert} value={String(highRiskCount)} label="High-risk pregnancies" accentClass="bg-amber-100 text-amber-700" />
        <StatCard icon={IconActivity} value={String(emergencyPatientIds.size)} label="Emergency pregnancies" accentClass="bg-red-100 text-red-700" />
        <StatCard icon={IconUsers} value={String(closedWithDelivery.length)} label="Deliveries recorded" accentClass="bg-sky-100 text-sky-700" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Delivery Outcome</p>
          <dl className="flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-zinc-500 dark:text-zinc-400">Live birth</dt><dd className="font-semibold">{outcomeCounts["live-birth"]}</dd></div>
            <div className="flex justify-between"><dt className="text-zinc-500 dark:text-zinc-400">Stillbirth</dt><dd className="font-semibold">{outcomeCounts.stillbirth}</dd></div>
            <div className="flex justify-between"><dt className="text-red-600 dark:text-red-400">Maternal death</dt><dd className="font-semibold text-red-600 dark:text-red-400">{outcomeCounts["maternal-death"]}</dd></div>
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
