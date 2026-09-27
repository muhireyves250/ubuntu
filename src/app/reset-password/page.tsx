"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);

  const passwordsMatch = password.length > 0 && password === confirm;
  const canSubmit = passwordsMatch && !isLoading;

  useEffect(() => {
    if (done) {
      const t = setTimeout(() => router.replace("/login"), 2500);
      return () => clearTimeout(t);
    }
  }, [done, router]);

  if (!token) {
    return (
      <div className="mt-6 flex flex-col items-center gap-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-red-500">
            <path d="M12 9v4M12 17h.01M10.3 3.9l-8 13.8A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.3l-8-13.8a2 2 0 0 0-3.4 0Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-sm font-medium text-zinc-800">Invalid or missing reset token</p>
        <p className="text-xs text-zinc-500">
          This link is invalid or has expired. Please request a new one.
        </p>
        <Link
          href="/forgot-password"
          className="mt-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-600"
        >
          Request new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mt-6 flex flex-col items-center gap-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-50">
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-teal-600">
            <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-sm font-medium text-zinc-800">Password reset successfully</p>
        <p className="text-xs text-zinc-500">Redirecting you to log in…</p>
      </div>
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setDone(true);
    }, 800);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        New password
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter new password"
            className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-zinc-900 outline-none transition-colors focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-3 flex items-center text-zinc-400 hover:text-zinc-600"
          >
            {showPassword ? (
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <path d="M3 3l18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M7.4 7.5C4.9 9 3.4 11 3 12c1.3 2.9 4.9 7 9 7 1.6 0 3.1-.5 4.4-1.3M21 12c-.6-1.4-1.7-3-3.2-4.3M9.9 4.4A10.4 10.4 0 0 1 12 4c4.1 0 7.7 3.1 9 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <path d="M3 12c1.3-2.9 4.9-7 9-7s7.7 4.1 9 7c-1.3 2.9-4.9 7-9 7s-7.7-4.1-9-7Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            )}
          </button>
        </div>
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
        Confirm password
        <input
          type={showPassword ? "text" : "password"}
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Re-enter new password"
          className={`w-full rounded-xl border px-3.5 py-2.5 text-zinc-900 outline-none transition-colors focus:ring-2 ${
            confirm && !passwordsMatch
              ? "border-red-300 focus:border-red-400 focus:ring-red-100"
              : "border-zinc-200 bg-white focus:border-teal-500 focus:ring-teal-100"
          }`}
        />
        {confirm && !passwordsMatch && (
          <span className="text-xs text-red-500">Passwords do not match</span>
        )}
      </label>

      <button
        type="submit"
        disabled={!canSubmit}
        className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-teal-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? "Resetting…" : "Reset password"}
      </button>

      <Link
        href="/login"
        className="text-center text-sm font-medium text-zinc-500 hover:text-zinc-700"
      >
        ← Back to log in
      </Link>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-teal-900 via-teal-800 to-teal-700 px-12 py-16 text-white lg:flex lg:w-1/2">
        <div className="relative z-10">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-teal-200">
            <svg width="20" height="20" viewBox="0 0 64 64" fill="none" aria-hidden>
              <path d="M32 54C32 54 8 38 8 22a12 12 0 0 1 24 0 12 12 0 0 1 24 0c0 16-24 32-24 32Z" fill="currentColor" />
              <rect x="27" y="18" width="10" height="20" rx="2" fill="white" opacity=".3" />
              <rect x="22" y="23" width="20" height="10" rx="2" fill="white" opacity=".3" />
            </svg>
            ubuntumed
          </span>
        </div>

        <div className="relative z-10">
          <h1 className="max-w-md text-3xl font-bold leading-tight sm:text-4xl">
            Track Every High&#8209;Risk Pregnancy!
          </h1>
          <p className="mt-3 max-w-sm text-teal-100">
            Identify, classify, and follow up on high-risk cases from ANC
            through postpartum — across every level of care.
          </p>
        </div>

        <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-teal-600/30 blur-3xl" />
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center bg-[#fff6ef] px-8 py-20 shadow-[inset_4px_0_24px_rgba(0,0,0,0.04)] sm:px-16">
        <div className="w-full max-w-sm rounded-4xl bg-white p-8 shadow-[0_12px_40px_-10px_rgba(0,0,0,0.15)] ring-1 ring-black/5">
          <div className="flex flex-col items-center text-center">
            <svg width="56" height="56" viewBox="0 0 64 64" fill="none" aria-label="ubuntumed logo">
              <path
                d="M32 54C32 54 8 38 8 22a12 12 0 0 1 24 0 12 12 0 0 1 24 0c0 16-24 32-24 32Z"
                fill="#0f766e"
              />
              <rect x="27" y="18" width="10" height="20" rx="2" fill="white" />
              <rect x="22" y="23" width="20" height="10" rx="2" fill="white" />
            </svg>

            <h2 className="mt-4 text-2xl font-bold text-zinc-900">
              Reset password
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              Choose a new password for your account.
            </p>
          </div>

          <Suspense fallback={<div className="mt-6 h-40 animate-pulse rounded-xl bg-zinc-100" />}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
