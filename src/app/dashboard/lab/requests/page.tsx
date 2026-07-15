"use client";

import { useState, useEffect } from "react";
import { RoleGuard } from "@/components/role-guard";
import { getLabRequests, subscribeToLabRequests, LabRequest } from "@/lib/patients/lab-requests";

import { findUserById } from "@/lib/auth/user-directory";
import { IconSearch } from "@/components/dashboard/icons";
import Link from "next/link";
import { relativeTime } from "@/lib/format";

function readSessionUser() {
  if (typeof window === "undefined") return null;
  const sessionUserId = window.localStorage.getItem("ubuntumed.session");
  return sessionUserId ? findUserById(sessionUserId) ?? null : null;
}

export default function LabRequestsPage() {
  const [user] = useState(readSessionUser);
  const [requests, setRequests] = useState<LabRequest[]>(() =>
    user ? getLabRequests(user.facility) : [],
  );
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToLabRequests(() => {
      setRequests(getLabRequests(user.facility));
    });
    return () => { unsubscribe(); };
  }, [user]);


  const filteredRequests = requests.filter((r) =>
    r.patientName.toLowerCase().includes(filter.toLowerCase()) || 
    r.patientId.toLowerCase().includes(filter.toLowerCase()) ||
    r.id.toLowerCase().includes(filter.toLowerCase())
  ).sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());

  return (
    <RoleGuard roles={["lab_nurse"]}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-300 bg-[#ffeedb] px-4 py-3 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
          <div>
            <h1 className="font-semibold text-zinc-900 dark:text-zinc-50">
              Laboratory Requests
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Manage pending and active requests
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
              placeholder="Search by ID or Patient Name"
              className="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-50"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-300 bg-[#ffeedb] shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-300 bg-[#ffeedb] text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-700 dark:bg-orange-950/40 dark:text-zinc-400">
               <tr>
                <th className="px-4 py-3">Req ID</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Priority</th>
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
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">{req.id}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">{req.patientName}</span>
                      <span className="text-xs text-zinc-500">{req.patientId}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                      req.priority === "Emergency" ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" :
                      req.priority === "Urgent" ? "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300" :
                      "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300"
                    }`}>
                      {req.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      req.status === "Pending" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-400" :
                      req.status === "In Progress" ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400" :
                      "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-400"
                    }`}>
                      {req.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{relativeTime(req.requestDate)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/lab/requests/${req.id}`}
                      className="inline-flex rounded-md bg-[#0f766e] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-800"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {filteredRequests.length === 0 && (
                <tr className="bg-white dark:bg-zinc-900">
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
                    No requests found matching your search.
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
