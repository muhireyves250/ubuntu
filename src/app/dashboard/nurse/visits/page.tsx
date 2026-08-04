"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { RoleGuard } from "@/components/role-guard";
import { useAuth } from "@/lib/auth/auth-context";
import { RiskBadge } from "@/components/patients/risk-badge";
import { usePatients, useVisits, usePregnancies } from "@/lib/patients/use-patients";
import { SYMPTOM_CHECKLIST } from "@/lib/patients/symptom-checklist";
import type { RiskLevel } from "@/lib/patients/types";
import { formatLabs, getInitials, shortId, fullName } from "@/lib/format";
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

const DATE_FILTERS: { value: "today" | "all"; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "all", label: "All" },
];

function VisitsPageContent() {
  const patients = usePatients();
  const visits = useVisits();
  const pregnancies = usePregnancies();
  const [nameFilter, setNameFilter] = useState("");
  const [riskFilter, setRiskFilter] = useState<"all" | RiskLevel>("all");
  const [dateFilter, setDateFilter] = useState<"today" | "all">("today");

  const today = new Date().toISOString().slice(0, 10);
  const todaysCount = visits.filter((v) => v.date === today).length;

  const patientById = useMemo(
    () => new Map(patients.map((patient) => [patient.id, patient])),
    [patients],
  );
  const patientIdByPregnancyId = useMemo(
    () => new Map(pregnancies.map((p) => [p.id, p.patientId])),
    [pregnancies],
  );

  const { user } = useAuth();

  const rows = useMemo(() => {
    return visits
      .filter((visit) => visit.hospital === user?.facility)
      .map((visit) => ({
        visit,
        patient: patientById.get(patientIdByPregnancyId.get(visit.pregnancyId) ?? ""),
      }))
      .filter((row) => row.patient)
      .filter((row) => dateFilter === "all" || row.visit.date === today)
      .filter((row) =>
        fullName(row.patient!).toLowerCase().includes(nameFilter.toLowerCase()),
      )
      .filter((row) => riskFilter === "all" || row.visit.riskLevel === riskFilter)
      .sort((a, b) => b.visit.date.localeCompare(a.visit.date));
  }, [visits, patientById, patientIdByPregnancyId, nameFilter, riskFilter, dateFilter, today, user]);

  const hasActiveFilters = nameFilter !== "" || riskFilter !== "all";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-300 bg-[#ffeedb] px-4 py-3 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">
          ANC Visits
        </h2>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {todaysCount} today · {visits.length} total
        </span>
      </div>

      <div className="flex w-fit gap-1 rounded-full border border-zinc-300 bg-[#ffeedb] p-1 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
        {DATE_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setDateFilter(filter.value)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              dateFilter === filter.value
                ? "bg-[#0f766e] text-white shadow-sm"
                : "text-zinc-600 hover:bg-white/60 dark:text-zinc-300"
            }`}
          >
            {filter.label}
            {filter.value === "today" && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                  dateFilter === "today"
                    ? "bg-white/20 text-white"
                    : "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
                }`}
              >
                {todaysCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-300 bg-[#ffeedb] p-3 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
        <div className="flex min-w-48 flex-1 items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900">
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
        <div className="scrollbar-hidden max-h-128 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-zinc-300 bg-[#ffeedb] text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-700 dark:bg-orange-950/40 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Visit Date</th>
                <th className="px-4 py-3">Risk</th>
                <th className="px-4 py-3">Signs &amp; Symptoms</th>
                <th className="px-4 py-3">Labs</th>
                <th className="px-4 py-3">Hospital</th>
                <th className="px-4 py-3">Nurse</th>
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
                        {getInitials(fullName(patient!))}
                      </span>
                      <span>
                        {fullName(patient!)}
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
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-start gap-1">
                      {visit.labStatus && (
                        <div className="flex flex-wrap gap-1 items-center">
                          <span className={`inline-flex rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            visit.labStatus === "pending" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-400" :
                            visit.labStatus === "in_progress" ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400" :
                            "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-400"
                          }`}>
                            Lab: {visit.labStatus.replace("_", " ")}
                          </span>
                          {visit.hasCriticalLabResults && (
                            <span className="inline-flex rounded-sm bg-red-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-800 dark:bg-red-950 dark:text-red-400">
                              Critical Result
                            </span>
                          )}
                        </div>
                      )}
                      <span className="text-zinc-600 dark:text-zinc-400 max-w-[200px] truncate text-xs whitespace-normal">
                        {formatLabs(visit)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {visit.hospital}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {visit.attendingNurse}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {visit.notes || "—"}
                  </td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr className="bg-white dark:bg-zinc-900">
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400"
                  >
                    {dateFilter === "today" && !hasActiveFilters
                      ? "No visits logged today yet."
                      : "No visits match these filters."}
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
    <RoleGuard roles={["nurse"]}>
      <VisitsPageContent />
    </RoleGuard>
  );
}
