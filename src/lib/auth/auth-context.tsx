"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import { DEMO_USERS, findDemoUserById, findDemoUserByRole } from "./demo-users";
import type { DemoUser, Role } from "./types";

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
  user: DemoUser | null;
  isHydrated: boolean;
  login: (userId: string, password: string) => boolean;
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

  const user = useMemo(
    () => (sessionUserId ? findDemoUserById(sessionUserId) ?? null : null),
    [sessionUserId],
  );

  const login = useCallback((userId: string, password: string) => {
    const candidate = findDemoUserById(userId);
    if (!candidate || candidate.password !== password) return false;
    window.localStorage.setItem(SESSION_STORAGE_KEY, candidate.id);
    emitSessionChange();
    return true;
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
