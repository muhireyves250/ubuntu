"use client";

import { useState } from "react";
import { useInvoiceForVisit, generateInvoice, markInvoicePaid } from "@/lib/patients/use-patients";

export function VisitInvoiceSection({
  visitId,
  readOnly = false,
}: {
  visitId: string;
  readOnly?: boolean;
}) {
  const invoice = useInvoiceForVisit(visitId);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setError(null);
    setIsBusy(true);
    try {
      await generateInvoice(visitId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate invoice");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleMarkPaid() {
    if (!invoice) return;
    setError(null);
    setIsBusy(true);
    try {
      await markInvoicePaid(invoice.id, visitId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark invoice as paid");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div>
      <span className="font-medium text-zinc-400">Billing: </span>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      {!invoice ? (
        <span className="text-zinc-400">
          Not generated.{" "}
          {!readOnly && (
            <button
              type="button"
              disabled={isBusy}
              onClick={handleGenerate}
              className="text-xs font-medium text-teal-700 hover:underline dark:text-teal-400"
            >
              {isBusy ? "Generating…" : "Generate invoice"}
            </button>
          )}
        </span>
      ) : (
        <div className="mt-1 flex flex-wrap items-center gap-3 rounded-lg border border-zinc-200 px-3 py-2 text-xs dark:border-zinc-800">
          <span>
            Total: <span className="font-semibold text-zinc-900 dark:text-zinc-50">Fr {invoice.totalAmount.toFixed(2)}</span>
          </span>
          <span className="text-amber-700 dark:text-amber-400">Co-pay: Fr {invoice.coPayAmount.toFixed(2)}</span>
          <span className="text-teal-700 dark:text-teal-400">
            Insurance{invoice.insuranceType ? ` (${invoice.insuranceType})` : ""}: Fr {invoice.insuranceAmount.toFixed(2)}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 font-medium ${
              invoice.status === "paid"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
            }`}
          >
            {invoice.status === "paid" ? "Paid" : "Pending"}
          </span>
          {!readOnly && (
            <>
              <button type="button" disabled={isBusy} onClick={handleGenerate} className="text-teal-700 hover:underline dark:text-teal-400">
                Regenerate
              </button>
              {invoice.status === "pending" && (
                <button type="button" disabled={isBusy} onClick={handleMarkPaid} className="text-teal-700 hover:underline dark:text-teal-400">
                  Mark paid
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
