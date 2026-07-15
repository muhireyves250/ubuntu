"use client";

import { useMemo, useState, useEffect } from "react";

import { RoleGuard } from "@/components/role-guard";
import { getLabRequests, subscribeToLabRequests, LabRequest } from "@/lib/patients/lab-requests";
import { findDemoUserById } from "@/lib/auth/demo-users";
import Link from "next/link";

import {
  IconActivity,
  IconCheckCircle,
  IconClock,
  IconAlertTriangle,
} from "@/components/dashboard/icons";

function readSessionUser() {
  if (typeof window === "undefined") return null;
  const sessionUserId = window.localStorage.getItem("ubuntumed.session");
  return sessionUserId ? findDemoUserById(sessionUserId) : null;
}

export default function LabNurseDashboard() {
  const [user] = useState(readSessionUser);
  const [requests, setRequests] = useState<LabRequest[]>(() =>
    user ? getLabRequests(user.facility) : [],
  );
  const userName = user?.name ?? "Lab Nurse";
  const facility = user?.facility ?? "";

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToLabRequests(() => {
      setRequests(getLabRequests(user.facility));
    });
    return () => { unsubscribe(); };
  }, [user]);



  const stats = useMemo(() => {
    return {
      pending: requests.filter((r) => r.status === "Pending").length,
      inProgress: requests.filter((r) => r.status === "In Progress").length,
      completed: requests.filter((r) => r.status === "Completed").length,
      emergencies: requests.filter((r) => r.priority === "Emergency").length,
      critical: requests.filter(
        (r) => r.results.some((res) => res.interpretation === "Critical")
      ).length,
    };
  }, [requests]);

  return (
    <RoleGuard path="/dashboard/lab">
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-300 bg-[#ffeedb] px-4 py-3 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
          <div>
            <h1 className="font-semibold text-zinc-900 dark:text-zinc-50">
              Welcome, {userName}
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {facility} Laboratory Dashboard
            </p>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-2 rounded-xl border border-zinc-300 bg-[#ffeedb] p-4 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
            <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
              <IconClock className="h-5 w-5" />
              <span className="text-sm font-semibold">Pending</span>
            </div>
            <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              {stats.pending}
            </span>
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-zinc-300 bg-[#ffeedb] p-4 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <IconActivity className="h-5 w-5" />
              <span className="text-sm font-semibold">In Progress</span>
            </div>
            <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              {stats.inProgress}
            </span>
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-zinc-300 bg-[#ffeedb] p-4 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
            <div className="flex items-center gap-2 text-teal-700 dark:text-teal-400">
              <IconCheckCircle className="h-5 w-5" />
              <span className="text-sm font-semibold">Completed</span>
            </div>
            <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              {stats.completed}
            </span>
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-zinc-300 bg-[#ffeedb] p-4 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <IconAlertTriangle className="h-5 w-5" />
              <span className="text-sm font-semibold">Emergencies / Critical</span>
            </div>
            <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              {stats.emergencies} / {stats.critical}
            </span>
          </div>
        </div>

        {/* Action Panel */}
        <div className="rounded-xl border border-zinc-300 bg-[#ffeedb] p-5 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
          <h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-50">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/lab/requests"
              className="inline-flex flex-1 items-center justify-center rounded-lg bg-teal-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-teal-800 sm:flex-none"
            >
              View Laboratory Requests
            </Link>
            <Link
              href="/dashboard/lab/history"
              className="inline-flex flex-1 items-center justify-center rounded-lg border border-zinc-400 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 sm:flex-none"
            >
              Patient Laboratory History
            </Link>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
