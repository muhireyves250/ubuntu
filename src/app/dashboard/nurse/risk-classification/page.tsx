"use client";

import { useMemo } from "react";
import Link from "next/link";
import { RoleGuard } from "@/components/role-guard";
import { RiskBadge } from "@/components/patients/risk-badge";
import { usePatients, useVisits } from "@/lib/patients/use-patients";
import { SYMPTOM_CHECKLIST } from "@/lib/patients/symptom-checklist";
import type { Patient, RiskLevel } from "@/lib/patients/types";
import { getInitials, shortId } from "@/lib/format";

const RISK_LEVEL_ORDER: RiskLevel[] = ["red", "orange", "yellow", "green"];

const RISK_LEVEL_META: Record<
  RiskLevel,
  { title: string; description: string; cardClass: string; headingClass: string }
> = {
  red: {
    title: "Red — Emergency",
    description: "Obstetric emergency. Requires immediate referral and acceptance by a receiving facility.",
    cardClass: "border-red-300 bg-red-50/60 dark:border-red-900/50 dark:bg-red-950/20",
    headingClass: "text-red-900 dark:text-red-300",
  },
  orange: {
    title: "Orange — Urgent",
    description: "Urgent condition requiring close monitoring and prompt clinical attention.",
    cardClass: "border-orange-300 bg-orange-50/60 dark:border-orange-900/50 dark:bg-orange-950/20",
    headingClass: "text-orange-900 dark:text-orange-300",
  },
  yellow: {
    title: "Yellow — Close follow-up",
    description: "Elevated risk factors. Requires closer antenatal follow-up than routine care.",
    cardClass: "border-yellow-300 bg-yellow-50/60 dark:border-yellow-900/50 dark:bg-yellow-950/20",
    headingClass: "text-yellow-900 dark:text-yellow-300",
  },
  green: {
    title: "Green — Routine",
    description: "No elevated risk factors identified. Continue routine antenatal care schedule.",
    cardClass: "border-emerald-300 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/20",
    headingClass: "text-emerald-900 dark:text-emerald-300",
  },
};

function RiskClassificationContent() {
  const patients = usePatients();
  const visits = useVisits();

  const symptomsByLevel = useMemo(() => {
    const map = new Map<RiskLevel, string[]>();
    for (const symptom of SYMPTOM_CHECKLIST) {
      const list = map.get(symptom.severity) ?? [];
      list.push(symptom.label);
      map.set(symptom.severity, list);
    }
    return map;
  }, []);

  const patientsByLevel = useMemo(() => {
    const map = new Map<RiskLevel, Patient[]>();
    for (const level of RISK_LEVEL_ORDER) map.set(level, []);

    for (const patient of patients) {
      const latestVisit = visits
        .filter((visit) => visit.patientId === patient.id)
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      const level = latestVisit?.riskLevel ?? "green";
      map.get(level)!.push(patient);
    }
    return map;
  }, [patients, visits]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-300 bg-[#ffeedb] px-4 py-3 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">
          Risk Classification
        </h2>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {patients.length} patient{patients.length === 1 ? "" : "s"} classified
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {RISK_LEVEL_ORDER.map((level) => {
          const meta = RISK_LEVEL_META[level];
          const levelPatients = patientsByLevel.get(level) ?? [];
          const levelSymptoms = symptomsByLevel.get(level) ?? [];

          return (
            <div
              key={level}
              className={`flex flex-col gap-3 rounded-[1.25rem] border p-5 shadow-sm ${meta.cardClass}`}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className={`font-semibold ${meta.headingClass}`}>{meta.title}</h3>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-zinc-700 shadow-sm dark:bg-zinc-900 dark:text-zinc-200">
                  {levelPatients.length}
                </span>
              </div>

              <p className="text-sm text-zinc-600 dark:text-zinc-300">{meta.description}</p>

              {levelSymptoms.length > 0 && (
                <div className="rounded-xl border border-zinc-300 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Triggering criteria
                  </p>
                  <ul className="mt-1.5 flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
                    {levelSymptoms.map((label) => (
                      <li key={label} className="flex items-start gap-1.5">
                        <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-zinc-400" />
                        {label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="rounded-xl border border-zinc-300 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Patients at this level
                </p>
                {levelPatients.length === 0 ? (
                  <p className="mt-1.5 text-sm text-zinc-400">None currently.</p>
                ) : (
                  <ul className="mt-1.5 flex flex-col gap-1.5">
                    {levelPatients.map((patient) => (
                      <li key={patient.id}>
                        <Link
                          href={`/dashboard/nurse/patients/${patient.id}`}
                          className="flex items-center gap-2.5 text-sm font-medium text-zinc-900 hover:text-teal-900 dark:text-zinc-50 dark:hover:text-teal-300"
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                            {getInitials(patient.name)}
                          </span>
                          <span>
                            {patient.name}
                            <span className="ml-2 font-mono text-xs text-zinc-400">
                              {shortId(patient.id)}
                            </span>
                          </span>
                          <RiskBadge level={level} size="sm" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function RiskClassificationPage() {
  return (
    <RoleGuard path="/dashboard/nurse">
      <RiskClassificationContent />
    </RoleGuard>
  );
}
