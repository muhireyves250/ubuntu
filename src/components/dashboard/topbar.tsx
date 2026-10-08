"use client";

import Image from "next/image";
import { useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { ROLE_LABEL } from "@/lib/auth/role-routes";
import { getInitials } from "@/lib/format";
import { IconBell, IconChevronDown, IconSearch } from "./icons";
import { NotificationPanel } from "./notification-panel";
import { PatientSearch } from "./patient-search";
import { ProfilePanel } from "./profile-panel";
import { MobileNav } from "./mobile-nav";
import { useNotificationAlerts, useReadNotificationIds } from "@/lib/patients/use-patients";

export function Topbar() {
  const { user } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const alerts = useNotificationAlerts(user?.role ?? "");
  const readIds = useReadNotificationIds();
  const unreadCount = alerts.filter((a) => !readIds.has(a.id)).length;

  if (!user) return null;

  return (
    <header className="flex items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4">
      <div className="flex min-w-0 items-center gap-2">
        {/* Only the sidebar (lg and up) carries the logo — it's hidden
            below that breakpoint, so this is the only branding a narrow
            viewport ever sees. The wordmark itself drops out below sm,
            where every pixel goes to the facility name instead. */}
        <span className="flex shrink-0 items-center gap-1.5 lg:hidden">
          <Image src="/logo-mark-v3.png" alt="ubuntumed" width={40} height={40} className="h-9 w-9 shrink-0 object-contain" />
          <span className="hidden whitespace-nowrap text-lg font-bold leading-none tracking-tight sm:inline">
            <span className="text-teal-600">Ubuntu</span>
            <span className="text-orange-500">med</span>
          </span>
        </span>
        <div className="min-w-0">
          <p className="line-clamp-2 text-balance text-[13px] font-bold leading-tight tracking-tight text-zinc-900 dark:text-white sm:truncate sm:text-lg sm:leading-normal">
            {user.facility}
          </p>
          <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400 sm:text-xs">
            {ROLE_LABEL[user.role]}
          </p>
        </div>
      </div>

      {user.role === "nurse" || user.role === "gynecologist" ? (
        <PatientSearch variant="bar" />
      ) : (
        <div className="hidden flex-1 max-w-sm items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm text-zinc-400 shadow-sm dark:bg-zinc-900 sm:flex">
          <IconSearch className="h-4 w-4" />
          <span>Search patients, cases…</span>
        </div>
      )}

      <div className="flex shrink-0 items-center gap-1 rounded-full bg-white p-1 shadow-sm dark:bg-zinc-900 sm:gap-3 sm:p-1.5">
        {(user.role === "nurse" || user.role === "gynecologist") && <PatientSearch variant="icon" />}
        <button
          type="button"
          title="Notifications"
          onClick={() => setIsNotificationsOpen(true)}
          className="relative flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100"
        >
          <IconBell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setIsProfileOpen(true)}
          className="flex items-center gap-2 rounded-full p-0.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 sm:py-1 sm:pl-1 sm:pr-2"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-900 text-xs font-semibold text-white">
            {getInitials(user.name)}
          </span>
          <IconChevronDown className="hidden h-4 w-4 text-zinc-500 sm:block" />
        </button>

        {/* Mobile menu (lg:hidden) shares the pill with notifications and profile. */}
        <MobileNav />
      </div>

      {isNotificationsOpen && (
        <NotificationPanel onClose={() => setIsNotificationsOpen(false)} />
      )}
      {isProfileOpen && <ProfilePanel onClose={() => setIsProfileOpen(false)} />}
    </header>
  );
}
