"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { registerStaffAccount } from "@/lib/auth/managed-staff-storage";
import { isUsernameTaken } from "@/lib/auth/user-directory";
import type { Role } from "@/lib/auth/types";

type AssignableRole = Extract<Role, "nurse" | "lab_nurse" | "gynecologist">;

const ASSIGNABLE_ROLES: { value: AssignableRole; label: string }[] = [
  { value: "nurse", label: "Nurse (ANC)" },
  { value: "lab_nurse", label: "Laboratory Nurse" },
  { value: "gynecologist", label: "Gynecologist" },
];

export function RegisterStaffForm() {
  const { user } = useAuth();
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [role, setRole] = useState<AssignableRole>("nurse");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!user) return null;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedUsername = username.trim();
    const trimmedName = name.trim();
    const trimmedTitle = title.trim();

    if (!trimmedUsername || !trimmedName || !trimmedTitle || !password) {
      setError("All fields are required.");
      return;
    }
    if (isUsernameTaken(trimmedUsername)) {
      setError(`Username "${trimmedUsername}" is already in use.`);
      return;
    }

    registerStaffAccount({
      username: trimmedUsername,
      name: trimmedName,
      title: trimmedTitle,
      facility: user!.facility,
      role,
      facilityLevel: user!.facilityLevel,
      password,
      createdByAdminId: user!.id,
    });

    setUsername("");
    setName("");
    setTitle("");
    setPassword("");
    setRole("nurse");
    setSuccess(`Account created for ${trimmedName}.`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Register New Staff</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Username
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Full Name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Title
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. In charge of ANC"
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Role
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as AssignableRole)}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          >
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 sm:col-span-2">
          Initial Password
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>
      </div>
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-700 dark:bg-teal-950/40 dark:text-teal-400">
          {success}
        </p>
      )}
      <button
        type="submit"
        className="self-start rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-600"
      >
        Register Staff
      </button>
    </form>
  );
}
