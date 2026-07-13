"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { RoleGuard } from "@/components/role-guard";
import { RiskBadge } from "@/components/patients/risk-badge";
import { RegisterPatientModal } from "@/components/patients/register-patient-modal";
import { useAuth } from "@/lib/auth/auth-context";
import { usePatients, useVisits, usePregnancies } from "@/lib/patients/use-patients";
import { gestationalAgeWeeks } from "@/lib/patients/pregnancy";
import type { RiskLevel } from "@/lib/patients/types";
import { getInitials, fullName, computeAge } from "@/lib/format";
import {
  IconChevronDown,
  IconRefresh,
  IconSearch,
  IconSort,
} from "@/components/dashboard/icons";

const RISK_FILTERS: { value: "all" | RiskLevel; label: string }[] = [
  { value: "all", label: "All risk levels" },
  { value: "red", label: "Red" },
  { value: "orange", label: "Orange" },
  { value: "yellow", label: "Yellow" },
  { value: "green", label: "Green" },
];

function PatientsPageContent() {
  const router = useRouter();
  const { user } = useAuth();
  const patients = usePatients();
  const visits = useVisits();
  const pregnancies = usePregnancies();
  const searchParams = useSearchParams();
  const [nameFilter, setNameFilter] = useState(() => searchParams.get("q") ?? "");
  const [idFilter, setIdFilter] = useState("");
  const [riskFilter, setRiskFilter] = useState<"all" | RiskLevel>("all");
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  const patientIdByPregnancyId = useMemo(
    () => new Map(pregnancies.map((p) => [p.id, p.patientId])),
    [pregnancies],
  );

  const allRows = useMemo(() => {
    return patients.map((patient) => {
      const patientVisits = visits
        .filter((visit) => patientIdByPregnancyId.get(visit.pregnancyId) === patient.id)
        .sort((a, b) => b.date.localeCompare(a.date));
      const latestVisit = patientVisits[0];
      const openPregnancy = pregnancies.find(
        (p) => p.patientId === patient.id && p.status === "open",
      );
      return {
        patient,
        latestRisk: latestVisit?.riskLevel ?? ("green" as RiskLevel),
        lastVisitDate: latestVisit?.date,
        hospital: latestVisit?.hospital,
        gaWeeks: openPregnancy ? gestationalAgeWeeks(openPregnancy.lmpDate) : null,
      };
    });
  }, [patients, visits, pregnancies, patientIdByPregnancyId]);

  const rows = useMemo(() => {
    return allRows
      .filter((row) =>
        fullName(row.patient).toLowerCase().includes(nameFilter.toLowerCase()),
      )
      .filter((row) =>
        row.patient.nationalId.toLowerCase().includes(idFilter.toLowerCase()),
      )
      .filter((row) => riskFilter === "all" || row.latestRisk === riskFilter)
      .sort((a, b) => fullName(a.patient).localeCompare(fullName(b.patient)));
  }, [allRows, nameFilter, idFilter, riskFilter]);

  const hasActiveFilters = nameFilter !== "" || idFilter !== "" || riskFilter !== "all";

  function clearFilters() {
    setNameFilter("");
    setIdFilter("");
    setRiskFilter("all");
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-300 bg-[#ffeedb] px-4 py-3 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">
          Patient List
        </h2>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 dark:border-zinc-800 dark:text-zinc-300"
          >
            List View
            <IconChevronDown className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Refresh"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800"
          >
            <IconRefresh className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsRegisterOpen(true)}
            className="rounded-lg bg-teal-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-800"
          >
            + Add Antenatal Care
          </button>
        </div>
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
        <input
          type="text"
          value={idFilter}
          onChange={(event) => setIdFilter(event.target.value)}
          placeholder="ID"
          className="w-28 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
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
            onClick={clearFilters}
            className="text-sm font-medium text-teal-700 hover:underline dark:text-teal-400"
          >
            Clear filters
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            disabled
            className="flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
          >
            <IconSort className="h-4 w-4" />
            Last Updated On
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-300 bg-[#ffeedb] shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
        <div className="scrollbar-hidden max-h-[28rem] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-zinc-300 bg-[#ffeedb] text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-700 dark:bg-orange-950/40 dark:text-zinc-400">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input type="checkbox" disabled className="h-4 w-4 rounded border-zinc-300" />
                </th>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Facility</th>
                <th className="px-4 py-3">Age</th>
                <th className="px-4 py-3">Gestational age</th>
                <th className="px-4 py-3">Practitioner</th>
                <th className="px-4 py-3">Latest risk</th>
                <th className="px-4 py-3">Last visit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {rows.map(({ patient, latestRisk, lastVisitDate, hospital, gaWeeks }) => (
                <tr
                  key={patient.id}
                  className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                >
                  <td className="px-4 py-3">
                    <input type="checkbox" disabled className="h-4 w-4 rounded border-zinc-300" />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                    {patient.nationalId}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/nurse/patients/${patient.id}`}
                      className="flex items-center gap-2.5 font-medium text-zinc-900 hover:text-teal-900 dark:text-zinc-50 dark:hover:text-teal-300"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                        {getInitials(fullName(patient))}
                      </span>
                      {fullName(patient)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                    {hospital ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                    {computeAge(patient.dateOfBirth)}
                  </td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                    {gaWeeks !== null ? `${gaWeeks} wks` : "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                    {user?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <RiskBadge level={latestRisk} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                    {lastVisitDate ?? "—"}
                  </td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400"
                  >
                    No patients match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-zinc-300 px-4 py-2.5 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          <span>
            Showing {rows.length} of {patients.length} patients
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled
              className="rounded-md border border-zinc-200 px-2.5 py-1 font-medium disabled:opacity-50 dark:border-zinc-800"
            >
              Previous
            </button>
            <button
              type="button"
              disabled
              className="rounded-md border border-zinc-200 px-2.5 py-1 font-medium disabled:opacity-50 dark:border-zinc-800"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {isRegisterOpen && (
        <RegisterPatientModal
          onClose={() => setIsRegisterOpen(false)}
          onRegistered={(patient) => {
            setIsRegisterOpen(false);
            router.push(`/dashboard/nurse/patients/${patient.id}`);
          }}
        />
      )}
    </div>
  );
}

export default function PatientsPage() {
  return (
    <RoleGuard path="/dashboard/nurse">
      <PatientsPageContent />
    </RoleGuard>
  );
}
