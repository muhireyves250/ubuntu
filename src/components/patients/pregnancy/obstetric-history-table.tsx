"use client";

import { gestationalAgeWeeks } from "@/lib/patients/pregnancy";
import type { Pregnancy } from "@/lib/patients/types";

// A structured table of every pregnancy on record (open and closed) —
// derived entirely from Pregnancy records rather than a separate duplicate
// model, since each pregnancy already carries its own delivery details.
export function ObstetricHistoryTable({
  pregnancies,
  selectedId,
  onSelect,
}: {
  pregnancies: Pregnancy[];
  selectedId?: string | null;
  onSelect?: (pregnancy: Pregnancy) => void;
}) {
  const rows = [...pregnancies].sort((a, b) => a.pregnancyNumber - b.pregnancyNumber);

  if (rows.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Obstetric History
      </p>
      <div className="scrollbar-hidden overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
            <tr>
              <th className="px-3 py-2.5">No.</th>
              <th className="px-3 py-2.5">Pregnancy #</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5">Gestational Age at Birth</th>
              <th className="px-3 py-2.5">Hypertension Disorder</th>
              <th className="px-3 py-2.5"># Babies</th>
              <th className="px-3 py-2.5">Mode of Delivery</th>
              <th className="px-3 py-2.5">Outcome</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {rows.map((p, index) => {
              const gaAtBirth =
                p.lmpDate && p.delivery
                  ? gestationalAgeWeeks(p.lmpDate, p.delivery.date)
                  : null;
              const selected = selectedId === p.id;
              return (
                <tr
                  key={p.id}
                  onClick={onSelect ? () => onSelect(p) : undefined}
                  className={
                    onSelect
                      ? `cursor-pointer transition-colors ${
                          selected
                            ? "bg-teal-50 dark:bg-teal-950/30"
                            : "hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
                        }`
                      : undefined
                  }
                >
                  <td className="px-3 py-2.5 text-zinc-500 dark:text-zinc-400">{index + 1}</td>
                  <td className="px-3 py-2.5 font-medium text-zinc-900 dark:text-zinc-50">
                    #{p.pregnancyNumber}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                        p.status === "open"
                          ? "bg-teal-50 text-teal-800 dark:bg-teal-950/30 dark:text-teal-400"
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-zinc-600 dark:text-zinc-400">
                    {gaAtBirth != null ? `${gaAtBirth} weeks` : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-zinc-600 dark:text-zinc-400">
                    {p.hadHypertensionDisorder ? "Yes" : "No"}
                  </td>
                  <td className="px-3 py-2.5 text-zinc-600 dark:text-zinc-400">{p.numberOfBabies}</td>
                  <td className="px-3 py-2.5 capitalize text-zinc-600 dark:text-zinc-400">
                    {p.delivery?.method ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 capitalize text-zinc-600 dark:text-zinc-400">
                    {p.status === "open" ? "In progress" : (p.delivery?.outcome.replace("-", " ") ?? "—")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
