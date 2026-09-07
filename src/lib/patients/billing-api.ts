import { apiFetch } from "@/lib/api/client";
import { getStoredAccessToken } from "@/lib/auth/auth-context";

export interface Invoice {
  id: string;
  visitId: string;
  insuranceType?: string;
  coveragePercent: number;
  totalAmount: number;
  coPayAmount: number;
  insuranceAmount: number;
  status: "pending" | "paid";
  paidAt?: string;
}

interface BackendInvoice {
  id: string;
  visitId: string;
  insuranceType: string | null;
  coveragePercent: number;
  totalAmount: number;
  coPayAmount: number;
  insuranceAmount: number;
  status: "PENDING" | "PAID";
  paidAt: string | null;
}

function toFrontendInvoice(i: BackendInvoice): Invoice {
  return {
    id: i.id,
    visitId: i.visitId,
    insuranceType: i.insuranceType ?? undefined,
    coveragePercent: i.coveragePercent,
    totalAmount: i.totalAmount,
    coPayAmount: i.coPayAmount,
    insuranceAmount: i.insuranceAmount,
    status: i.status === "PAID" ? "paid" : "pending",
    paidAt: i.paidAt ?? undefined,
  };
}

export async function fetchInvoiceForVisit(visitId: string): Promise<Invoice | null> {
  const token = getStoredAccessToken();
  const invoice = await apiFetch<BackendInvoice | null>(`/invoices/visit/${visitId}`, {
    token: token ?? undefined,
  });
  return invoice ? toFrontendInvoice(invoice) : null;
}

export async function generateInvoiceApi(visitId: string, coveragePercentOverride?: number): Promise<Invoice> {
  const token = getStoredAccessToken();
  const i = await apiFetch<BackendInvoice>(`/invoices/visit/${visitId}/generate`, {
    method: "POST",
    body: coveragePercentOverride != null ? { coveragePercentOverride } : {},
    token: token ?? undefined,
  });
  return toFrontendInvoice(i);
}

export async function markInvoicePaidApi(id: string): Promise<Invoice> {
  const token = getStoredAccessToken();
  const i = await apiFetch<BackendInvoice>(`/invoices/${id}/mark-paid`, {
    method: "PATCH",
    token: token ?? undefined,
  });
  return toFrontendInvoice(i);
}
