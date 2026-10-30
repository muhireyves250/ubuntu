"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { RoleGuard } from "@/components/role-guard";
import { useDrugRequests } from "@/lib/patients/drug-requests";
import { useInventory } from "@/lib/patients/use-patients";
import { getStoredAuthenticatedUser } from "@/lib/auth/auth-context";
import { getInitials, relativeTime } from "@/lib/format";
import {
  IconActivity,
  IconCheckCircle,
  IconClock,
  IconAlertTriangle,
  IconClipboard,
  IconChevronRight,
  IconCalendar,
} from "@/components/dashboard/icons";

function readSessionUser() {
  if (typeof window === "undefined") return null;
  return getStoredAuthenticatedUser();
}

const STATUS_TINT: Record<string, string> = {
  Pending: "bg-amber-500",
  "In Progress": "bg-sky-500",
  Dispensed: "bg-teal-600",
};

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
        <span className={`text-4xl font-extrabold tracking-tight tabular-nums ${tint.number}`}>{value}</span>
      </div>
      <span className="mt-2.5 block text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </span>
    </div>
  );
}

export default function PharmacistDashboard() {
  const [user] = useState(readSessionUser);
  const requests = useDrugRequests();
  const inventory = useInventory();
  const userName = user?.name ?? "Pharmacist";
  const facility = user?.facility ?? "";

  const today = useMemo(
    () => new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }),
    [],
  );

  const stats = useMemo(
    () => ({
      pending: requests.filter((r) => r.status === "Pending").length,
      inProgress: requests.filter((r) => r.status === "In Progress").length,
      dispensed: requests.filter((r) => r.status === "Dispensed").length,
      lowStock: inventory.filter((i) => i.quantityOnHand <= i.reorderLevel).length,
    }),
    [requests, inventory],
  );

  const openRequests = useMemo(
    () =>
      requests
        .filter((r) => r.status !== "Dispensed")
        .sort((a, b) => a.requestDate.localeCompare(b.requestDate))
        .slice(0, 6),
    [requests],
  );

  return (
    <RoleGuard roles={["pharmacist"]}>
      <div className="flex flex-col gap-5">
        <div className="relative overflow-hidden rounded-2xl border border-zinc-300 bg-[#ffeedb] px-6 py-5 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-900 text-white shadow-sm">
                <IconClipboard className="h-6 w-6" />
              </span>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Welcome, {userName}</h1>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{facility} · Pharmacy Dashboard</p>
              </div>
            </div>
            <span className="flex items-center gap-1.5 rounded-full border border-zinc-300 bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-600 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
              <IconCalendar className="h-3.5 w-3.5" />
              {today}
            </span>
          </div>
        </div>

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
            label="Dispensed"
            value={stats.dispensed}
            tint={{
              card: "border-teal-200 bg-teal-50 dark:border-teal-900/50 dark:bg-teal-950/20",
              iconChip: "bg-teal-600",
              number: "text-teal-900 dark:text-teal-300",
            }}
          />
          <StatCard
            icon={<IconAlertTriangle className="h-5 w-5 text-white" />}
            label="Low / Out of Stock"
            value={stats.lowStock}
            tint={{
              card: "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20",
              iconChip: "bg-red-600",
              number: "text-red-900 dark:text-red-300",
            }}
          />
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Waiting for Drugs</h2>
            <Link
              href="/dashboard/pharmacy/requests"
              className="flex items-center gap-0.5 text-xs font-semibold text-teal-700 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300"
            >
              View all
              <IconChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {openRequests.length === 0 ? (
            <p className="rounded-xl border border-zinc-200 bg-white px-5 py-8 text-center text-sm text-zinc-400 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500">
              No open drug requests — prescriptions from nurses will appear here.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {openRequests.map((req) => (
                <Link
                  key={req.id}
                  href={`/dashboard/pharmacy/requests/${req.id}`}
                  className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-teal-700"
                >
                  <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                    {getInitials(req.patientName)}
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-zinc-900 ${STATUS_TINT[req.status]}`}
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{req.patientName}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {relativeTime(req.requestDate)} · {req.status}
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {req.items.length} {req.items.length === 1 ? "drug" : "drugs"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/pharmacy/requests"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-teal-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-teal-800 sm:flex-none"
            >
              <IconClipboard className="h-4 w-4" />
              View Drug Requests
            </Link>
            <Link
              href="/dashboard/nurse/inventory"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 sm:flex-none"
            >
              <IconActivity className="h-4 w-4" />
              Manage Inventory
            </Link>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
