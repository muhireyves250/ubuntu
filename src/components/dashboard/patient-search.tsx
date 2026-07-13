"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePatients, useVisits, usePregnancies } from "@/lib/patients/use-patients";
import { RiskBadge } from "@/components/patients/risk-badge";
import { getInitials, shortId, fullName } from "@/lib/format";
import { IconSearch } from "./icons";

const MAX_RESULTS = 6;

export function PatientSearch() {
  const router = useRouter();
  const patients = usePatients();
  const visits = useVisits();
  const pregnancies = usePregnancies();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
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
          fullName(patient).toLowerCase().includes(q) ||
          shortId(patient.id).toLowerCase().includes(q),
      )
      .slice(0, MAX_RESULTS)
      .map((patient) => {
        const latestVisit = visits
          .filter((visit) => patientIdByPregnancyId.get(visit.pregnancyId) === patient.id)
          .sort((a, b) => b.date.localeCompare(a.date))[0];
        return { patient, latestRisk: latestVisit?.riskLevel ?? "green" };
      });
  }, [patients, visits, patientIdByPregnancyId, query]);

  function goToPatient(id: string) {
    setQuery("");
    setIsOpen(false);
    router.push(`/dashboard/nurse/patients/${id}`);
  }

  function viewAllResults() {
    setIsOpen(false);
    router.push(`/dashboard/nurse/patients?q=${encodeURIComponent(query.trim())}`);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && query.trim().length >= 2) {
      viewAllResults();
    } else if (event.key === "Escape") {
      setIsOpen(false);
    }
  }

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
          placeholder="Search patients, cases…"
          className="w-full bg-transparent outline-none placeholder:text-zinc-400"
        />
      </div>

      {isOpen && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 z-20 mt-2 max-h-80 overflow-auto rounded-xl border border-zinc-200 bg-white p-1.5 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
          {results.length === 0 ? (
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
          )}

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
