"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import type { Role } from "@/lib/auth/types";
import {
  IconAlert,
  IconCalendar,
  IconClipboard,
  IconGrid,
  IconReport,
  IconSettings,
  IconUsers,
  IconChevronRight,
} from "./icons";

export interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  enabledRoles?: Role[];
  /** Label for the mobile bottom bar, where the full label won't fit. */
  shortLabel?: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    shortLabel: "Home",
    icon: IconGrid,
    href: "/dashboard",
  },
  {
    label: "Patient Registry",
    shortLabel: "Patients",
    icon: IconUsers,
    href: "/dashboard/nurse/patients",
    enabledRoles: ["nurse", "gynecologist", "hospital_admin"],
  },
  {
    label: "ANC Visits",
    shortLabel: "Visits",
    icon: IconCalendar,
    href: "/dashboard/nurse/visits",
    enabledRoles: ["nurse"],
  },
  {
    label: "Risk Classification",
    shortLabel: "Risk",
    icon: IconClipboard,
    href: "/dashboard/nurse/risk-classification",
    enabledRoles: ["nurse", "gynecologist", "hospital_admin"],
  },
  {
    label: "Active Alerts",
    shortLabel: "Alerts",
    icon: IconAlert,
    href: "/dashboard/nurse/alerts",
    enabledRoles: ["nurse"],
  },
  {
    label: "Community Reports",
    shortLabel: "Community",
    icon: IconReport,
    href: "/dashboard/nurse/community-reports",
    enabledRoles: ["nurse"],
  },
  {
    label: "Pharmacy Inventory",
    shortLabel: "Pharmacy",
    icon: IconClipboard,
    href: "/dashboard/nurse/inventory",
    enabledRoles: ["nurse", "hospital_admin"],
  },
  {
    label: "Referral Log",
    shortLabel: "Referrals",
    icon: IconReport,
    href: "/dashboard/nurse/referrals",
    enabledRoles: ["nurse", "gynecologist", "hospital_admin"],
  },
  {
    label: "Reports",
    icon: IconClipboard,
    href: "/dashboard/hospital-admin/reports",
    enabledRoles: ["hospital_admin"],
  },
  {
    label: "Staff Management",
    shortLabel: "Staff",
    icon: IconUsers,
    href: "/dashboard/hospital-admin/staff",
    enabledRoles: ["hospital_admin"],
  },
  {
    label: "Lab Requests",
    shortLabel: "Requests",
    icon: IconClipboard,
    href: "/dashboard/lab/requests",
    enabledRoles: ["lab_nurse"],
  },
  {
    label: "Lab History",
    shortLabel: "History",
    icon: IconReport,
    href: "/dashboard/lab/history",
    enabledRoles: ["lab_nurse"],
  },
];

import { useState } from "react";

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  return item.href === "/dashboard"
    ? pathname === "/dashboard" ||
        pathname === "/dashboard/nurse" ||
        pathname === "/dashboard/gynecologist" ||
        pathname === "/dashboard/lab" ||
        pathname === "/dashboard/hospital-admin" ||
        pathname === "/dashboard/chw"
    : pathname.startsWith(item.href || "");
}

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside className={`scrollbar-hidden hidden shrink-0 flex-col overflow-x-hidden overflow-y-auto px-4 pb-8 pt-4 transition-all duration-300 dark:bg-zinc-950 lg:flex ${isCollapsed ? "w-[88px]" : "w-64"}`}>
      <div className={`flex items-center ${isCollapsed ? "justify-center" : "justify-between"} px-2`}>
        <button onClick={() => setIsCollapsed(!isCollapsed)} className="flex items-center gap-2 transition-transform hover:scale-105 active:scale-95">
          <Image src="/logo-mark-v3.png" alt="ubuntumed" width={40} height={40} className="h-11 w-11 shrink-0 object-contain" priority />
          {!isCollapsed && (
            <span className="whitespace-nowrap text-xl font-bold leading-none tracking-tight">
              <span className="text-teal-600">Ubuntu</span>
              <span className="text-orange-500">med</span>
            </span>
          )}
        </button>
      </div>

      <nav className={`mt-10 flex flex-1 flex-col gap-2 ${isCollapsed ? "items-center" : ""}`}>
        {NAV_ITEMS.map((item) => {
          const isEnabled =
            !!user && (item.enabledRoles?.includes(user.role) !== false);

          if (isEnabled) {
            const isActive = isNavItemActive(item, pathname);

            return (
              <Link
                key={item.label}
                href={item.href || "#"}
                title={isCollapsed ? item.label : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isCollapsed ? "justify-center px-0 w-12 h-12" : ""
                } ${
                  isActive
                    ? "bg-[#0f766e] text-white shadow-sm shadow-teal-700/20"
                    : "text-zinc-500 hover:bg-zinc-200/60 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100"
                }`}
              >
                <item.icon className={`shrink-0 ${isCollapsed ? "h-6 w-6" : "h-5 w-5"} ${isActive ? "text-white" : "text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300"}`} />
                {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
              </Link>
            );
          }
          return null;
        })}
      </nav>

      <Link
        href="/dashboard/settings"
        title="Settings"
        aria-current={pathname.startsWith("/dashboard/settings") ? "page" : undefined}
        className={`mt-6 flex items-center rounded-xl p-3 text-sm font-medium transition-colors ${
          isCollapsed ? "justify-center w-12 mx-auto" : "justify-between px-4"
        } ${
          pathname.startsWith("/dashboard/settings")
            ? "bg-[#0f766e] text-white shadow-sm shadow-teal-700/20"
            : "text-zinc-700 hover:bg-zinc-200/60 dark:text-zinc-400"
        }`}
      >
        <span className="flex items-center gap-3">
          <IconSettings
            className={`shrink-0 ${isCollapsed ? "h-6 w-6" : "h-5 w-5"} ${
              pathname.startsWith("/dashboard/settings") ? "text-white" : "text-zinc-400"
            }`}
          />
          {!isCollapsed && <span>Settings</span>}
        </span>
        {!isCollapsed && (
          <IconChevronRight
            className={`h-4 w-4 ${pathname.startsWith("/dashboard/settings") ? "text-white" : "text-zinc-400"}`}
          />
        )}
      </Link>
    </aside>
  );
}
