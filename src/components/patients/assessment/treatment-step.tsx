"use client";

import { useState } from "react";
import { usePrescriptionsForVisit, createPrescription, useInventory } from "@/lib/patients/use-patients";

export function TreatmentStep({ visitId, onContinue }: { visitId: string; onContinue: () => void }) {
  const prescriptions = usePrescriptionsForVisit(visitId);
  const inventory = useInventory();
  const drugCatalog = inventory.filter((i) => i.category === "drug");
  const [inventoryItemId, setInventoryItemId] = useState("");
  const [drugName, setDrugName] = useState("");
  const [frequency, setFrequency] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [quantity, setQuantity] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    setError(null);
    setIsSubmitting(true);
    try {
      const selected = drugCatalog.find((d) => d.id === inventoryItemId);
      await createPrescription({
        visitId,
        inventoryItemId: inventoryItemId || undefined,
        drugName: selected?.name ?? drugName,
        frequency: frequency || undefined,
        durationDays: durationDays ? Number(durationDays) : undefined,
        quantity: quantity ? Number(quantity) : undefined,
      });
      setDrugName("");
      setFrequency("");
      setDurationDays("");
      setQuantity("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save prescription");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Treatment — Prescriptions
      </p>

      {prescriptions.length === 0 ? (
        <p className="text-sm text-zinc-400">No medications recorded yet.</p>
      ) : (
        <ul className="flex flex-col gap-1 text-sm">
          {prescriptions.map((p) => (
            <li key={p.id}>
              {p.drugName}
              {p.frequency ? ` — ${p.frequency}` : ""}
              {p.durationDays ? ` for ${p.durationDays} days` : ""}
              {p.quantity ? ` (qty ${p.quantity})` : ""}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <select
            value={inventoryItemId}
            onChange={(e) => { setInventoryItemId(e.target.value); setDrugName(""); }}
            className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
            <option value="">Not in catalog…</option>
            {drugCatalog.map((d) => (
              <option key={d.id} value={d.id}>{d.name} ({d.quantityOnHand} {d.unit} in stock)</option>
            ))}
          </select>
          {!inventoryItemId && (
            <input type="text" placeholder="Drug name" value={drugName} onChange={(e) => setDrugName(e.target.value)} className="min-w-32 flex-1 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50" />
          )}
          <input type="text" placeholder="Frequency" value={frequency} onChange={(e) => setFrequency(e.target.value)} className="w-28 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50" />
          <input type="number" min={1} placeholder="Days" value={durationDays} onChange={(e) => setDurationDays(e.target.value)} className="w-20 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50" />
          <input type="number" min={1} placeholder="Qty" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-20 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50" />
          <button
            type="button"
            disabled={isSubmitting || (!inventoryItemId && !drugName)}
            onClick={handleAdd}
            className="rounded-lg bg-[#0f766e] px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Saving…" : "Add"}
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="w-full rounded-xl bg-[#0f766e] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-800"
      >
        Continue to Consumables →
      </button>
    </div>
  );
}
