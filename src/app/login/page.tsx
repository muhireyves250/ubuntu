"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { DEMO_USERS } from "@/lib/auth/demo-users";
import { findUserByUsername } from "@/lib/auth/user-directory";
import { dashboardPathForRole } from "@/lib/auth/role-routes";
import type { Role } from "@/lib/auth/types";

const ROLE_TABS: { role: Role; label: string }[] = [
  { role: "nurse", label: "In charge of ANC" },
  { role: "lab_nurse", label: "Laboratory Nurse" },
  { role: "gynecologist", label: "Gynecologist" },
  { role: "hospital_admin", label: "Hospital Administrator" },
  { role: "chw", label: "Community Health Worker" },
];

function RoleIcon({ role, className = "h-4 w-4" }: { role: Role; className?: string }) {
  if (role === "nurse") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M12 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM6 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (role === "lab_nurse") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M9 2v6.5L4.5 17a2 2 0 0 0 1.8 3h11.4a2 2 0 0 0 1.8-3L15 8.5V2M9 2h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (role === "hospital_admin") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M4 21V9l8-5 8 5v12M4 21h16M9 21v-6h6v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (role === "chw") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M4 11.5 12 4l8 7.5M6 10v9a1 1 0 0 0 1 1h3v-5h4v5h3a1 1 0 0 0 1-1v-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M6 3v6a6 6 0 0 0 12 0V3M6 9a3 3 0 1 1-3 3M18 9a3 3 0 1 0 3 3M12 15v4m0 0a3 3 0 1 0 3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path
          d="M3 3l18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M7.4 7.5C4.9 9 3.4 11 3 12c1.3 2.9 4.9 7 9 7 1.6 0 3.1-.5 4.4-1.3M21 12c-.6-1.4-1.7-3-3.2-4.3M9.9 4.4A10.4 10.4 0 0 1 12 4c4.1 0 7.7 3.1 9 7"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path
        d="M3 12c1.3-2.9 4.9-7 9-7s7.7 4.1 9 7c-1.3 2.9-4.9 7-9 7s-7.7-4.1-9-7Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { user, isHydrated, login } = useAuth();
  const [selectedRole, setSelectedRole] = useState<Role>("nurse");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isHydrated && user) {
      router.replace(dashboardPathForRole(user.role));
    }
  }, [isHydrated, user, router]);

  const usernamesForRole = DEMO_USERS.filter((u) => u.role === selectedRole).map((u) => u.username);

  function chooseRole(role: Role) {
    setSelectedRole(role);
    setUsername("");
    setPassword("");
    setError(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const candidate = findUserByUsername(username);
    if (!candidate || candidate.role !== selectedRole) {
      setError(`No ${ROLE_TABS.find((t) => t.role === selectedRole)?.label} account found for that username.`);
      return;
    }
    const result = login(candidate.id, password);
    if (result === "invalid") {
      setError("Incorrect password.");
      return;
    }
    if (result === "suspended") {
      setError("This account has been suspended. Contact your hospital administrator.");
      return;
    }
    router.replace(dashboardPathForRole(candidate.role));
  }

  return (
    <div className="relative flex flex-1 flex-col sm:flex-row min-h-dvh">
      {/* ════════════════════════════════════════
          LEFT PANEL — photo background + role tabs
      ════════════════════════════════════════ */}
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-8 py-24 text-center text-white sm:px-16">
        {/* Background image */}
        <Image
          src="/login-bg.png"
          alt="Nurse consulting with a pregnant patient at a Rwanda health center"
          fill
          className="object-cover object-center"
          priority
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-teal-950/65" />

        {/* Logo — no card background, blends with photo */}
        <div className="relative mb-8 flex flex-col items-center gap-3">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-label="ubuntumed logo" className="drop-shadow-lg">
            {/* Heart shape */}
            <path
              d="M32 54C32 54 8 38 8 22a12 12 0 0 1 24 0 12 12 0 0 1 24 0c0 16-24 32-24 32Z"
              fill="white"
              fillOpacity="0.92"
            />
            {/* Medical cross inside heart */}
            <rect x="27" y="18" width="10" height="20" rx="2" fill="#0f766e" />
            <rect x="22" y="23" width="20" height="10" rx="2" fill="#0f766e" />
          </svg>
          <span className="text-lg font-bold tracking-wide text-white drop-shadow">ubuntumed</span>
        </div>

        {/* Role tab switcher */}
        <div className="relative flex flex-wrap justify-center gap-1 rounded-full bg-white/15 p-1.5 backdrop-blur-sm">
          {ROLE_TABS.map(({ role, label }) => {
            const isActive = selectedRole === role;
            return (
              <button
                key={role}
                type="button"
                id={`role-tab-${role}`}
                onClick={() => chooseRole(role)}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-teal-600 text-white shadow"
                    : "text-teal-100 hover:bg-white/10"
                }`}
              >
                <RoleIcon role={role} />
                {label}
              </button>
            );
          })}
        </div>

        {/* Headline */}
        <h1 className="relative mt-8 max-w-md text-3xl font-bold leading-tight sm:text-4xl">
          Track Every High&#8209;Risk Pregnancy!
        </h1>
        <p className="relative mt-3 max-w-sm text-teal-100">
          Identify, classify, and follow up on high-risk cases from ANC
          through postpartum — across every level of care.
        </p>
      </div>

      {/* ════════════════════════════════════════
          RIGHT PANEL — warm off-white + floating card
      ════════════════════════════════════════ */}
      <div className="flex flex-1 items-center justify-center bg-[#fff6ef] px-8 py-20 sm:px-16 shadow-[inset_4px_0_24px_rgba(0,0,0,0.04)]">
        <div className="w-full max-w-sm rounded-4xl bg-white p-8 shadow-[0_12px_40px_-10px_rgba(0,0,0,0.15)] ring-1 ring-black/5">
          {/* Card header */}
          <div className="flex flex-col items-center text-center">
            <svg width="56" height="56" viewBox="0 0 64 64" fill="none" aria-label="ubuntumed logo">
              {/* Heart shape */}
              <path
                d="M32 54C32 54 8 38 8 22a12 12 0 0 1 24 0 12 12 0 0 1 24 0c0 16-24 32-24 32Z"
                fill="#0f766e"
              />
              {/* Medical cross */}
              <rect x="27" y="18" width="10" height="20" rx="2" fill="white" />
              <rect x="22" y="23" width="20" height="10" rx="2" fill="white" />
            </svg>

            {/* Role badge */}
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-800 ring-1 ring-teal-200">
              <RoleIcon role={selectedRole} className="h-3.5 w-3.5 text-teal-600" />
              {ROLE_TABS.find((t) => t.role === selectedRole)?.label}
            </span>

            <h2 className="mt-4 text-2xl font-bold text-zinc-900">
              ubuntumed
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              Log in to access your facility&apos;s high-risk case tracking
              and alerts.
            </p>
          </div>

          {/* Form */}
          <form id="login-form" onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
              Username
              <input
                type="text"
                id="username-field"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Enter your username"
                autoComplete="username"
                className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-zinc-900 outline-none transition-colors focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                required
              />
              <span className="text-xs text-zinc-400">
                Demo {ROLE_TABS.find((t) => t.role === selectedRole)?.label} usernames: {usernamesForRole.join(", ")}
              </span>
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
              Password
              <div className="relative">
                <input
                  id="password-field"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-zinc-900 outline-none transition-colors focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((show) => !show)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-3 flex items-center text-zinc-400 transition-colors hover:text-zinc-600"
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </label>

            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-teal-700 hover:text-teal-600"
              >
                Forgot Password?
              </Link>
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              id="login-submit-btn"
              className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-teal-600 active:scale-[0.98]"
            >
              Log In →
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
