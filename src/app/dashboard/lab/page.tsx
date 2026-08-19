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
  tint,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  tint: { card: string; iconChip: string; number: string };
}) {
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${tint.card}`}>
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tint.iconChip}`}>
          {icon}
        </span>
        <span className={`text-4xl font-extrabold tracking-tight tabular-nums ${tint.number}`}>
          {value}
        </span>
      </div>
      <span className="mt-2.5 block text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </span>
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
            icon={<IconClock className="h-5 w-5 text-white" />}
            label="Pending"
            value={stats.pending}
            tint={{
              card: "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20",
              iconChip: "bg-amber-500",
              number: "text-amber-900 dark:text-amber-300",
            }}
          />
          <StatCard
            icon={<IconActivity className="h-5 w-5 text-white" />}
            label="In Progress"
            value={stats.inProgress}
            tint={{
              card: "border-sky-200 bg-sky-50 dark:border-sky-900/50 dark:bg-sky-950/20",
              iconChip: "bg-sky-500",
              number: "text-sky-900 dark:text-sky-300",
            }}
          />
          <StatCard
            icon={<IconCheckCircle className="h-5 w-5 text-white" />}
            label="Completed"
            value={stats.completed}
            tint={{
              card: "border-teal-200 bg-teal-50 dark:border-teal-900/50 dark:bg-teal-950/20",
              iconChip: "bg-teal-600",
              number: "text-teal-900 dark:text-teal-300",
            }}
          />
          <StatCard
            icon={<IconAlertTriangle className="h-5 w-5 text-white" />}
            label="Emergencies / Critical"
            value={
              <span>
                {stats.emergencies}
                <span className="mx-1 text-2xl font-normal text-red-300 dark:text-red-800">/</span>
                {stats.critical}
              </span>
            }
            tint={{
              card: "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20",
              iconChip: "bg-red-600",
              number: "text-red-900 dark:text-red-300",
            }}
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
