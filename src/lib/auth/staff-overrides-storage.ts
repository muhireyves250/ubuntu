export interface StaffOverride {
  status?: "suspended";
  password?: string;
}

const STAFF_OVERRIDES_KEY = "ubuntumed.staffOverrides";

let staffOverridesCache: Record<string, StaffOverride> | null = null;
const staffOverrideListeners = new Set<() => void>();

function loadStaffOverrides(): Record<string, StaffOverride> {
  if (staffOverridesCache) return staffOverridesCache;
  const raw = window.localStorage.getItem(STAFF_OVERRIDES_KEY);
  try {
    staffOverridesCache = raw ? (JSON.parse(raw) as Record<string, StaffOverride>) : {};
  } catch {
    staffOverridesCache = {};
  }
  return staffOverridesCache;
}

export function subscribeToStaffOverrides(onChange: () => void) {
  staffOverrideListeners.add(onChange);
  return () => staffOverrideListeners.delete(onChange);
}

export function getStaffOverridesSnapshot(): Record<string, StaffOverride> {
  return loadStaffOverrides();
}

export function getServerStaffOverridesSnapshot(): Record<string, StaffOverride> {
  return {};
}

export function setStaffOverrideStatus(userId: string, status: "active" | "suspended") {
  const current = loadStaffOverrides();
  const existing = current[userId] ?? {};
  const nextEntry: StaffOverride = { ...existing };
  if (status === "suspended") {
    nextEntry.status = "suspended";
  } else {
    delete nextEntry.status;
  }
  staffOverridesCache = { ...current, [userId]: nextEntry };
  window.localStorage.setItem(STAFF_OVERRIDES_KEY, JSON.stringify(staffOverridesCache));
  staffOverrideListeners.forEach((listener) => listener());
}

export function setStaffOverridePassword(userId: string, password: string) {
  const current = loadStaffOverrides();
  const existing = current[userId] ?? {};
  staffOverridesCache = { ...current, [userId]: { ...existing, password } };
  window.localStorage.setItem(STAFF_OVERRIDES_KEY, JSON.stringify(staffOverridesCache));
  staffOverrideListeners.forEach((listener) => listener());
}
