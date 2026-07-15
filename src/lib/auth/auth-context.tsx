"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import { DEMO_USERS, findDemoUserByRole } from "./demo-users";
import { findUserById, type DirectoryUser } from "./user-directory";
import type { Role } from "./types";

const SESSION_STORAGE_KEY = "ubuntumed.session";

const listeners = new Set<() => void>();

function emitSessionChange() {
  listeners.forEach((listener) => listener());
}

function subscribeToSession(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function getSessionSnapshot(): string | null {
  return window.localStorage.getItem(SESSION_STORAGE_KEY);
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

interface AuthContextValue {
  user: DirectoryUser | null;
  isHydrated: boolean;
  login: (userId: string, password: string) => "ok" | "invalid" | "suspended";
  logout: () => void;
  switchRole: (role: Role) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const sessionUserId = useSyncExternalStore(
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
    if (!sessionUserId) return null;
    const candidate = findUserById(sessionUserId);
    if (!candidate || candidate.status === "suspended") return null;
    return candidate;
  }, [sessionUserId]);

  const login = useCallback((userId: string, password: string): "ok" | "invalid" | "suspended" => {
    const candidate = findUserById(userId);
    if (!candidate) return "invalid";
    if (candidate.status === "suspended") return "suspended";
    if (candidate.password !== password) return "invalid";
    window.localStorage.setItem(SESSION_STORAGE_KEY, candidate.id);
    emitSessionChange();
    return "ok";
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    emitSessionChange();
  }, []);

  const switchRole = useCallback((role: Role) => {
    const nextUser = findDemoUserByRole(role);
    if (!nextUser) return;
    window.localStorage.setItem(SESSION_STORAGE_KEY, nextUser.id);
    emitSessionChange();
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isHydrated, login, logout, switchRole }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}

export { DEMO_USERS };
