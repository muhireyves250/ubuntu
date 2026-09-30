"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { NAV_ITEMS, isNavItemActive } from "./sidebar";
import { IconMenu, IconClose, IconSettings, IconChevronRight } from "./icons";

// The Sidebar only renders at `lg` and up — below that there is otherwise no
// way to reach Patient Registry, ANC Visits, etc. This is the mobile
// equivalent: a hamburger trigger (in the Topbar) plus a full-screen slide-in
// drawer sharing the same NAV_ITEMS/active-link logic as the Sidebar.
export function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        title="Menu"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-600 hover:bg-white/60 dark:text-zinc-300 dark:hover:bg-zinc-800/60 lg:hidden"
      >
        <IconMenu className="h-5 w-5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsOpen(false)}
          />
          <aside className="scrollbar-hidden relative flex h-full w-72 max-w-[85vw] flex-col overflow-y-auto bg-[#ffebd6] px-4 pb-8 pt-4 shadow-xl dark:bg-zinc-950">
            <div className="flex items-center justify-between px-2">
              <span className="flex items-center gap-2">
                <Image src="/logo-mark-v3.png" alt="ubuntumed" width={40} height={40} className="h-10 w-10 shrink-0 object-contain" />
                <span className="whitespace-nowrap text-lg font-bold leading-none tracking-tight">
                  <span className="text-teal-600">Ubuntu</span>
                  <span className="text-orange-500">med</span>
                </span>
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close menu"
                className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-200/60 dark:text-zinc-400 dark:hover:bg-zinc-800/60"
              >
                <IconClose className="h-4 w-4" />
              </button>
            </div>

            <nav className="mt-8 flex flex-1 flex-col gap-2">
              {NAV_ITEMS.map((item) => {
                const isEnabled = item.enabledRoles?.includes(user.role) !== false;
                if (!isEnabled) return null;
                const isActive = isNavItemActive(item, pathname);
                return (
                  <Link
                    key={item.label}
                    href={item.href || "#"}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-[#0f766e] text-white shadow-sm shadow-teal-700/20"
                        : "text-zinc-600 hover:bg-zinc-200/60 dark:text-zinc-300 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    <item.icon className={`h-5 w-5 shrink-0 ${isActive ? "text-white" : "text-zinc-400"}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <button
              type="button"
              title="Settings"
              className="mt-6 flex items-center justify-between rounded-xl px-4 p-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200/60 dark:text-zinc-400"
            >
              <span className="flex items-center gap-3">
                <IconSettings className="h-5 w-5 shrink-0 text-zinc-400" />
                <span>Settings</span>
              </span>
              <IconChevronRight className="h-4 w-4 text-zinc-400" />
            </button>
          </aside>
        </div>
      )}
    </>
  );
}
