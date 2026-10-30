"use client";

import { useState } from "react";
import Link from "next/link";
import { RoleGuard } from "@/components/role-guard";
import { matchesPatientSearch, useDrugRequests } from "@/lib/patients/drug-requests";
import { IconSearch } from "@/components/dashboard/icons";
import { formatExactDateTime } from "@/lib/format";

export default function DrugRequestsPage() {
  const requests = useDrugRequests();
  const [filter, setFilter] = useState("");

  // Open requests first (oldest waiting at the top), dispensed live in History.
  const filteredRequests = requests
    .filter((r) => r.status !== "Dispensed" && matchesPatientSearch(r, filter))
    .sort((a, b) => a.requestDate.localeCompare(b.requestDate));

  return (
    <RoleGuard roles={["pharmacist"]}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-300 bg-[#ffeedb] px-4 py-3 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
          <div>
            <h1 className="font-semibold text-zinc-900 dark:text-zinc-50">Drug Requests</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Find the patient at the counter by ID or phone, then dispense their drugs
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-300 bg-[#ffeedb] p-3 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
          <div className="flex min-w-48 flex-1 items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900">
            <IconSearch className="h-4 w-4 text-zinc-400" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search by ID or Phone"
              autoFocus
              className="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-50"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-zinc-300 bg-[#ffeedb] shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-300 bg-[#ffeedb] text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-700 dark:bg-orange-950/40 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Drugs</th>
                <th className="px-4 py-3">Prescribed By</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Requested Time</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {filteredRequests.map((req) => (
                <tr
                  key={req.id}
                  className="bg-white transition-colors hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/60"
                >
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">{req.patientName}</span>
                      <span className="text-xs text-zinc-500">{req.patientId}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{req.patientPhone}</td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{req.items.length}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{req.requestedBy}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        req.status === "Pending"
                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-400"
                          : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400"
                      }`}
                    >
                      {req.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{formatExactDateTime(req.requestDate)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/pharmacy/requests/${req.id}`}
                      className="inline-flex rounded-md bg-[#0f766e] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-800"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {filteredRequests.length === 0 && (
                <tr className="bg-white dark:bg-zinc-900">
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
                    {filter ? "No open drug request matches this ID or phone." : "No open drug requests."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </RoleGuard>
  );
}
