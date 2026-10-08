"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { RoleGuard } from "@/components/role-guard";
import { queryClient } from "@/lib/query-client";
import { RiskBadge } from "@/components/patients/risk-badge";
import { RegisterPatientModal } from "@/components/patients/register-patient-modal";
import { useAuth } from "@/lib/auth/auth-context";
import {
  usePatients,
  useVisits,
  usePregnancies,
  useActiveEmergencyPatientIds,
  useIsPatientsListLoading,
} from "@/lib/patients/use-patients";
import { PatientsListSkeleton } from "@/components/patients/patients-list-skeleton";
import { gestationalAgeWeeks, effectiveLmpDate } from "@/lib/patients/pregnancy";
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

type SortKey = "updated" | "name" | "risk";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "updated", label: "Last Updated On" },
  { value: "name", label: "Name (A–Z)" },
  { value: "risk", label: "Highest risk first" },
];

const RISK_RANK: Record<RiskLevel, number> = { red: 0, orange: 1, yellow: 2, green: 3 };

function PatientsPageContent() {
  const router = useRouter();
  const { user } = useAuth();
  const patients = usePatients();
  const visits = useVisits();
  const pregnancies = usePregnancies();
  const activeEmergencyPatientIds = useActiveEmergencyPatientIds();
  const isLoading = useIsPatientsListLoading();
  const searchParams = useSearchParams();
  const [nameFilter, setNameFilter] = useState(() => searchParams.get("q") ?? "");
  const [idFilter, setIdFilter] = useState("");
  const [riskFilter, setRiskFilter] = useState<"all" | RiskLevel>("all");
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [view, setView] = useState<"list" | "cards">("list");
  const [sortKey, setSortKey] = useState<SortKey>("updated");
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function refresh() {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["patients"] }),
        queryClient.invalidateQueries({ queryKey: ["visits", "all"] }),
        queryClient.invalidateQueries({ queryKey: ["pregnancies", "all"] }),
        queryClient.invalidateQueries({ queryKey: ["referrals"] }),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }

  const patientIdByPregnancyId = useMemo(
    () => new Map(pregnancies.map((p) => [p.id, p.patientId])),
    [pregnancies],
  );

  const allRows = useMemo(() => {
    return patients.map((patient) => {
      const patientVisits = visits
        .filter((visit) => patientIdByPregnancyId.get(visit.pregnancyId) === patient.id)
        .sort((a, b) => {
          const dateCompare = b.date.localeCompare(a.date);
          if (dateCompare !== 0) return dateCompare;
          return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
        });
      const latestVisit = patientVisits[0];
      const openPregnancy = pregnancies.find(
        (p) => p.patientId === patient.id && p.status === "open",
      );
      const emergencySince = activeEmergencyPatientIds.get(patient.id);
      const hasNewerTreatmentVisit =
        !!emergencySince && !!latestVisit && (latestVisit.createdAt ?? latestVisit.date) > emergencySince;
      return {
        patient,
        latestRisk:
          emergencySince && !hasNewerTreatmentVisit
            ? ("red" as RiskLevel)
            : patient.riskOverrideLevel
              ? patient.riskOverrideLevel
              : (latestVisit?.riskLevel ?? ("green" as RiskLevel)),
        lastVisitDate: latestVisit?.date,
        hospital: latestVisit?.hospital,
        gaWeeks: openPregnancy ? gestationalAgeWeeks(effectiveLmpDate(openPregnancy)) : null,
      };
    });
  }, [patients, visits, pregnancies, patientIdByPregnancyId, activeEmergencyPatientIds]);

  const rows = useMemo(() => {
    return allRows
      .filter((row) => (row.patient.phone ?? "").toLowerCase().includes(nameFilter.toLowerCase()))
      .filter((row) =>
        (row.patient.nationalId ?? "").toLowerCase().includes(idFilter.toLowerCase()),
      )
      .filter((row) => riskFilter === "all" || row.latestRisk === riskFilter)
      .sort((a, b) => {
        const byName = fullName(a.patient).localeCompare(fullName(b.patient));
        if (sortKey === "name") return byName;
        if (sortKey === "risk") return RISK_RANK[a.latestRisk] - RISK_RANK[b.latestRisk] || byName;
        // "Last updated": most recent visit (or registration, if never seen) first.
        const aUpdated = a.lastVisitDate ?? a.patient.registeredAt;
        const bUpdated = b.lastVisitDate ?? b.patient.registeredAt;
        return bUpdated.localeCompare(aUpdated) || byName;
      });
  }, [allRows, nameFilter, idFilter, riskFilter, sortKey]);

  const hasActiveFilters = nameFilter !== "" || idFilter !== "" || riskFilter !== "all";

  function clearFilters() {
    setNameFilter("");
    setIdFilter("");
    setRiskFilter("all");
  }

  if (isLoading) return <PatientsListSkeleton />;

  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-300 bg-[#ffeedb] px-4 py-3 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">
          Patient List
        </h2>

        <div className="flex items-center gap-2">
          <div
            className="relative"
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node)) setIsViewMenuOpen(false);
            }}
          >
            <button
              type="button"
              onClick={() => setIsViewMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={isViewMenuOpen}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {view === "list" ? "List View" : "Card View"}
              <IconChevronDown className="h-3.5 w-3.5" />
            </button>
            {isViewMenuOpen && (
              <div
                role="menu"
                className="absolute left-0 z-20 mt-1 w-36 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
              >
                {(
                  [
                    { value: "list", label: "List View" },
                    { value: "cards", label: "Card View" },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="menuitemradio"
                    aria-checked={view === option.value}
                    onClick={() => {
                      setView(option.value);
                      setIsViewMenuOpen(false);
                    }}
                    className={`block w-full rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800 ${
                      view === option.value
                        ? "font-semibold text-teal-900 dark:text-teal-300"
                        : "text-zinc-600 dark:text-zinc-300"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            title="Refresh"
            onClick={refresh}
            disabled={isRefreshing}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition-colors hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-800 dark:hover:bg-zinc-800"
          >
            <IconRefresh className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
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

      <div className="flex shrink-0 flex-wrap items-center gap-2 rounded-xl border border-zinc-300 bg-[#ffeedb] p-3 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
        <div className="flex min-w-48 flex-1 items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900">
          <IconSearch className="h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={nameFilter}
            onChange={(event) => setNameFilter(event.target.value)}
            placeholder="Phone number"
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

        <div
          className="relative ml-auto flex items-center gap-2"
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node)) setIsSortMenuOpen(false);
          }}
        >
          <button
            type="button"
            onClick={() => setIsSortMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={isSortMenuOpen}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <IconSort className="h-4 w-4" />
            {SORT_OPTIONS.find((option) => option.value === sortKey)?.label}
          </button>
          {isSortMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
            >
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={sortKey === option.value}
                  onClick={() => {
                    setSortKey(option.value);
                    setIsSortMenuOpen(false);
                  }}
                  className={`block w-full rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800 ${
                    sortKey === option.value
                      ? "font-semibold text-teal-900 dark:text-teal-300"
                      : "text-zinc-600 dark:text-zinc-300"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-zinc-300 bg-[#ffeedb] shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
        {/* Card view: always on phones; on sm+ only when chosen from the view menu. */}
        <div className={`scrollbar-hidden min-h-0 flex-1 overflow-auto p-2 ${view === "cards" ? "" : "sm:hidden"}`}>
          <ul className={view === "cards" ? "grid gap-2 sm:grid-cols-2 xl:grid-cols-3" : "flex flex-col gap-2"}>
            {rows.map(({ patient, latestRisk, lastVisitDate, hospital, gaWeeks }) => (
              <li key={patient.id}>
                <Link
                  href={`/dashboard/nurse/patients/${patient.id}`}
                  className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-3 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                      {getInitials(fullName(patient))}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                        {fullName(patient)}
                      </p>
                      <p className="truncate font-mono text-xs text-zinc-500 dark:text-zinc-400">
                        {patient.nationalId}
                      </p>
                    </div>
                    <RiskBadge level={latestRisk} size="sm" />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                    <span>{computeAge(patient.dateOfBirth)} yrs</span>
                    {gaWeeks !== null && <span>{gaWeeks} wks GA</span>}
                    {hospital && <span className="truncate">{hospital}</span>}
                    {lastVisitDate && (
                      <span className="font-mono tracking-tight">Last visit {lastVisitDate}</span>
                    )}
                  </div>
                </Link>
              </li>
            ))}

            {rows.length === 0 && (
              <li className="px-4 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
                No patients match these filters.
              </li>
            )}
          </ul>
        </div>

        <div className={`scrollbar-hidden hidden min-h-0 flex-1 overflow-auto ${view === "list" ? "sm:block" : ""}`}>
          <table className="w-full border-separate border-spacing-x-0 border-spacing-y-1.5 text-left text-sm">
            <thead className="sticky top-0 z-10 bg-[#ffeedb] text-xs uppercase tracking-wide text-zinc-500 dark:bg-orange-950/40 dark:text-zinc-400">
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
            <tbody>
              {rows.map(({ patient, latestRisk, lastVisitDate, hospital, gaWeeks }) => (
                <tr key={patient.id} className="group">
                  <td className="border-y border-l border-transparent bg-white px-4 py-3 first:rounded-l-lg group-hover:border-zinc-400 dark:bg-zinc-900 dark:group-hover:border-zinc-600">
                    <input type="checkbox" disabled className="h-4 w-4 rounded border-zinc-300" />
                  </td>
                  <td className="border-y border-transparent bg-white px-4 py-3 font-mono text-xs text-zinc-500 group-hover:border-zinc-400 dark:bg-zinc-900 dark:text-zinc-400 dark:group-hover:border-zinc-600">
                    {patient.nationalId}
                  </td>
                  <td className="border-y border-transparent bg-white px-4 py-3 group-hover:border-zinc-400 dark:bg-zinc-900 dark:group-hover:border-zinc-600">
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
                  <td className="border-y border-transparent bg-white px-4 py-3 text-zinc-700 group-hover:border-zinc-400 dark:bg-zinc-900 dark:text-zinc-300 dark:group-hover:border-zinc-600">
                    {hospital ?? "—"}
                  </td>
                  <td className="border-y border-transparent bg-white px-4 py-3 text-zinc-700 group-hover:border-zinc-400 dark:bg-zinc-900 dark:text-zinc-300 dark:group-hover:border-zinc-600">
                    {computeAge(patient.dateOfBirth)}
                  </td>
                  <td className="border-y border-transparent bg-white px-4 py-3 text-zinc-700 group-hover:border-zinc-400 dark:bg-zinc-900 dark:text-zinc-300 dark:group-hover:border-zinc-600">
                    {gaWeeks !== null ? `${gaWeeks} wks` : "—"}
                  </td>
                  <td className="border-y border-transparent bg-white px-4 py-3 text-zinc-700 group-hover:border-zinc-400 dark:bg-zinc-900 dark:text-zinc-300 dark:group-hover:border-zinc-600">
                    {user?.name ?? "—"}
                  </td>
                  <td className="border-y border-transparent bg-white px-4 py-3 group-hover:border-zinc-400 dark:bg-zinc-900 dark:group-hover:border-zinc-600">
                    <RiskBadge level={latestRisk} size="sm" />
                  </td>
                  <td className="border-y border-r border-transparent bg-white px-4 py-3 text-zinc-700 last:rounded-r-lg group-hover:border-zinc-400 dark:bg-zinc-900 dark:text-zinc-300 dark:group-hover:border-zinc-600">
                    {lastVisitDate ?? "—"}
                  </td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="rounded-lg bg-white px-4 py-10 text-center text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400"
                  >
                    No patients match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex shrink-0 items-center justify-between border-t border-zinc-300 px-4 py-2.5 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
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
    <RoleGuard roles={["nurse", "gynecologist", "hospital_admin"]}>
      <PatientsPageContent />
    </RoleGuard>
  );
}
