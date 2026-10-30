"use client";

import { usePrescriptionsForVisit, useConsumablesForVisit } from "@/lib/patients/use-patients";

export function VisitPharmacySection({
  visitId,
}: {
  visitId: string;
  readOnly?: boolean;
}) {
  const prescriptions = usePrescriptionsForVisit(visitId);
  const consumables = useConsumablesForVisit(visitId);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <span className="font-medium text-zinc-400">Medications: </span>
        {prescriptions.length === 0 ? (
          <span className="text-zinc-400">None recorded</span>
        ) : (
          <ul className="mt-1 flex flex-col gap-0.5">
            {prescriptions.map((p) => (
              <li key={p.id}>
                {p.drugName}
                {p.frequency ? ` — ${p.frequency}` : ""}
                {p.durationDays ? ` for ${p.durationDays} days` : ""}
                {p.quantity ? ` (qty ${p.quantity})` : ""}
                {p.forPartner ? " · Partner" : ""}
                {p.pharmacyStatus === "Dispensed" && (
                  <span className="text-teal-700 dark:text-teal-400"> · Dispensed {p.dispensedQuantity ?? 0}</span>
                )}
                {(p.pharmacyStatus === "Pending" || p.pharmacyStatus === "In Progress") && (
                  <span className="text-amber-700 dark:text-amber-400"> · Waiting at pharmacy</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <span className="font-medium text-zinc-400">Consumables: </span>
        {consumables.length === 0 ? (
          <span className="text-zinc-400">None recorded</span>
        ) : (
          <ul className="mt-1 flex flex-col gap-0.5">
            {consumables.map((c) => (
              <li key={c.id}>
                {c.itemName} — qty {c.quantity}
                {c.unit ? ` ${c.unit}` : ""}
                {c.forPartner ? " · Partner" : ""}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
