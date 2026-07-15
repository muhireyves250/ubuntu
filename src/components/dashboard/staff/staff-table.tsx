"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { useFacilityStaff, type DirectoryUser } from "@/lib/auth/user-directory";
import { setManagedStaffStatus, resetManagedStaffPassword } from "@/lib/auth/managed-staff-storage";
import { setStaffOverrideStatus, setStaffOverridePassword } from "@/lib/auth/staff-overrides-storage";
import { ROLE_LABEL } from "@/lib/auth/role-routes";

function setStaffStatus(staffUser: DirectoryUser, status: "active" | "suspended") {
  if (staffUser.source === "managed") {
    setManagedStaffStatus(staffUser.id, status);
  } else {
    setStaffOverrideStatus(staffUser.id, status);
  }
}

function resetStaffPassword(staffUser: DirectoryUser, newPassword: string) {
  if (staffUser.source === "managed") {
    resetManagedStaffPassword(staffUser.id, newPassword);
  } else {
    setStaffOverridePassword(staffUser.id, newPassword);
  }
}

function StaffRow({ staffUser }: { staffUser: DirectoryUser }) {
  const [resetting, setResetting] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  return (
    <tr className="border-t border-zinc-200 dark:border-zinc-800">
      <td className="px-4 py-3">
        <p className="font-medium text-zinc-900 dark:text-zinc-50">{staffUser.name}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">@{staffUser.username}</p>
      </td>
      <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-300">{ROLE_LABEL[staffUser.role]}</td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
            staffUser.status === "active"
              ? "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400"
              : "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
          }`}
        >
          {staffUser.status === "active" ? "Active" : "Suspended"}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setStaffStatus(staffUser, staffUser.status === "active" ? "suspended" : "active")}
            className="rounded-md border border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {staffUser.status === "active" ? "Suspend" : "Activate"}
          </button>
          {resetting ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                className="w-32 rounded-md border border-zinc-300 px-2 py-1.5 text-xs outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-950"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newPassword) return;
                  resetStaffPassword(staffUser, newPassword);
                  setNewPassword("");
                  setResetting(false);
                }}
                className="rounded-md bg-teal-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-600"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setResetting(false);
                  setNewPassword("");
                }}
                className="rounded-md px-2 py-1.5 text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setResetting(true)}
              className="rounded-md border border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Reset Password
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export function StaffTable() {
  const { user } = useAuth();
  const staff = useFacilityStaff(user?.facility ?? "");

  if (!user) return null;

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-zinc-200 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:border-zinc-800">
            <th className="px-4 py-3">Staff</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {staff.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-sm text-zinc-400">
                No staff registered at your facility yet.
              </td>
            </tr>
          ) : (
            staff.map((s) => <StaffRow key={s.id} staffUser={s} />)
          )}
        </tbody>
      </table>
    </div>
  );
}
