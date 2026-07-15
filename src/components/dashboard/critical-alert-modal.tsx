"use client";

import { useEffect } from "react";

export function CriticalAlertModal({
  hasCritical,
  onClose,
}: {
  hasCritical: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
      />

      {/* Modal card */}
      <div
        className={`relative w-full max-w-sm rounded-2xl border-2 bg-[#ffeedb] p-7 text-center shadow-2xl dark:bg-orange-950/40 ${
          hasCritical
            ? "border-red-500 dark:border-red-600"
            : "border-teal-400 dark:border-teal-700"
        }`}
      >
        {/* Icon */}
        <span
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full shadow-md ${
            hasCritical
              ? "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400"
              : "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300"
          }`}
        >
          {hasCritical ? (
            /* Warning triangle */
            <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          ) : (
            /* Check circle */
            <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
            </svg>
          )}
        </span>

        {/* Title */}
        <h2 className={`mt-4 text-base font-bold ${hasCritical ? "text-red-700 dark:text-red-300" : "text-teal-900 dark:text-teal-100"}`}>
          {hasCritical ? "⚠ Critical Limits Reached" : "Results Submitted"}
        </h2>

        {/* Body */}
        <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          {hasCritical
            ? "Emergency alert has been dispatched to the attending ANC Nurse. The AI Risk module has been updated with this patient's critical values."
            : "Laboratory results have been successfully recorded and are now visible to the attending ANC Nurse."}
        </p>

        {/* Sub-detail for critical */}
        {hasCritical && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900 dark:bg-red-950/30">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">Actions triggered</p>
            <ul className="mt-2 space-y-1 text-left text-xs text-red-700 dark:text-red-300">
              <li className="flex items-center gap-2">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
                ANC Nurse notified immediately
              </li>
              <li className="flex items-center gap-2">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
                Patient risk level escalated
              </li>
              <li className="flex items-center gap-2">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
                AI Risk module updated
              </li>
            </ul>
          </div>
        )}

        {/* Action */}
        <button
          type="button"
          onClick={onClose}
          className={`mt-6 w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors ${
            hasCritical
              ? "bg-red-600 hover:bg-red-700"
              : "bg-[#0f766e] hover:bg-teal-800"
          }`}
        >
          {hasCritical ? "Acknowledge & Close" : "Done"}
        </button>
      </div>
    </div>
  );
}
