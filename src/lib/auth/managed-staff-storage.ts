import type { FacilityLevel, Role } from "./types";

export interface ManagedStaffAccount {
  id: string;
  username: string;
  name: string;
  title: string;
  facility: string;
  role: Extract<Role, "nurse" | "lab_nurse" | "gynecologist">;
  facilityLevel: FacilityLevel;
  password: string;
  status: "active" | "suspended";
  createdByAdminId: string;
  createdAt: string;
}

const MANAGED_STAFF_KEY = "ubuntumed.managedStaff";

let managedStaffCache: ManagedStaffAccount[] | null = null;
const managedStaffListeners = new Set<() => void>();

function readManagedStaffList(): ManagedStaffAccount[] {
  const raw = window.localStorage.getItem(MANAGED_STAFF_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ManagedStaffAccount[];
  } catch {
    return [];
  }
}

function writeManagedStaffList(items: ManagedStaffAccount[]) {
  window.localStorage.setItem(MANAGED_STAFF_KEY, JSON.stringify(items));
}

function loadManagedStaff(): ManagedStaffAccount[] {
  if (managedStaffCache) return managedStaffCache;
  managedStaffCache = readManagedStaffList();
  return managedStaffCache;
}

export function subscribeToManagedStaff(onChange: () => void) {
  managedStaffListeners.add(onChange);
  return () => managedStaffListeners.delete(onChange);
}

export function getManagedStaffSnapshot(): ManagedStaffAccount[] {
  return loadManagedStaff();
}

export function getServerManagedStaffSnapshot(): ManagedStaffAccount[] {
  return [];
}

export function registerStaffAccount(
  input: Omit<ManagedStaffAccount, "id" | "status" | "createdAt">,
): ManagedStaffAccount {
  const account: ManagedStaffAccount = {
    ...input,
    id: `staff-${crypto.randomUUID()}`,
    status: "active",
    createdAt: new Date().toISOString(),
  };
  managedStaffCache = [...loadManagedStaff(), account];
  writeManagedStaffList(managedStaffCache);
  managedStaffListeners.forEach((listener) => listener());
  return account;
}

export function setManagedStaffStatus(id: string, status: "active" | "suspended") {
  managedStaffCache = loadManagedStaff().map((s) =>
    s.id === id ? { ...s, status } : s,
  );
  writeManagedStaffList(managedStaffCache);
  managedStaffListeners.forEach((listener) => listener());
}

export function resetManagedStaffPassword(id: string, newPassword: string) {
  managedStaffCache = loadManagedStaff().map((s) =>
    s.id === id ? { ...s, password: newPassword } : s,
  );
  writeManagedStaffList(managedStaffCache);
  managedStaffListeners.forEach((listener) => listener());
}
