"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setSubmitted(true);
    }, 800);
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-teal-900 via-teal-800 to-teal-700 px-12 py-16 text-white lg:flex lg:w-1/2">
        <div className="relative z-10">
          <Image src="/logo-full.png" alt="ubuntumed" width={220} height={190} className="h-auto w-24 object-contain" />
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
          {/* Logo */}
          <div className="flex flex-col items-center text-center">
            <Image src="/logo-full.png" alt="ubuntumed logo" width={220} height={190} className="h-auto w-20 object-contain" />

            <h2 className="mt-4 text-2xl font-bold text-zinc-900">
              Forgot password?
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              Enter your work email and we&apos;ll send you a reset link.
            </p>
          </div>

          {submitted ? (
            <div className="mt-6 flex flex-col items-center gap-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-50">
                <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-teal-600">
                  <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-sm font-medium text-zinc-800">
                Check your email for a reset link
              </p>
              <p className="text-xs text-zinc-500">
                We sent a password reset link to{" "}
                <span className="font-medium text-zinc-700">{email}</span>.
                It expires in 30 minutes.
              </p>
              <Link
                href="/login"
                className="mt-2 text-sm font-medium text-teal-700 hover:text-teal-600"
              >
                ← Back to log in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
                Work email
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@facility.rw"
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-zinc-900 outline-none transition-colors focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
              </label>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-teal-600 active:scale-[0.98] disabled:opacity-60"
              >
                {isLoading ? "Sending…" : "Send reset link"}
              </button>

              <Link
                href="/login"
                className="text-center text-sm font-medium text-zinc-500 hover:text-zinc-700"
              >
                ← Back to log in
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
