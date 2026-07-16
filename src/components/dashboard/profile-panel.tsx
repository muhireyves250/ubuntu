"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { ROLE_LABEL } from "@/lib/auth/role-routes";
import type { FacilityLevel, Role } from "@/lib/auth/types";
import { getInitials } from "@/lib/format";
import { ConfirmModal } from "./confirm-modal";
import { SlideOverPanel } from "./slide-over-panel";
import { IconBuilding, IconCheckCircle, IconClose } from "./icons";

const FACILITY_LEVEL_LABEL: Record<FacilityLevel, string> = {
  hc: "Health Center",
  dh: "District Hospital",
  th: "Tertiary Hospital",
  central: "Central / Referral Hospital",
};

const ROLE_PERMISSIONS: Record<Role, string[]> = {
  nurse: [
    "Register and manage patients at your facility",
    "Record ANC visits, vitals, and signs & symptoms",
    "Accept and manage emergency (red) cases at your facility",
    "Refer patients to other facilities when needed",
    "Respond to specialist recommendations from a Gynecologist",
  ],
  lab_nurse: [
    "Receive and fulfill lab requests for your facility only",
    "Record lab results — hemoglobin, platelets, blood sugar, urine protein",
    "View lab request and results history for your facility",
  ],
  gynecologist: [
    "Specialist oversight of Orange and Yellow risk pregnancies",
    "Accept and lead Red emergency cases alongside ANC nurses",
    "Leave specialist recommendations for the responsible ANC nurse",
    "Real-time alerts for emergencies, critical labs, and referrals",
    "Close emergency cases with a documented clinical outcome",
  ],
  hospital_admin: [
    "Read-only oversight dashboard for your facility",
    "Configure your facility's emergency capacity limit",
    "Read-only access to patient records at your facility",
    "Cannot accept referrals, provide treatment, or edit clinical records",
  ],
  chw: [
    "Receive community follow-up assignments from ANC nurses and gynecologists",
    "View a restricted record (name, ID, village, phone, gestational age, EDD) for assigned patients only",
    "Cannot register patients, perform assessments, or view lab/clinical records",
    "Cannot accept emergency referrals or modify patient records",
  ],
};

export function ProfilePanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  if (!user) return null;

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  const roleLabel = ROLE_LABEL[user.role];
  const subtitle = user.title === roleLabel ? roleLabel : `${user.title} · ${roleLabel}`;

  return (
    <SlideOverPanel title="Profile" onClose={onClose}>
      <div className="overflow-hidden rounded-[1.5rem] border border-zinc-300 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        {/* Hero header */}
        <div className="relative bg-gradient-to-br from-teal-700 to-teal-900 px-6 pb-6 pt-8 text-center">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80 backdrop-blur-sm transition-colors hover:bg-white/20"
            aria-label="Close profile"
          >
            <IconClose className="h-4 w-4" />
          </button>
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white text-2xl font-bold text-teal-800 shadow-lg ring-4 ring-white/30">
            {getInitials(user.name)}
          </span>
          <p className="mt-3 text-lg font-bold text-white">{user.name}</p>
          <p className="text-sm text-teal-100">{subtitle}</p>
        </div>

        <div className="flex flex-col gap-5 p-6">
          <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/50">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-400">
              <IconBuilding className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {user.facility}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {FACILITY_LEVEL_LABEL[user.facilityLevel]} · @{user.username}
              </p>
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Your Access in ubuntumed
            </p>
            <div className="flex flex-col divide-y divide-zinc-100 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
              {ROLE_PERMISSIONS[user.role].map((permission) => (
                <div key={permission} className="flex items-start gap-2.5 px-4 py-3">
                  <IconCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">{permission}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsLogoutConfirmOpen(true)}
            className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 shadow-sm transition-colors hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50"
          >
            Log out
          </button>
        </div>
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
