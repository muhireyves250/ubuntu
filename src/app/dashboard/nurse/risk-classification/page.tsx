"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { RoleGuard } from "@/components/role-guard";
import { RiskBadge } from "@/components/patients/risk-badge";
import { usePatients, useVisits, usePregnancies, useActiveEmergencyPatientIds } from "@/lib/patients/use-patients";
import { SYMPTOM_CHECKLIST } from "@/lib/patients/symptom-checklist";
import type { Patient, RiskLevel } from "@/lib/patients/types";
import { getInitials, shortId, fullName } from "@/lib/format";

const RISK_LEVEL_ORDER: RiskLevel[] = ["red", "orange", "yellow", "green"];

const LIST_CAP = 5;

// Same 2px risk-coloured row border as the dashboard's Following Module.
const RISK_ROW_BORDER: Record<RiskLevel, string> = {
  green: "border-emerald-200 hover:border-emerald-300 dark:border-emerald-900/60 dark:hover:border-emerald-700",
  yellow: "border-yellow-300 hover:border-yellow-400 dark:border-yellow-900/60 dark:hover:border-yellow-700",
  orange: "border-orange-300 hover:border-orange-400 dark:border-orange-900/60 dark:hover:border-orange-700",
  red: "border-red-300 hover:border-red-400 dark:border-red-900/60 dark:hover:border-red-700",
};

const RISK_DOT: Record<RiskLevel, string> = {
  red: "bg-red-600",
  orange: "bg-orange-500",
  yellow: "bg-yellow-400",
  green: "bg-emerald-500",
};

const RISK_LEVEL_META: Record<
  RiskLevel,
  { title: string; description: string; headingClass: string }
> = {
  red: {
    title: "Red — Emergency",
    description: "Obstetric emergency. Requires immediate referral and acceptance by a receiving facility.",
    headingClass: "text-red-900 dark:text-red-300",
  },
  orange: {
    title: "Orange — Urgent",
    description: "Urgent condition requiring close monitoring and prompt clinical attention.",
    headingClass: "text-orange-900 dark:text-orange-300",
  },
  yellow: {
    title: "Yellow — Close follow-up",
    description: "Elevated risk factors. Requires closer antenatal follow-up than routine care.",
    headingClass: "text-yellow-900 dark:text-yellow-300",
  },
  green: {
    title: "Green — Routine",
    description: "No elevated risk factors identified. Continue routine antenatal care schedule.",
    headingClass: "text-emerald-900 dark:text-emerald-300",
  },
};

function RiskClassificationContent() {
  const patients = usePatients();
  const visits = useVisits();
  const pregnancies = usePregnancies();
  const activeEmergencyPatientIds = useActiveEmergencyPatientIds();
  const [expandedLevels, setExpandedLevels] = useState<Set<RiskLevel>>(new Set());

  function toggleLevel(level: RiskLevel) {
    setExpandedLevels((prev) => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  }

  const patientIdByPregnancyId = useMemo(
    () => new Map(pregnancies.map((p) => [p.id, p.patientId])),
    [pregnancies],
  );

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
        .filter((visit) => patientIdByPregnancyId.get(visit.pregnancyId) === patient.id)
        .sort((a, b) => {
          const dateCompare = b.date.localeCompare(a.date);
          if (dateCompare !== 0) return dateCompare;
          return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
        })[0];
      const emergencySince = activeEmergencyPatientIds.get(patient.id);
      const hasNewerTreatmentVisit =
        !!emergencySince && !!latestVisit && (latestVisit.createdAt ?? latestVisit.date) > emergencySince;
      const level = emergencySince && !hasNewerTreatmentVisit ? "red" : (latestVisit?.riskLevel ?? "green");
      map.get(level)!.push(patient);
    }
    return map;
  }, [patients, visits, patientIdByPregnancyId, activeEmergencyPatientIds]);

  return (
    // Header stays put and only the level cards scroll — same as the
    // Patient Registry.
    <div className="flex h-full min-h-0 flex-col gap-5">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-300 bg-[#ffeedb] px-4 py-3 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">
          Risk Classification
        </h2>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {patients.length} patient{patients.length === 1 ? "" : "s"} classified
        </span>
      </div>

      <div className="scrollbar-hidden grid min-h-0 flex-1 auto-rows-min gap-4 overflow-y-auto sm:grid-cols-2">
        {RISK_LEVEL_ORDER.map((level) => {
          const meta = RISK_LEVEL_META[level];
          const levelPatients = patientsByLevel.get(level) ?? [];
          const levelSymptoms = symptomsByLevel.get(level) ?? [];
          const isExpanded = expandedLevels.has(level);
          const visiblePatients = isExpanded ? levelPatients : levelPatients.slice(0, LIST_CAP);

          return (
            <div
              key={level}
              className="flex min-w-0 flex-col gap-3 rounded-[1.25rem] border border-zinc-300 bg-[#ffeedb] p-5 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className={`flex items-center gap-2 font-semibold ${meta.headingClass}`}>
                  <span aria-hidden className={`h-2.5 w-2.5 shrink-0 rounded-full ${RISK_DOT[level]}`} />
                  {meta.title}
                </h3>
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
                  <ul className="mt-2 flex flex-col gap-2">
                    {visiblePatients.map((patient) => (
                      <li key={patient.id}>
                        <Link
                          href={`/dashboard/nurse/patients/${patient.id}`}
                          className={`flex items-center gap-2.5 rounded-lg border-2 px-3 py-2 text-sm transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800 ${RISK_ROW_BORDER[level]}`}
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                            {getInitials(fullName(patient))}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium leading-snug text-zinc-900 dark:text-zinc-100">
                              {fullName(patient)}
                            </span>
                            <span className="block truncate font-mono text-xs text-zinc-500 dark:text-zinc-400">
                              {patient.nationalId || shortId(patient.id)}
                            </span>
                          </span>
                          <RiskBadge level={level} size="sm" />
                        </Link>
                      </li>
                    ))}
                    {levelPatients.length > LIST_CAP && (
                      <li>
                        <button
                          type="button"
                          onClick={() => toggleLevel(level)}
                          className="px-1 text-left text-xs font-semibold text-teal-700 hover:underline dark:text-teal-400"
                        >
                          {isExpanded ? "Show less" : `+${levelPatients.length - LIST_CAP} more`}
                        </button>
                      </li>
                    )}
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
    <RoleGuard roles={["nurse", "gynecologist", "hospital_admin"]}>
      <RiskClassificationContent />
    </RoleGuard>
  );
}
