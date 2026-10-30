"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { RoleGuard } from "@/components/role-guard";
import {
  acceptDrugRequest,
  dispenseDrugRequest,
  useDrugRequest,
  type DrugRequest,
  type DrugRequestItem,
} from "@/lib/patients/drug-requests";
import { formatExactDateTime } from "@/lib/format";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="font-medium text-zinc-900 dark:text-zinc-100">{children}</p>
    </div>
  );
}

function dosage(item: DrugRequestItem): string {
  return [item.perDose, item.frequency, item.durationDays ? `${item.durationDays} days` : undefined]
    .filter(Boolean)
    .join(" · ");
}

// Default to the full prescribed quantity, capped at what's on the shelf.
function defaultQuantity(item: DrugRequestItem): number {
  const prescribed = item.quantity ?? 1;
  return item.stockOnHand === undefined ? prescribed : Math.min(prescribed, item.stockOnHand);
}

function StockNote({ item }: { item: DrugRequestItem }) {
  if (item.stockOnHand === undefined) {
    return <span className="text-xs text-zinc-500 dark:text-zinc-400">Not in inventory catalog</span>;
  }
  const short = item.quantity !== undefined && item.stockOnHand < item.quantity;
  return (
    <span
      className={`text-xs font-medium ${
        item.stockOnHand === 0
          ? "text-red-600 dark:text-red-400"
          : short
            ? "text-amber-700 dark:text-amber-400"
            : "text-emerald-700 dark:text-emerald-400"
      }`}
    >
      {item.stockOnHand === 0 ? "Out of stock" : `${item.stockOnHand} ${item.stockUnit ?? ""} in stock`}
    </span>
  );
}

function DispenseForm({ request }: { request: DrugRequest }) {
  const router = useRouter();
  const [quantities, setQuantities] = useState<Record<string, string>>(() =>
    Object.fromEntries(request.items.map((i) => [i.id, String(defaultQuantity(i))])),
  );
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasShortfall = request.items.some((i) => Number(quantities[i.id] || 0) < (i.quantity ?? 1));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await dispenseDrugRequest(
        request.id,
        request.items.map((i) => ({ prescriptionId: i.id, dispensedQuantity: Number(quantities[i.id] || 0) })),
        notes.trim() || undefined,
      );
      router.push("/dashboard/pharmacy/requests");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to dispense. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="rounded-xl border border-zinc-300 bg-[#ffeedb] p-4 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Dispense Drugs
        </h2>
        <div className="flex flex-col gap-2">
          {request.items.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-300 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">{item.drugName}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Prescribed {item.quantity ?? 1} {item.unit ?? ""} · <StockNote item={item} />
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                Give
                <input
                  type="number"
                  min={0}
                  max={item.stockOnHand}
                  required
                  value={quantities[item.id]}
                  onChange={(e) => setQuantities((prev) => ({ ...prev, [item.id]: e.target.value }))}
                  className="w-20 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                />
              </label>
            </div>
          ))}
        </div>
        <label className="mt-4 flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
          Note for the nurse {hasShortfall && <span className="text-amber-700 dark:text-amber-400">(some drugs given short — say why)</span>}
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </label>
      </div>
      {error && (
        <p className="rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className="self-end rounded-xl bg-teal-900 px-8 py-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Dispensing…" : "Confirm & Dispense"}
      </button>
    </form>
  );
}

function DrugRequestDetail() {
  const params = useParams();
  const requestId = typeof params.id === "string" ? params.id : "";
  const { request, isLoading } = useDrugRequest(requestId);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isLoading) return <div className="flex flex-col items-center p-6" />;

  if (!request) {
    return (
      <div className="flex flex-col items-center p-6">
        <p>Drug request not found or unauthorized.</p>
        <Link href="/dashboard/pharmacy/requests" className="mt-4 text-teal-700 underline">
          Back to Requests
        </Link>
      </div>
    );
  }

  async function handleAccept() {
    if (!request || isAccepting) return;
    setError(null);
    setIsAccepting(true);
    try {
      await acceptDrugRequest(request.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept request. Please try again.");
    } finally {
      setIsAccepting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-300 bg-[#ffeedb] px-5 py-4 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
        <div>
          <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Drug Request: {request.patientName}</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Prescribed by {request.requestedBy} · {formatExactDateTime(request.requestDate)} • Status:{" "}
            <span className="font-semibold">{request.status}</span>
          </p>
        </div>
        <Link
          href={request.status === "Dispensed" ? "/dashboard/pharmacy/history" : "/dashboard/pharmacy/requests"}
          className="text-sm font-medium text-teal-700 hover:underline dark:text-teal-400"
        >
          ← Back
        </Link>
      </div>

      <div className="rounded-xl border border-zinc-300 bg-[#ffeedb] p-4 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Patient Details
        </h2>
        <div className="grid grid-cols-2 gap-4 rounded-lg border border-zinc-300 bg-white p-4 text-sm dark:border-zinc-700 dark:bg-zinc-900 sm:grid-cols-4">
          <Field label="Patient Name">{request.patientName}</Field>
          <Field label="Patient ID">{request.patientId}</Field>
          <Field label="Phone">{request.patientPhone}</Field>
          <Field label="Age / Gestational">
            {request.patientAge} yrs / {request.gestationalWeek ? `${request.gestationalWeek} wks` : "—"}
          </Field>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-300 bg-[#ffeedb] p-4 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Prescribed Drugs
        </h2>
        <div className="flex flex-col gap-2">
          {request.items.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-zinc-300 bg-white p-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {item.drugName}
                  {item.forPartner && (
                    <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      Partner
                    </span>
                  )}
                </p>
                {request.status === "Dispensed" ? (
                  <span className="text-xs font-medium text-teal-700 dark:text-teal-400">
                    Gave {item.dispensedQuantity ?? 0} of {item.quantity ?? 1} {item.unit ?? ""}
                  </span>
                ) : (
                  <StockNote item={item} />
                )}
              </div>
              <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                {dosage(item) || "No dosage given"} · Qty {item.quantity ?? 1} {item.unit ?? ""}
              </p>
              {item.patientInstructions && (
                <p className="mt-1 text-xs italic text-zinc-500 dark:text-zinc-400">{item.patientInstructions}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {request.status === "Pending" && (
        <div className="rounded-xl border border-teal-200 bg-linear-to-br from-teal-50 to-white p-8 text-center shadow-md dark:border-teal-900/50 dark:from-teal-950/40 dark:to-zinc-950">
          <h3 className="mb-3 text-xl font-bold tracking-tight text-teal-950 dark:text-teal-100">Request is Pending</h3>
          <p className="mx-auto mb-8 max-w-md text-sm leading-relaxed text-teal-700/90 dark:text-teal-300/80">
            When the patient reaches the counter, accept the request to lock it to yourself and prepare the drugs.
          </p>
          <button
            type="button"
            onClick={handleAccept}
            disabled={isAccepting}
            className="inline-flex items-center justify-center rounded-xl bg-teal-900 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-teal-900/20 hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isAccepting ? "Accepting…" : "Accept Request & Prepare Drugs"}
          </button>
          {error && (
            <p className="mt-4 rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </p>
          )}
        </div>
      )}

      {request.status === "In Progress" && <DispenseForm key={request.id} request={request} />}

      {request.status === "Dispensed" && (
        <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900 shadow-sm dark:border-teal-900/50 dark:bg-teal-950/30 dark:text-teal-200">
          Dispensed by {request.dispensedBy ?? "—"} on{" "}
          {request.dispensedAt ? formatExactDateTime(request.dispensedAt) : "—"}
          {request.notes && <p className="mt-1 italic">Note: {request.notes}</p>}
        </div>
      )}
    </div>
  );
}

export default function DrugRequestDetailPage() {
  return (
    <RoleGuard roles={["pharmacist"]}>
      <DrugRequestDetail />
    </RoleGuard>
  );
}
