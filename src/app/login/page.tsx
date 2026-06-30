"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { findDemoUserById } from "@/lib/auth/demo-users";
import { ROLE_LABEL, dashboardPathForRole } from "@/lib/auth/role-routes";

const TAB_USER_IDS = ["nurse-uwase", "hc-head-mukamana", "dh-director-niyonsenga"] as const;
const MORE_USER_IDS = ["th-gyn-ingabire", "central-control", "admin"] as const;

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
  const [selectedUserId, setSelectedUserId] = useState<string>(TAB_USER_IDS[0]);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isHydrated && user) {
      router.replace(dashboardPathForRole(user.role));
    }
  }, [isHydrated, user, router]);

  const selectedUser = useMemo(
    () => findDemoUserById(selectedUserId),
    [selectedUserId],
  );

  function chooseUser(userId: string) {
    setSelectedUserId(userId);
    setPassword("");
    setError(null);
    setIsMoreOpen(false);
  }

  function resetToDefault() {
    chooseUser(TAB_USER_IDS[0]);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const success = login(selectedUserId, password);
    if (!success) {
      setError("Incorrect password for this demo user.");
      return;
    }
    const loggedInUser = findDemoUserById(selectedUserId);
    if (loggedInUser) router.replace(dashboardPathForRole(loggedInUser.role));
  }

  return (
    <div className="relative flex flex-1 flex-col sm:flex-row min-h-dvh">
      {/* ── Top-left: Back button ── */}
      <div className="absolute top-4 left-4 z-30">
        <button
          type="button"
          id="back-to-selector-btn"
          onClick={resetToDefault}
          className="flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20"
        >
          <span aria-hidden>←</span>
          Back to User Selector
        </button>
      </div>

      {/* ── Top-right: Login Options dropdown ── */}
      <div className="absolute top-4 right-4 z-30 sm:right-6">
        <div className="relative">
          <button
            type="button"
            id="login-options-btn"
            onClick={() => setIsMoreOpen((open) => !open)}
            className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-teal-700">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8" />
              <path d="M12 8v4l2.5 2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            Login Options
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {isMoreOpen && (
            <div className="absolute right-0 z-10 mt-2 w-64 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-xl">
              <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                More roles (demo)
              </p>
              {MORE_USER_IDS.map((userId) => {
                const moreUser = findDemoUserById(userId);
                if (!moreUser) return null;
                return (
                  <button
                    key={userId}
                    type="button"
                    onClick={() => chooseUser(userId)}
                    className="block w-full px-4 py-2.5 text-left text-sm text-zinc-700 transition-colors hover:bg-teal-50 hover:text-teal-900"
                  >
                    {moreUser.title}
                    <span className="block text-xs text-zinc-400">{moreUser.facility}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

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
          {TAB_USER_IDS.map((userId) => {
            const tabUser = findDemoUserById(userId);
            if (!tabUser) return null;
            const isActive = selectedUserId === userId;
            return (
              <button
                key={userId}
                type="button"
                id={`role-tab-${userId}`}
                onClick={() => chooseUser(userId)}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-teal-600 text-white shadow"
                    : "text-teal-100 hover:bg-white/10"
                }`}
              >
                {/* Small icon per role */}
                {userId === "nurse-uwase" && (
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
                    <path d="M12 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM6 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                )}
                {userId === "hc-head-mukamana" && (
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
                    <path d="M3 12h18M12 3l9 9-9 9-9-9 9-9Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {userId === "dh-director-niyonsenga" && (
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M9 12h6M12 9v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                )}
                {tabUser.title}
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
              <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-teal-600" aria-hidden>
                <path d="M12 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM6 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              {selectedUser && ROLE_LABEL[selectedUser.role]}
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
              Staff
              <input
                type="text"
                id="staff-field"
                readOnly
                value={`${selectedUser?.name ?? ""} — ${selectedUser?.facility ?? ""}`}
                className="w-full cursor-default rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-zinc-600 outline-none"
              />
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
