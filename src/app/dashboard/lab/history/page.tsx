"use client";

import { useState } from "react";
import { RoleGuard } from "@/components/role-guard";
import { useLabRequests } from "@/lib/patients/lab-requests";
import { IconSearch, IconReport } from "@/components/dashboard/icons";
import Link from "next/link";
import { formatExactDateTime, getInitials } from "@/lib/format";

export default function LabHistoryPage() {
  const allRequests = useLabRequests();
  const requests = allRequests.filter((r) => r.status === "Completed");
  const [filter, setFilter] = useState("");

  const filteredRequests = requests
    .filter(
      (r) =>
        r.patientName.toLowerCase().includes(filter.toLowerCase()) ||
        r.patientId.toLowerCase().includes(filter.toLowerCase()) ||
        r.id.toLowerCase().includes(filter.toLowerCase()) ||
        (r.pregnancyNumber && r.pregnancyNumber.toString().includes(filter)),
    )
    .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());

  return (
    <RoleGuard roles={["lab_nurse"]}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-300 bg-[#ffeedb] px-5 py-4 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-teal-700 dark:bg-zinc-900 dark:text-teal-400">
              <IconReport className="h-4 w-4" />
            </span>
            <div>
              <h1 className="font-semibold text-zinc-900 dark:text-zinc-50">
                Laboratory History &amp; Patient Search
              </h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Search completed laboratory results for patients within your hospital.
              </p>
            </div>
          </div>
          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 shadow-sm dark:bg-zinc-900 dark:text-zinc-300">
            {requests.length} completed
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-300 bg-[#ffeedb] p-3 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
          <div className="flex min-w-48 flex-1 items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900">
            <IconSearch className="h-4 w-4 text-zinc-400" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search by ID, National ID, Phone, Name or Pregnancy Number..."
              className="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-50"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-zinc-300 bg-[#ffeedb] shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
          <div className="scrollbar-hidden overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-300 bg-[#ffeedb] text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-700 dark:bg-orange-950/40 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Completed On</th>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Test Summary</th>
                  <th className="px-4 py-3">Critical?</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filteredRequests.map((req) => {
                  const hasCritical = req.results.some((r) => r.interpretation === "Critical");
                  return (
                    <tr
                      key={req.id}
                      className="bg-white transition-colors hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/60"
                    >
                      <td className="px-4 py-3 text-zinc-800 dark:text-zinc-200">
                        <span className="block whitespace-nowrap">
                          {new Date(req.requestDate).toLocaleDateString()}
                        </span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {formatExactDateTime(req.requestDate)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                            {getInitials(req.patientName)}
                          </span>
                          <div className="flex flex-col">
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                              {req.patientName}
                            </span>
                            <span className="text-xs text-zinc-500">
                              ID: {req.patientId} • G{req.pregnancyNumber}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="max-w-[200px] truncate text-xs text-zinc-600 dark:text-zinc-400 sm:max-w-xs md:max-w-md">
                          {req.results.map((r) => r.testName).join(", ")}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            hasCritical
                              ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400"
                              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                          }`}
                        >
                          {hasCritical ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/dashboard/lab/requests/${req.id}`}
                          className="inline-flex rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                          View Results
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {filteredRequests.length === 0 && (
                  <tr className="bg-white dark:bg-zinc-900">
                    <td colSpan={5} className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400">
                      No completed laboratory results found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
