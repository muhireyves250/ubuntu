"use client";

import { useMemo, useState } from "react";
import { RoleGuard } from "@/components/role-guard";
import {
  useLabQueue,
  usePatients,
  usePregnancies,
} from "@/lib/patients/use-patients";
import { fullName, getInitials, relativeTime } from "@/lib/format";
import { LabResultsModal } from "@/components/dashboard/lab-results-modal";
import { IconSearch } from "@/components/dashboard/icons";

function LabQueueContent() {
  const pendingVisits = useLabQueue();
  const patients = usePatients();
  const pregnancies = usePregnancies();
  const [nameFilter, setNameFilter] = useState("");
  const [targetVisitId, setTargetVisitId] = useState<string | null>(null);

  const patientById = useMemo(
    () => new Map(patients.map((p) => [p.id, p])),
    [patients],
  );
  const patientIdByPregnancyId = useMemo(
    () => new Map(pregnancies.map((p) => [p.id, p.patientId])),
    [pregnancies],
  );

  const rows = useMemo(() => {
    return pendingVisits
      .map((visit) => ({
        visit,
        patient: patientById.get(patientIdByPregnancyId.get(visit.pregnancyId) ?? ""),
      }))
      .filter((row) => row.patient)
      .filter((row) =>
        fullName(row.patient!).toLowerCase().includes(nameFilter.toLowerCase()) ||
        row.patient!.nationalId.toLowerCase().includes(nameFilter.toLowerCase()),
      );
  }, [pendingVisits, patientById, patientIdByPregnancyId, nameFilter]);

  const target = rows.find((row) => row.visit.id === targetVisitId);

  return (
    <div className="flex flex-col gap-5">
      {target && target.patient && (
        <LabResultsModal
          visit={target.visit}
          patientName={fullName(target.patient)}
          onClose={() => setTargetVisitId(null)}
          onCompleted={() => setTargetVisitId(null)}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-300 bg-[#ffeedb] px-4 py-3 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">
          Pending Lab Requests
        </h2>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {pendingVisits.length} pending
        </span>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-zinc-300 bg-[#ffeedb] p-3 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
        <div className="flex min-w-[12rem] flex-1 items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900">
          <IconSearch className="h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            placeholder="Search by patient name or National ID"
            className="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-50"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-300 bg-[#ffeedb] shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
        <div className="scrollbar-hidden max-h-[32rem] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-zinc-300 bg-[#ffeedb] text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-700 dark:bg-orange-950/40 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Visit Date</th>
                <th className="px-4 py-3">Requested</th>
                <th className="px-4 py-3">Hospital</th>
                <th className="px-4 py-3">Requesting Nurse</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {rows.map(({ visit, patient }) => (
                <tr
                  key={visit.id}
                  className="bg-white transition-colors hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/60"
                >
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2.5 font-medium text-zinc-900 dark:text-zinc-50">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                        {getInitials(fullName(patient!))}
                      </span>
                      {fullName(patient!)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{visit.date}</td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                    {relativeTime(visit.date)}
                  </td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{visit.hospital}</td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                    {visit.attendingNurse}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setTargetVisitId(visit.id)}
                      className="rounded-lg bg-[#0f766e] px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-800"
                    >
                      Fill Results
                    </button>
                  </td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr className="bg-white dark:bg-zinc-900">
                  <td colSpan={6} className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400">
                    No pending lab requests.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function LabQueuePage() {
  return (
    <RoleGuard path="/dashboard/lab">
      <LabQueueContent />
    </RoleGuard>
  );
}
