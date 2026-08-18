"use client";

import { useState } from "react";
import { useConsumablesForVisit, createConsumableUsage, useInventory } from "@/lib/patients/use-patients";

export function ConsumablesStep({ visitId, onContinue }: { visitId: string; onContinue: () => void }) {
  const consumables = useConsumablesForVisit(visitId);
  const inventory = useInventory();
  const consumableCatalog = inventory.filter((i) => i.category === "consumable");
  const [inventoryItemId, setInventoryItemId] = useState("");
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    setError(null);
    setIsSubmitting(true);
    try {
      const selected = consumableCatalog.find((c) => c.id === inventoryItemId);
      await createConsumableUsage({
        visitId,
        inventoryItemId: inventoryItemId || undefined,
        itemName: selected?.name ?? itemName,
        quantity: Number(quantity),
      });
      setItemName("");
      setQuantity("1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save consumable usage");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Consumables Used
      </p>

      {consumables.length === 0 ? (
        <p className="text-sm text-zinc-400">No consumables recorded yet.</p>
      ) : (
        <ul className="flex flex-col gap-1 text-sm">
          {consumables.map((c) => (
            <li key={c.id}>{c.itemName} — qty {c.quantity}{c.unit ? ` ${c.unit}` : ""}</li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <select
            value={inventoryItemId}
            onChange={(e) => { setInventoryItemId(e.target.value); setItemName(""); }}
            className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
            <option value="">Not in catalog…</option>
            {consumableCatalog.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.quantityOnHand} {c.unit} in stock)</option>
            ))}
          </select>
          {!inventoryItemId && (
            <input type="text" placeholder="Item name" value={itemName} onChange={(e) => setItemName(e.target.value)} className="min-w-28 flex-1 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50" />
          )}
          <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-20 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50" />
          <button
            type="button"
            disabled={isSubmitting || (!inventoryItemId && !itemName)}
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
        Continue to Followup →
      </button>
    </div>
  );
}
