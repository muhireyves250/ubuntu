// Shared by auth-context.tsx (owns writes on login/logout) and api/client.ts
// (clears the session on a 401 so a stale/expired token doesn't keep silently
// failing every request). Split out to avoid a circular import between those
// two — both depend on this leaf module instead of on each other.
export const AUTH_STORAGE_KEY = "ubuntumed.auth";

const listeners = new Set<() => void>();

export function emitSessionChange() {
  listeners.forEach((listener) => listener());
}

export function subscribeToSession(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function clearStoredSession() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
  emitSessionChange();
}
