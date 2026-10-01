"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { NAV_ITEMS, isNavItemActive } from "./sidebar";

// Which sidebar destinations earn a bottom-bar slot, most important first.
// The first MAX_TABS the user's role can access are shown; everything else
// stays reachable from the Topbar hamburger drawer.
const PRIORITY_HREFS = [
  "/dashboard",
  "/dashboard/nurse/patients",
  "/dashboard/nurse/visits",
  "/dashboard/nurse/alerts",
  "/dashboard/lab/requests",
  "/dashboard/lab/history",
  "/dashboard/nurse/referrals",
  "/dashboard/hospital-admin/reports",
  "/dashboard/hospital-admin/staff",
  "/dashboard/nurse/risk-classification",
];
const MAX_TABS = 4;

// Mobile-only (below lg, where the Sidebar is hidden). Rendered as the last
// row of the dashboard's flex column rather than `fixed`, so it takes its
// own space and never covers page content.
export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  if (!user) return null;

  const tabs = PRIORITY_HREFS.map((href) => NAV_ITEMS.find((item) => item.href === href))
    .filter((item) => item && item.enabledRoles?.includes(user.role) !== false)
    .slice(0, MAX_TABS) as typeof NAV_ITEMS;

  const tabClass = "flex flex-1 flex-col items-center gap-1 pb-1.5 pt-2 text-[11px] font-medium";

  return (
    <nav
      aria-label="Main"
      className="flex shrink-0 border-t border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-zinc-800 dark:bg-zinc-900 lg:hidden"
    >
      {tabs.map((item) => {
        const isActive = isNavItemActive(item, pathname);
        return (
          <Link
            key={item.href}
            href={item.href!}
            aria-current={isActive ? "page" : undefined}
            className={`${tabClass} ${isActive ? "text-teal-800 dark:text-teal-300" : "text-zinc-500 dark:text-zinc-400"}`}
          >
            <span
              className={`flex h-7 w-14 items-center justify-center rounded-full transition-colors ${
                isActive ? "bg-teal-100 dark:bg-teal-950" : ""
              }`}
            >
              <item.icon className="h-5 w-5" />
            </span>
            {item.shortLabel ?? item.label}
          </Link>
        );
      })}
    </nav>
  );
}
