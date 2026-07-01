"use client";

import { useEffect } from "react";
import { IconAlert } from "./icons";

export function ConfirmModal({
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
  tone = "default",
}: {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  tone?: "default" | "danger";
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cancel"
        onClick={onCancel}
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
      />

      <div
        className={`relative w-full max-w-[22rem] rounded-2xl border-2 bg-[#ffeedb] p-7 text-center shadow-2xl dark:bg-orange-950/40 ${
          tone === "danger"
            ? "border-red-600 dark:border-red-500"
            : "border-zinc-300 dark:border-zinc-700"
        }`}
      >
        <span
          className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full shadow-sm ${
            tone === "danger"
              ? "bg-white text-red-600 dark:bg-zinc-900 dark:text-red-300"
              : "bg-white text-orange-600 dark:bg-zinc-900 dark:text-orange-300"
          }`}
        >
          <IconAlert className="h-5 w-5" />
        </span>

        <h2 className="mt-4 text-base font-semibold text-zinc-900 dark:text-zinc-50">
          {title}
        </h2>
        <p className="mx-auto mt-2 max-w-[16rem] text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          {description}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors ${
              tone === "danger"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-[#0f766e] hover:bg-teal-800"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
