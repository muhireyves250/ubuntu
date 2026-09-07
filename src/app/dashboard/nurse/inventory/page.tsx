"use client";

import { useState } from "react";
import { RoleGuard } from "@/components/role-guard";
import { useInventory, createInventoryItem, adjustStock } from "@/lib/patients/use-patients";
import type { InventoryCategory } from "@/lib/patients/pharmacy-api";

function StockBadge({ quantityOnHand, reorderLevel }: { quantityOnHand: number; reorderLevel: number }) {
  if (quantityOnHand === 0) {
    return (
      <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-400">
        Out of Stock
      </span>
    );
  }
  if (quantityOnHand <= reorderLevel) {
    return (
      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
        Low Stock
      </span>
    );
  }
  return (
    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
      In Stock
    </span>
  );
}

function AddItemForm({ onAdded }: { onAdded: () => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<InventoryCategory>("drug");
  const [unit, setUnit] = useState("");
  const [quantityOnHand, setQuantityOnHand] = useState("0");
  const [reorderLevel, setReorderLevel] = useState("0");
  const [unitPrice, setUnitPrice] = useState("0");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await createInventoryItem({
        name,
        category,
        unit,
        quantityOnHand: Number(quantityOnHand),
        reorderLevel: Number(reorderLevel),
        unitPrice: Number(unitPrice),
      });
      setName("");
      setUnit("");
      setQuantityOnHand("0");
      setReorderLevel("0");
      setUnitPrice("0");
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add item");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-2.5 rounded-xl border border-zinc-300 bg-white p-3.5 dark:border-zinc-700 dark:bg-zinc-900"
    >
      {error && <p className="w-full text-sm text-red-600 dark:text-red-400">{error}</p>}
      <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
        Item name
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-48 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
        Category
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as InventoryCategory)}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="drug">Drug</option>
          <option value="consumable">Consumable</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
        Unit
        <input
          type="text"
          required
          placeholder="e.g. capsule"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className="w-28 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
        Quantity on hand
        <input
          type="number"
          min={0}
          value={quantityOnHand}
          onChange={(e) => setQuantityOnHand(e.target.value)}
          className="w-28 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
        Reorder level
        <input
          type="number"
          min={0}
          value={reorderLevel}
          onChange={(e) => setReorderLevel(e.target.value)}
          className="w-28 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
        Unit price (Fr)
        <input
          type="number"
          min={0}
          step="0.01"
          value={unitPrice}
          onChange={(e) => setUnitPrice(e.target.value)}
          className="w-28 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </label>
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-lg bg-[#0f766e] px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Adding…" : "Add Item"}
      </button>
    </form>
  );
}

function InventoryContent() {
  const items = useInventory();
  const [adjustingId, setAdjustingId] = useState<string | null>(null);

  async function handleRestock(id: string) {
    setAdjustingId(id);
    try {
      await adjustStock(id, 20);
    } finally {
      setAdjustingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-zinc-300 bg-[#ffeedb] px-4 py-3 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Pharmacy Inventory</h2>
      </div>

      <AddItemForm onAdded={() => undefined} />

      <div className="overflow-hidden rounded-xl border border-zinc-300 bg-[#ffeedb] shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-300 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3">Quantity</th>
              <th className="px-4 py-3">Reorder Level</th>
              <th className="px-4 py-3">Unit Price</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">{item.name}</td>
                <td className="px-4 py-3 capitalize text-zinc-700 dark:text-zinc-300">{item.category}</td>
                <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{item.unit}</td>
                <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{item.quantityOnHand}</td>
                <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{item.reorderLevel}</td>
                <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">Fr {item.unitPrice.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <StockBadge quantityOnHand={item.quantityOnHand} reorderLevel={item.reorderLevel} />
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={adjustingId === item.id}
                    onClick={() => handleRestock(item.id)}
                    className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-white disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    {adjustingId === item.id ? "Restocking…" : "+20 Restock"}
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400">
                  No inventory items yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  return (
    <RoleGuard roles={["nurse", "hospital_admin"]}>
      <InventoryContent />
    </RoleGuard>
  );
}
