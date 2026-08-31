"use client";

import { useState } from "react";

export interface AiSuggestionItem {
  key: string;
  label: string;
  onAccept: () => void;
}

// Shows rule-based suggestions the nurse can accept (pre-fills the form)
// or reject (dismisses the card, manual entry stays exactly as before) —
// nothing here is ever auto-applied without an explicit tap.
export function AiSuggestionCard({ title, items }: { title: string; items: AiSuggestionItem[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const visible = items.filter((i) => !dismissed.has(i.key));

  if (visible.length === 0) return null;

  function dismiss(key: string) {
    setDismissed((current) => new Set(current).add(key));
  }

  return (
    <div className="rounded-lg border border-teal-200 bg-teal-50/60 p-3 dark:border-teal-900/40 dark:bg-teal-950/20">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-400">
        {title}
      </p>
      <ul className="flex flex-col gap-2">
        {visible.map((item) => (
          <li
            key={item.key}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-white px-3 py-2 text-sm dark:bg-zinc-900"
          >
            <span className="text-zinc-800 dark:text-zinc-200">{item.label}</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => {
                  item.onAccept();
                  dismiss(item.key);
                }}
                className="rounded-md bg-teal-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-teal-800"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={() => dismiss(item.key)}
                className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Reject
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
