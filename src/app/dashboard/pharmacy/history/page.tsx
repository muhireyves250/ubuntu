"use client";

import { useState } from "react";
import Link from "next/link";
import { RoleGuard } from "@/components/role-guard";
import { matchesPatientSearch, useDrugRequests } from "@/lib/patients/drug-requests";
import { IconSearch, IconReport } from "@/components/dashboard/icons";
import { formatExactDateTime } from "@/lib/format";

export default function DispensingHistoryPage() {
  const allRequests = useDrugRequests();
  const requests = allRequests.filter((r) => r.status === "Dispensed");
  const [filter, setFilter] = useState("");

  const filteredRequests = requests
    .filter((r) => matchesPatientSearch(r, filter))
    .sort((a, b) => (b.dispensedAt ?? "").localeCompare(a.dispensedAt ?? ""));

  return (
    <RoleGuard roles={["pharmacist"]}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-300 bg-[#ffeedb] px-5 py-4 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-teal-700 dark:bg-zinc-900 dark:text-teal-400">
              <IconReport className="h-4 w-4" />
            </span>
            <div>
              <h1 className="font-semibold text-zinc-900 dark:text-zinc-50">Dispensing History</h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Drugs already handed to patients at your facility.</p>
            </div>
          </div>
          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 shadow-sm dark:bg-zinc-900 dark:text-zinc-300">
            {requests.length} dispensed
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-300 bg-[#ffeedb] p-3 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
          <div className="flex min-w-48 flex-1 items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900">
            <IconSearch className="h-4 w-4 text-zinc-400" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search by ID or Phone"
              className="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-50"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {filteredRequests.map((req) => (
            <Link
              key={req.id}
              href={`/dashboard/pharmacy/requests/${req.id}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-teal-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-teal-700"
            >
              <div className="min-w-0">
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">{req.patientName}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {req.patientId} · {req.patientPhone}
                </p>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                  {req.items.map((i) => i.drugName).join(", ")}
                </p>
              </div>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {req.dispensedAt ? formatExactDateTime(req.dispensedAt) : ""}
              </span>
            </Link>
          ))}
          {filteredRequests.length === 0 && (
            <p className="rounded-xl border border-zinc-200 bg-white px-5 py-8 text-center text-sm text-zinc-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              No dispensed requests found.
            </p>
          )}
        </div>
      </div>
    </RoleGuard>
  );
}
