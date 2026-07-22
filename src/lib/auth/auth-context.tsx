"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import { apiFetch, ApiError } from "@/lib/api/client";
import { mapBackendRole, mapBackendFacilityLevel, titleForRole } from "./role-mapping";
import type { FacilityLevel, Role } from "./types";

const AUTH_STORAGE_KEY = "ubuntumed.auth";

export interface AuthenticatedUser {
  id: string;
  username: string;
  name: string;
  title: string;
  facility: string;
  facilityLevel: FacilityLevel;
  role: Role;
}

interface StoredAuth {
  accessToken: string;
  user: AuthenticatedUser;
}

const listeners = new Set<() => void>();

function emitSessionChange() {
  listeners.forEach((listener) => listener());
}

function subscribeToSession(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function readStoredAuth(): StoredAuth | null {
  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAuth;
  } catch {
    return null;
  }
}

function getSessionSnapshot(): string | null {
  return window.localStorage.getItem(AUTH_STORAGE_KEY);
}

function getServerSessionSnapshot(): string | null {
  return null;
}

function subscribeNoop() {
  return () => {};
}

function getIsClientSnapshot() {
  return true;
}

function getIsClientServerSnapshot() {
  return false;
}

export type LoginResult = "ok" | "invalid" | "network_error";

interface AuthContextValue {
  user: AuthenticatedUser | null;
  isHydrated: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const rawStored = useSyncExternalStore(
    subscribeToSession,
    getSessionSnapshot,
    getServerSessionSnapshot,
  );
  const isHydrated = useSyncExternalStore(
    subscribeNoop,
    getIsClientSnapshot,
    getIsClientServerSnapshot,
  );

  const user = useMemo(() => {
    if (!rawStored) return null;
    const parsed = readStoredAuth();
    return parsed?.user ?? null;
  }, [rawStored]);

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    const normalizedEmail = email.trim().toLowerCase();
    try {
      const response = await apiFetch<{
        accessToken: string;
        user: {
          id: string;
          email: string;
          firstName: string;
          lastName: string;
          role: string;
          facility: { id: string; name: string; type: string; district: string } | null;
        };
      }>("/auth/login", { method: "POST", body: { email: normalizedEmail, password } });

      const role = mapBackendRole(response.user.role);
      const authUser: AuthenticatedUser = {
        id: response.user.id,
        username: response.user.email.split("@")[0],
        name: `${response.user.firstName} ${response.user.lastName}`,
        title: titleForRole(role),
        facility: response.user.facility?.name ?? "",
        facilityLevel: mapBackendFacilityLevel(response.user.facility?.type ?? "PRIMARY"),
        role,
      };

      const stored: StoredAuth = { accessToken: response.accessToken, user: authUser };
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(stored));
      emitSessionChange();
      return "ok";
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 401) return "invalid";
      return "network_error";
    }
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    emitSessionChange();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isHydrated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}

export function getStoredAccessToken(): string | null {
  return readStoredAuth()?.accessToken ?? null;
}

export function getStoredAuthenticatedUser(): AuthenticatedUser | null {
  return readStoredAuth()?.user ?? null;
}
