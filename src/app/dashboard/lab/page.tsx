"use client";

import { useMemo, useState } from "react";

import { RoleGuard } from "@/components/role-guard";
import { useLabRequests } from "@/lib/patients/lab-requests";
import { getStoredAuthenticatedUser } from "@/lib/auth/auth-context";
import Link from "next/link";

import {
  IconActivity,
  IconCheckCircle,
  IconClock,
  IconAlertTriangle,
  IconClipboard,
} from "@/components/dashboard/icons";

function readSessionUser() {
  if (typeof window === "undefined") return null;
  return getStoredAuthenticatedUser();
}

function StatCard({
  icon,
  label,
  value,
  accentBar,
  chipClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  accentBar: string;
  chipClass: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <span className={`absolute inset-x-0 top-0 h-1 ${accentBar}`} />
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
          {label}
        </span>
        <span className={`flex h-8 w-8 items-center justify-center rounded-full ${chipClass}`}>
          {icon}
        </span>
      </div>
      <span className="mt-2 block text-3xl font-bold text-zinc-900 dark:text-zinc-50">{value}</span>
    </div>
  );
}

export default function LabNurseDashboard() {
  const [user] = useState(readSessionUser);
  const requests = useLabRequests();
  const userName = user?.name ?? "Lab Nurse";
  const facility = user?.facility ?? "";

  const today = useMemo(
    () => new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }),
    [],
  );

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
    <RoleGuard roles={["lab_nurse"]}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-300 bg-[#ffeedb] px-5 py-4 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-900 text-white shadow-sm">
              <IconClipboard className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                Welcome, {userName}
              </h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {facility} Laboratory Dashboard
              </p>
            </div>
          </div>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{today}</p>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<IconClock className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
            label="Pending"
            value={stats.pending}
            accentBar="bg-amber-400"
            chipClass="bg-amber-100 dark:bg-amber-950/40"
          />
          <StatCard
            icon={<IconActivity className="h-4 w-4 text-sky-600 dark:text-sky-400" />}
            label="In Progress"
            value={stats.inProgress}
            accentBar="bg-sky-400"
            chipClass="bg-sky-100 dark:bg-sky-950/40"
          />
          <StatCard
            icon={<IconCheckCircle className="h-4 w-4 text-teal-600 dark:text-teal-400" />}
            label="Completed"
            value={stats.completed}
            accentBar="bg-teal-500"
            chipClass="bg-teal-100 dark:bg-teal-950/40"
          />
          <StatCard
            icon={<IconAlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />}
            label="Emergencies / Critical"
            value={
              <span>
                {stats.emergencies}
                <span className="mx-1 text-lg font-normal text-zinc-300 dark:text-zinc-600">/</span>
                {stats.critical}
              </span>
            }
            accentBar="bg-red-500"
            chipClass="bg-red-100 dark:bg-red-950/40"
          />
        </div>

        {/* Action Panel */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/lab/requests"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-teal-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-teal-800 sm:flex-none"
            >
              <IconClipboard className="h-4 w-4" />
              View Laboratory Requests
            </Link>
            <Link
              href="/dashboard/lab/history"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 sm:flex-none"
            >
              <IconActivity className="h-4 w-4" />
              Patient Laboratory History
            </Link>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
