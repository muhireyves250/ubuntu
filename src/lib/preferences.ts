// Per-device preferences (localStorage). They apply to whoever uses this
// browser, so the Settings page labels them "on this device".
import { useSyncExternalStore } from "react";

export interface Preferences {
  /** Minutes of inactivity before automatic sign-out; 0 = never. */
  idleSignOutMinutes: 0 | 15 | 30 | 60;
  /** Default "Last N days" range on the Overview ("all" = all time). */
  overviewRange: "7" | "30" | "90" | "all";
  /** Default layout of the Patient Registry. */
  patientListView: "list" | "cards";
}

const STORAGE_KEY = "ubuntumed.preferences";

export const DEFAULT_PREFERENCES: Preferences = {
  idleSignOutMinutes: 0,
  overviewRange: "30",
  patientListView: "list",
};

const listeners = new Set<() => void>();
let cached: Preferences | null = null;

function read(): Preferences {
  if (cached) return cached;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    cached = { ...DEFAULT_PREFERENCES, ...(raw ? (JSON.parse(raw) as Partial<Preferences>) : {}) };
  } catch {
    cached = DEFAULT_PREFERENCES;
  }
  return cached;
}

export function getPreferences(): Preferences {
  return typeof window === "undefined" ? DEFAULT_PREFERENCES : read();
}

export function setPreference<K extends keyof Preferences>(key: K, value: Preferences[K]) {
  cached = { ...read(), [key]: value };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
  } catch {
    // Storage unavailable (private mode, quota): keep the in-memory value.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function usePreferences(): Preferences {
  return useSyncExternalStore(subscribe, getPreferences, () => DEFAULT_PREFERENCES);
}
