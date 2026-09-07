import { apiFetch } from "@/lib/api/client";
import { getStoredAccessToken } from "@/lib/auth/auth-context";

export type InventoryCategory = "drug" | "consumable";

export interface InventoryItem {
  id: string;
  name: string;
  category: InventoryCategory;
  unit: string;
  quantityOnHand: number;
  reorderLevel: number;
  unitPrice: number;
}

export interface Prescription {
  id: string;
  visitId: string;
  inventoryItemId?: string;
  drugName: string;
  perDose?: string;
  unit?: string;
  frequency?: string;
  durationDays?: number;
  quantity?: number;
  patientInstructions?: string;
  forPartner: boolean;
}

export interface ConsumableUsage {
  id: string;
  visitId: string;
  inventoryItemId?: string;
  itemName: string;
  quantity: number;
  unit?: string;
  comment?: string;
  forPartner: boolean;
}

interface BackendInventoryItem {
  id: string;
  name: string;
  category: "DRUG" | "CONSUMABLE";
  unit: string;
  quantityOnHand: number;
  reorderLevel: number;
  unitPrice: number;
}
interface BackendPrescription {
  id: string;
  visitId: string;
  inventoryItemId: string | null;
  drugName: string;
  perDose: string | null;
  unit: string | null;
  frequency: string | null;
  durationDays: number | null;
  quantity: number | null;
  patientInstructions: string | null;
  forPartner: boolean;
}
interface BackendConsumableUsage {
  id: string;
  visitId: string;
  inventoryItemId: string | null;
  itemName: string;
  quantity: number;
  unit: string | null;
  comment: string | null;
  forPartner: boolean;
}

const CATEGORY_TO_FRONTEND: Record<string, InventoryCategory> = { DRUG: "drug", CONSUMABLE: "consumable" };
const CATEGORY_TO_BACKEND: Record<InventoryCategory, "DRUG" | "CONSUMABLE"> = { drug: "DRUG", consumable: "CONSUMABLE" };

function toFrontendItem(i: BackendInventoryItem): InventoryItem {
  return {
    id: i.id,
    name: i.name,
    category: CATEGORY_TO_FRONTEND[i.category],
    unit: i.unit,
    quantityOnHand: i.quantityOnHand,
    reorderLevel: i.reorderLevel,
    unitPrice: i.unitPrice,
  };
}
function toFrontendPrescription(p: BackendPrescription): Prescription {
  return {
    id: p.id,
    visitId: p.visitId,
    inventoryItemId: p.inventoryItemId ?? undefined,
    drugName: p.drugName,
    perDose: p.perDose ?? undefined,
    unit: p.unit ?? undefined,
    frequency: p.frequency ?? undefined,
    durationDays: p.durationDays ?? undefined,
    quantity: p.quantity ?? undefined,
    patientInstructions: p.patientInstructions ?? undefined,
    forPartner: p.forPartner,
  };
}
function toFrontendConsumable(c: BackendConsumableUsage): ConsumableUsage {
  return {
    id: c.id,
    visitId: c.visitId,
    inventoryItemId: c.inventoryItemId ?? undefined,
    itemName: c.itemName,
    quantity: c.quantity,
    unit: c.unit ?? undefined,
    comment: c.comment ?? undefined,
    forPartner: c.forPartner,
  };
}

export async function fetchInventory(): Promise<InventoryItem[]> {
  const token = getStoredAccessToken();
  const items = await apiFetch<BackendInventoryItem[]>("/inventory", { token: token ?? undefined });
  return items.map(toFrontendItem);
}

export async function createInventoryItemApi(data: {
  name: string;
  category: InventoryCategory;
  unit: string;
  quantityOnHand?: number;
  reorderLevel?: number;
  unitPrice?: number;
}): Promise<InventoryItem> {
  const token = getStoredAccessToken();
  const i = await apiFetch<BackendInventoryItem>("/inventory", {
    method: "POST",
    body: { ...data, category: CATEGORY_TO_BACKEND[data.category] },
    token: token ?? undefined,
  });
  return toFrontendItem(i);
}

export async function adjustStockApi(id: string, delta: number): Promise<InventoryItem> {
  const token = getStoredAccessToken();
  const i = await apiFetch<BackendInventoryItem>(`/inventory/${id}/stock`, {
    method: "PATCH",
    body: { delta },
    token: token ?? undefined,
  });
  return toFrontendItem(i);
}

export async function fetchPrescriptionsForVisit(visitId: string): Promise<Prescription[]> {
  const token = getStoredAccessToken();
  const list = await apiFetch<BackendPrescription[]>(`/prescriptions/${visitId}`, { token: token ?? undefined });
  return list.map(toFrontendPrescription);
}

export async function createPrescriptionApi(data: {
  visitId: string;
  inventoryItemId?: string;
  drugName: string;
  perDose?: string;
  unit?: string;
  frequency?: string;
  durationDays?: number;
  quantity?: number;
  patientInstructions?: string;
  forPartner?: boolean;
}): Promise<Prescription> {
  const token = getStoredAccessToken();
  const p = await apiFetch<BackendPrescription>("/prescriptions", {
    method: "POST",
    body: data,
    token: token ?? undefined,
  });
  return toFrontendPrescription(p);
}

export async function fetchConsumablesForVisit(visitId: string): Promise<ConsumableUsage[]> {
  const token = getStoredAccessToken();
  const list = await apiFetch<BackendConsumableUsage[]>(`/consumables/${visitId}`, { token: token ?? undefined });
  return list.map(toFrontendConsumable);
}

export async function createConsumableUsageApi(data: {
  visitId: string;
  inventoryItemId?: string;
  itemName: string;
  quantity: number;
  unit?: string;
  comment?: string;
  forPartner?: boolean;
}): Promise<ConsumableUsage> {
  const token = getStoredAccessToken();
  const c = await apiFetch<BackendConsumableUsage>("/consumables", {
    method: "POST",
    body: data,
    token: token ?? undefined,
  });
  return toFrontendConsumable(c);
}
