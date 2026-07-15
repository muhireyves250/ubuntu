"use client";

import { useState } from "react";
import Link from "next/link";
import { RoleGuard } from "@/components/role-guard";
import { RiskBadge } from "@/components/patients/risk-badge";
import { IconAlert } from "@/components/dashboard/icons";
import {
  useFollowUpPatients,
  useAcknowledgedAlerts,
  acknowledgeAlert,
} from "@/lib/patients/use-patients";
import { getInitials, shortId, fullName } from "@/lib/format";

type Filter = "all" | "unacknowledged" | "acknowledged";

function AcknowledgeModal({
  patientName,
  onConfirm,
  onCancel,
}: {
  patientName: string;
  onConfirm: (note: string) => void;
  onCancel: () => void;
}) {
  const [note, setNote] = useState("");
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onCancel}
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-sm rounded-2xl border border-zinc-300 bg-[#ffeedb] p-6 shadow-2xl dark:border-zinc-700 dark:bg-orange-950/40">
        <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
          Acknowledge alert
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Acknowledging follow-up for{" "}
          <span className="font-medium text-zinc-700">{patientName}</span>
        </p>
        <div className="mt-4 rounded-xl border border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Action taken (optional)
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Referred to district hospital, follow-up scheduled…"
              className="resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(note)}
            className="rounded-xl bg-[#0f766e] px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-800"
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
}

function ActiveAlertsContent() {
  const followUps = useFollowUpPatients();
  const acknowledged = useAcknowledgedAlerts();
  const [filter, setFilter] = useState<Filter>("all");
  const [ackTarget, setAckTarget] = useState<string | null>(null);

  const ackMap = new Map(acknowledged.map((a) => [a.patientId, a]));

  const filtered = followUps.filter(({ patient }) => {
    const isAcked = ackMap.has(patient.id);
    if (filter === "unacknowledged") return !isAcked;
    if (filter === "acknowledged") return isAcked;
    return true;
  });

  const unackedCount = followUps.filter((f) => !ackMap.has(f.patient.id)).length;
  const ackedCount = followUps.filter((f) => ackMap.has(f.patient.id)).length;
  const ackTargetPatient = followUps.find((f) => f.patient.id === ackTarget);

  const TABS: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: followUps.length },
    { key: "unacknowledged", label: "Unacknowledged", count: unackedCount },
    { key: "acknowledged", label: "Acknowledged", count: ackedCount },
  ];

  return (
    <div className="flex flex-col gap-5">
      {ackTarget && ackTargetPatient && (
        <AcknowledgeModal
          patientName={fullName(ackTargetPatient.patient)}
          onConfirm={(note) => {
            acknowledgeAlert(ackTarget, note);
            setAckTarget(null);
          }}
          onCancel={() => setAckTarget(null)}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-300 bg-[#ffeedb] px-4 py-3 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">
          Active Alerts
        </h2>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {unackedCount} unacknowledged
        </span>
      </div>

      <div className="flex w-fit gap-1 rounded-full border border-zinc-300 bg-[#ffeedb] p-1 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              filter === tab.key
                ? "bg-[#0f766e] text-white shadow-sm"
                : "text-zinc-600 hover:bg-white/60 dark:text-zinc-300"
            }`}
          >
            {tab.label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                filter === tab.key
                  ? "bg-white/20 text-white"
                  : "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      <div className="rounded-[1.25rem] border border-amber-300 bg-amber-50/60 p-6 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/20">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
            <IconAlert className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-semibold text-amber-900 dark:text-amber-300">
              Follow-up Alerts
            </h2>
            <p className="text-sm text-amber-700/80 dark:text-amber-400/80">
              Patients with elevated risk or no visit in the last 14 days.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          {filtered.length === 0 ? (
            <p className="rounded-xl border border-zinc-300 bg-white p-4 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
              No alerts in this category.
            </p>
          ) : (
            filtered.map(({ patient, latestRiskLevel, reason }) => {
              const ack = ackMap.get(patient.id);
              return (
                <div
                  key={patient.id}
                  className={`flex items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3 dark:bg-zinc-900 ${
                    ack
                      ? "border-emerald-200 dark:border-emerald-900"
                      : "border-zinc-300 dark:border-zinc-700"
                  }`}
                >
                  <Link
                    href={`/dashboard/nurse/patients/${patient.id}`}
                    className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-80"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                      {getInitials(fullName(patient))}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                        {fullName(patient)}
                        <span className="ml-2 font-mono text-xs text-zinc-400">
                          {shortId(patient.id)}
                        </span>
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {ack
                          ? `Acknowledged · ${new Date(ack.acknowledgedAt).toLocaleDateString()}`
                          : reason === "high-risk"
                            ? "High risk — close follow-up"
                            : "No visit in 14 days"}
                      </p>
                    </div>
                  </Link>

                  <div className="flex shrink-0 items-center gap-2">
                    <RiskBadge level={latestRiskLevel} size="sm" />
                    {ack ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Acknowledged
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAckTarget(patient.id)}
                        className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:border-teal-500 hover:text-teal-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                      >
                        Acknowledge
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default function ActiveAlertsPage() {
  return (
    <RoleGuard roles={["nurse"]}>
      <ActiveAlertsContent />
    </RoleGuard>
  );
}
