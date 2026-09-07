"use client";

import { useState } from "react";
import { useVaccinationsForPregnancy, recordVaccination } from "@/lib/patients/use-patients";
import { queryClient } from "@/lib/query-client";

const DOSE_OPTIONS = ["TD1", "TD2", "TD3", "TD4", "TD5"];

export function VaccinationCard({
  pregnancyId,
  readOnly = false,
}: {
  pregnancyId: string;
  readOnly?: boolean;
}) {
  const vaccinations = useVaccinationsForPregnancy(pregnancyId);
  const [dosage, setDosage] = useState(DOSE_OPTIONS[0]);
  const [dateTaken, setDateTaken] = useState(() => new Date().toISOString().slice(0, 10));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const takenDoses = new Set(vaccinations.map((v) => v.dosage));

  async function handleAdd() {
    setError(null);
    setIsSubmitting(true);
    try {
      await recordVaccination({ pregnancyId, dosage, dateTaken });
      await queryClient.invalidateQueries({ queryKey: ["vaccinations", "pregnancy", pregnancyId] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record vaccination");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Tetanus-Diphtheria Vaccination
      </p>

      {vaccinations.length === 0 ? (
        <p className="text-sm text-zinc-400">No doses recorded yet.</p>
      ) : (
        <div className="scrollbar-hidden overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
              <tr>
                <th className="px-3 py-2">Date Taken</th>
                <th className="px-3 py-2">Vaccine</th>
                <th className="px-3 py-2">Dosage</th>
                <th className="px-3 py-2">Practitioner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {vaccinations.map((v) => (
                <tr key={v.id}>
                  <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">{v.dateTaken}</td>
                  <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">{v.vaccineName}</td>
                  <td className="px-3 py-2 font-medium text-zinc-900 dark:text-zinc-50">{v.dosage}</td>
                  <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">{v.administeredByName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!readOnly && (
        <div className="flex flex-wrap items-end gap-2">
          {error && <p className="w-full text-sm text-red-600 dark:text-red-400">{error}</p>}
          <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
            Dose
            <select
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            >
              {DOSE_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                  {takenDoses.has(d) ? " (recorded)" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
            Date
            <input
              type="date"
              value={dateTaken}
              onChange={(e) => setDateTaken(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleAdd}
            className="rounded-lg bg-[#0f766e] px-3.5 py-1.5 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Recording…" : "Record Dose"}
          </button>
        </div>
      )}
    </div>
  );
}
