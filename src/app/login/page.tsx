"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AuthShell } from "@/components/auth/auth-shell";
import { IconChevronDown, IconLock } from "@/components/dashboard/icons";
import { apiFetch } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";
import { mapBackendRole, titleForRole } from "@/lib/auth/role-mapping";
import { dashboardPathForRole } from "@/lib/auth/role-routes";
import type { Role } from "@/lib/auth/types";

interface DemoAccount {
  email: string;
  role: string;
}

// The order the demo accounts are listed in.
const ROLE_ORDER: Role[] = ["nurse", "lab_nurse", "gynecologist", "hospital_admin", "chw", "pharmacist"];

function groupDemoAccounts(accounts: DemoAccount[]): { role: Role; emails: string[] }[] {
  const emailsByRole = new Map<Role, string[]>();
  for (const account of accounts) {
    let role: Role;
    try {
      role = mapBackendRole(account.role);
    } catch {
      // A role this app has no dashboard for: nothing to offer.
      continue;
    }
    emailsByRole.set(role, [...(emailsByRole.get(role) ?? []), account.email]);
  }
  return ROLE_ORDER.flatMap((role) => {
    const emails = emailsByRole.get(role);
    return emails ? [{ role, emails }] : [];
  });
}

// text-base below sm: iOS zooms the page when a focused input is under 16px.
const INPUT_CLASS =
  "peer w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 text-base text-zinc-900 outline-none transition placeholder:text-zinc-400 hover:border-zinc-300 focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-600/10 sm:text-[15px]";
// Sits after the input in the DOM so `peer-focus` can tint it.
const FIELD_ICON_CLASS =
  "pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 transition-colors peer-focus:text-teal-700";
const FOCUS_RING_CLASS =
  "rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600";

function UserIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM5 20c0-3.6 3.1-6 7-6s7 2.4 7 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="2" />
      <path d="m4 7.5 8 6 8-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
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
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
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

function Spinner() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 animate-spin" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" className="opacity-30" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { user, isHydrated, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDemoAccounts, setShowDemoAccounts] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Set when the app signs you out: password change, inactivity, or "sign out everywhere".
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    // Read after mount so the server and first client render match.
    const params = new URLSearchParams(window.location.search);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNotice(
      params.has("password-changed")
        ? "Password changed. Sign in with your new password."
        : params.has("timed-out")
          ? "You were signed out after a period of inactivity."
          : params.has("signed-out-everywhere")
            ? "You've been signed out on all devices."
            : null,
    );
  }, []);

  // Where a signed-in user goes is decided by the role on their account — on
  // arrival with a live session, and the moment a sign-in below succeeds.
  useEffect(() => {
    if (isHydrated && user) {
      router.replace(dashboardPathForRole(user.role));
    }
  }, [isHydrated, user, router]);

  // Demo account hints come from the API (emails only), which returns none
  // where they are switched off.
  const { data: demoAccounts = [] } = useQuery({
    queryKey: ["demo-accounts"],
    queryFn: () => apiFetch<DemoAccount[]>("/auth/demo-accounts"),
    staleTime: Infinity,
  });
  const demoGroups = groupDemoAccounts(demoAccounts);

  function fillDemoEmail(demoEmail: string) {
    setEmail(demoEmail);
    setError(null);
    passwordRef.current?.focus();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const result = await login(email, password);
    // On success the button stays busy until the effect above has replaced
    // this page with the dashboard.
    if (result === "ok") return;
    setIsSubmitting(false);
    setError(
      result === "invalid"
        ? "Incorrect email or password."
        : "Could not reach the server. Please try again.",
    );
  }

  return (
    <AuthShell footer="Need an account? Ask your hospital administrator.">
      <div className="animate-auth-rise text-center [animation-delay:120ms]">
        {/* The brand band sits directly above on small screens, so the badge
            would only push the fields down. */}
        <div
          aria-hidden
          className="mx-auto mb-5 hidden h-14 w-14 items-center justify-center rounded-full bg-teal-50 ring-8 ring-teal-50/50 lg:flex"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-teal-700 shadow-sm ring-1 ring-teal-100">
            <UserIcon className="h-5 w-5" />
          </span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Log in to your account</h1>
        <p className="mt-1.5 text-sm text-zinc-500">Enter your work email and password to continue.</p>
      </div>

      {notice && !error && (
        <p
          role="status"
          className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800"
        >
          {notice}
        </p>
      )}

      <form
        id="login-form"
        onSubmit={handleSubmit}
        className={`animate-auth-rise flex flex-col gap-4 [animation-delay:200ms] ${notice && !error ? "mt-4" : "mt-7"}`}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email-field" className="text-sm font-medium text-zinc-700">
            Email
          </label>
          <div className="relative">
            <input
              type="email"
              id="email-field"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@facility.rw"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              className={`${INPUT_CLASS} pr-3.5`}
              required
            />
            <MailIcon className={FIELD_ICON_CLASS} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password-field" className="text-sm font-medium text-zinc-700">
            Password
          </label>
          <div className="relative">
            <input
              ref={passwordRef}
              id="password-field"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              className={`${INPUT_CLASS} pr-11`}
              required
            />
            <IconLock className={FIELD_ICON_CLASS} />
            <button
              type="button"
              onClick={() => setShowPassword((show) => !show)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className={`absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center text-zinc-400 transition-colors hover:text-zinc-600 ${FOCUS_RING_CLASS}`}
            >
              <EyeIcon open={showPassword} />
            </button>
          </div>
        </div>

        <div className="-mt-1 flex justify-end">
          <Link
            href="/forgot-password"
            className={`text-xs font-medium text-teal-700 hover:text-teal-600 ${FOCUS_RING_CLASS}`}
          >
            Forgot password?
          </Link>
        </div>

        {error && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          id="login-submit-btn"
          disabled={isSubmitting}
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-teal-700 font-semibold text-white shadow-sm shadow-teal-900/20 transition hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting && <Spinner />}
          {isSubmitting ? "Signing in…" : "Log in"}
        </button>
      </form>

      {demoGroups.length > 0 && (
        <div className="animate-auth-rise mt-5 [animation-delay:280ms]">
          <button
            type="button"
            onClick={() => setShowDemoAccounts((show) => !show)}
            aria-expanded={showDemoAccounts}
            aria-controls="demo-accounts"
            className={`mx-auto flex items-center gap-1 px-1 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-800 ${FOCUS_RING_CLASS}`}
          >
            Demo accounts
            <IconChevronDown
              className={`h-3.5 w-3.5 transition-transform duration-200 ${showDemoAccounts ? "rotate-180" : ""}`}
            />
          </button>
          {/* Animating grid rows from 0fr to 1fr opens the list at its own
              height, so the centred form slides instead of jumping. `inert`
              keeps the collapsed buttons out of the tab order. */}
          <div
            id="demo-accounts"
            inert={!showDemoAccounts}
            className={`grid transition-[grid-template-rows] duration-200 ease-out ${showDemoAccounts ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
          >
            <div className="overflow-hidden">
              <div className="mt-3 rounded-2xl bg-zinc-50 p-3 ring-1 ring-zinc-100">
                <p className="text-[11px] text-zinc-500">Pick one to fill in the email.</p>
                <ul className="mt-2.5 flex flex-col gap-2">
                  {demoGroups.map(({ role, emails }) => (
                    <li key={role} className="grid gap-1 sm:grid-cols-[8.75rem_1fr] sm:items-baseline sm:gap-3">
                      <span className="text-[11px] font-medium text-zinc-500">{titleForRole(role)}</span>
                      <span className="flex flex-wrap gap-1.5">
                        {emails.map((demoEmail) => (
                          <button
                            key={demoEmail}
                            type="button"
                            title={demoEmail}
                            aria-label={`Use ${demoEmail}`}
                            onClick={() => fillDemoEmail(demoEmail)}
                            className="rounded-full bg-white px-2 py-1 text-xs text-zinc-700 ring-1 ring-zinc-200 transition hover:text-teal-800 hover:ring-teal-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
                          >
                            {demoEmail.split("@")[0]}
                          </button>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </AuthShell>
  );
}
