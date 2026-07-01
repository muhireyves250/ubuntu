"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { RoleGuard } from "@/components/role-guard";
import { RiskBadge } from "@/components/patients/risk-badge";
import { usePatients, useVisits } from "@/lib/patients/use-patients";
import { SYMPTOM_CHECKLIST } from "@/lib/patients/symptom-checklist";
import type { RiskLevel } from "@/lib/patients/types";
import { formatLabs, getInitials, shortId } from "@/lib/format";
import { IconSearch } from "@/components/dashboard/icons";

const SYMPTOM_LABEL = new Map(
  SYMPTOM_CHECKLIST.map((symptom) => [symptom.id, symptom.label]),
);

const RISK_FILTERS: { value: "all" | RiskLevel; label: string }[] = [
  { value: "all", label: "All risk levels" },
  { value: "red", label: "Red" },
  { value: "orange", label: "Orange" },
  { value: "yellow", label: "Yellow" },
  { value: "green", label: "Green" },
];

function VisitsPageContent() {
  const patients = usePatients();
  const visits = useVisits();
  const [nameFilter, setNameFilter] = useState("");
  const [riskFilter, setRiskFilter] = useState<"all" | RiskLevel>("all");

  const patientById = useMemo(
    () => new Map(patients.map((patient) => [patient.id, patient])),
    [patients],
  );

  const rows = useMemo(() => {
    return visits
      .map((visit) => ({ visit, patient: patientById.get(visit.patientId) }))
      .filter((row) => row.patient)
      .filter((row) =>
        row.patient!.name.toLowerCase().includes(nameFilter.toLowerCase()),
      )
      .filter((row) => riskFilter === "all" || row.visit.riskLevel === riskFilter)
      .sort((a, b) => b.visit.date.localeCompare(a.visit.date));
  }, [visits, patientById, nameFilter, riskFilter]);

  const hasActiveFilters = nameFilter !== "" || riskFilter !== "all";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-300 bg-[#ffeedb] px-4 py-3 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">
          ANC Visits
        </h2>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {visits.length} visit{visits.length === 1 ? "" : "s"} logged
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-300 bg-[#ffeedb] p-3 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
        <div className="flex min-w-[12rem] flex-1 items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900">
          <IconSearch className="h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={nameFilter}
            onChange={(event) => setNameFilter(event.target.value)}
            placeholder="Patient name"
            className="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-50"
          />
        </div>
        <select
          value={riskFilter}
          onChange={(event) =>
            setRiskFilter(event.target.value as "all" | RiskLevel)
          }
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          {RISK_FILTERS.map((filter) => (
            <option key={filter.value} value={filter.value}>
              {filter.label}
            </option>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              setNameFilter("");
              setRiskFilter("all");
            }}
            className="text-sm font-medium text-teal-700 hover:underline dark:text-teal-400"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-300 bg-[#ffeedb] shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
        <div className="scrollbar-hidden max-h-[32rem] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-zinc-300 bg-[#ffeedb] text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-700 dark:bg-orange-950/40 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Visit Date</th>
                <th className="px-4 py-3">Risk</th>
                <th className="px-4 py-3">Signs &amp; Symptoms</th>
                <th className="px-4 py-3">Labs</th>
                <th className="px-4 py-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {rows.map(({ visit, patient }) => (
                <tr
                  key={visit.id}
                  className="bg-white transition-colors hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/60"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/nurse/patients/${patient!.id}`}
                      className="flex items-center gap-2.5 font-medium text-zinc-900 hover:text-teal-900 dark:text-zinc-50 dark:hover:text-teal-300"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                        {getInitials(patient!.name)}
                      </span>
                      <span>
                        {patient!.name}
                        <span className="ml-2 font-mono text-xs text-zinc-400">
                          {shortId(patient!.id)}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                    {visit.date}
                  </td>
                  <td className="px-4 py-3">
                    <RiskBadge level={visit.riskLevel} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {visit.symptomIds.length > 0
                      ? visit.symptomIds
                          .map((id) => SYMPTOM_LABEL.get(id) ?? id)
                          .join(", ")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {formatLabs(visit)}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {visit.notes || "—"}
                  </td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr className="bg-white dark:bg-zinc-900">
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400"
                  >
                    No visits match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-zinc-300 bg-white px-4 py-2.5 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          <span>
            Showing {rows.length} of {visits.length} visits
          </span>
        </div>
      </div>
    </div>
  );
}

export default function VisitsPage() {
  return (
    <RoleGuard path="/dashboard/nurse">
      <VisitsPageContent />
    </RoleGuard>
  );
}
