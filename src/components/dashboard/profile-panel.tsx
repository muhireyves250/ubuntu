"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { ROLE_LABEL, dashboardPathForRole } from "@/lib/auth/role-routes";
import type { Role } from "@/lib/auth/types";
import { getInitials } from "@/lib/format";
import { ConfirmModal } from "./confirm-modal";
import { SlideOverPanel } from "./slide-over-panel";

const SWITCHABLE_ROLES: Role[] = ["nurse", "lab_nurse"];

export function ProfilePanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { user, logout, switchRole } = useAuth();
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  if (!user) return null;

  function handleSwitchRole(role: Role) {
    switchRole(role);
    onClose();
    router.replace(dashboardPathForRole(role));
  }

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <SlideOverPanel title="Profile" onClose={onClose}>
      <div className="flex flex-col gap-4 rounded-[1.25rem] border border-zinc-300 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-900 text-sm font-semibold text-white">
            {getInitials(user.name)}
          </span>
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {user.name}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {user.title}
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            View as (demo)
          </p>
          <div className="mt-2 flex flex-col gap-1">
            {SWITCHABLE_ROLES.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => handleSwitchRole(role)}
                className={`rounded-lg px-2 py-1.5 text-left text-sm ${
                  role === user.role
                    ? "bg-teal-50 font-medium text-teal-900 dark:bg-teal-950 dark:text-teal-300"
                    : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
              >
                {ROLE_LABEL[role]}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsLogoutConfirmOpen(true)}
          className="w-full rounded-lg bg-[#0f766e] px-2 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-800"
        >
          Log out
        </button>
      </div>

      {isLogoutConfirmOpen && (
        <ConfirmModal
          title="Log out?"
          description="You'll need to sign in again to access the dashboard."
          confirmLabel="Log out"
          onConfirm={handleLogout}
          onCancel={() => setIsLogoutConfirmOpen(false)}
        />
      )}
    </SlideOverPanel>
  );
}
