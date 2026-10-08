"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePatients, useVisits, usePregnancies, useActiveEmergencyPatientIds } from "@/lib/patients/use-patients";
import { RiskBadge } from "@/components/patients/risk-badge";
import { getInitials, shortId, fullName } from "@/lib/format";
import { IconSearch, IconClose } from "./icons";

const MAX_RESULTS = 6;

// "bar" is the inline search field (sm+); "icon" is the phone trigger plus
// its full-width overlay (below sm), rendered inside the Topbar's
// notifications/profile pill.
export function PatientSearch({ variant }: { variant: "bar" | "icon" }) {
  const router = useRouter();
  const patients = usePatients();
  const visits = useVisits();
  const pregnancies = usePregnancies();
  const activeEmergencyPatientIds = useActiveEmergencyPatientIds();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const patientIdByPregnancyId = useMemo(
    () => new Map(pregnancies.map((p) => [p.id, p.patientId])),
    [pregnancies],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];

    return patients
      .filter(
        (patient) =>
          shortId(patient.id).toLowerCase().includes(q) ||
          (patient.phone ?? "").toLowerCase().includes(q),
      )
      .slice(0, MAX_RESULTS)
      .map((patient) => {
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
        const latestRisk =
          emergencySince && !hasNewerTreatmentVisit ? "red" : (latestVisit?.riskLevel ?? "green");
        return { patient, latestRisk };
      });
  }, [patients, visits, patientIdByPregnancyId, query, activeEmergencyPatientIds]);

  function goToPatient(id: string) {
    setQuery("");
    setIsOpen(false);
    setIsMobileOpen(false);
    router.push(`/dashboard/nurse/patients/${id}`);
  }

  function viewAllResults() {
    setIsOpen(false);
    setIsMobileOpen(false);
    router.push(`/dashboard/nurse/patients?q=${encodeURIComponent(query.trim())}`);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && query.trim().length >= 2) {
      viewAllResults();
    } else if (event.key === "Escape") {
      setIsOpen(false);
    }
  }

  function renderResults() {
    return results.length === 0 ? (
      <p className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">
        No patients found.
      </p>
    ) : (
      results.map(({ patient, latestRisk }) => (
        <button
          key={patient.id}
          type="button"
          onClick={() => goToPatient(patient.id)}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-800 dark:bg-teal-950 dark:text-teal-300">
            {getInitials(fullName(patient))}
          </span>
          <span className="flex-1 text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {fullName(patient)}
          </span>
          <RiskBadge level={latestRisk} size="sm" />
        </button>
      ))
    );
  }

  if (variant === "bar") {
    return (
      <div
        ref={containerRef}
        className="relative hidden flex-1 max-w-sm sm:block"
        onBlur={(event) => {
          if (!containerRef.current?.contains(event.relatedTarget as Node)) {
            setIsOpen(false);
          }
        }}
      >
        <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-50">
          <IconSearch className="h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search by ID or phone…"
            className="w-full bg-transparent outline-none placeholder:text-zinc-400"
          />
        </div>

        {isOpen && query.trim().length >= 2 && (
          <div className="absolute left-0 right-0 z-20 mt-2 max-h-80 overflow-auto rounded-xl border border-zinc-200 bg-white p-1.5 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
            {renderResults()}
            <button
              type="button"
              onClick={viewAllResults}
              className="mt-1 w-full rounded-lg px-2.5 py-2 text-left text-sm font-medium text-teal-700 hover:bg-zinc-50 dark:text-teal-400 dark:hover:bg-zinc-800"
            >
              View all results for &ldquo;{query.trim()}&rdquo;
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Phone trigger — the inline search bar is hidden below sm, so a
          phone-width viewport needs its own way to reach search. */}
      <button
        type="button"
        onClick={() => setIsMobileOpen(true)}
        aria-label="Search patients"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 sm:hidden"
      >
        <IconSearch className="h-4 w-4" />
      </button>

      {isMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 sm:hidden"
          onClick={() => setIsMobileOpen(false)}
        >
          <div
            className="mx-4 mt-4 rounded-2xl bg-white p-3 shadow-lg dark:bg-zinc-900"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-2 rounded-full border border-zinc-200 px-4 py-2.5 text-sm text-zinc-900 dark:border-zinc-700 dark:text-zinc-50">
              <IconSearch className="h-4 w-4 shrink-0 text-zinc-400" />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search by ID or phone…"
                className="w-full bg-transparent outline-none placeholder:text-zinc-400"
              />
              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                aria-label="Close search"
                className="shrink-0 text-zinc-400"
              >
                <IconClose className="h-4 w-4" />
              </button>
            </div>

            {query.trim().length >= 2 && (
              <div className="mt-2 max-h-[60vh] overflow-auto rounded-xl border border-zinc-200 p-1.5 dark:border-zinc-800">
                {renderResults()}
                <button
                  type="button"
                  onClick={viewAllResults}
                  className="mt-1 w-full rounded-lg px-2.5 py-2 text-left text-sm font-medium text-teal-700 hover:bg-zinc-50 dark:text-teal-400 dark:hover:bg-zinc-800"
                >
                  View all results for &ldquo;{query.trim()}&rdquo;
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
