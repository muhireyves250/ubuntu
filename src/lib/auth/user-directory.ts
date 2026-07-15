"use client";

import { useMemo, useSyncExternalStore } from "react";
import { DEMO_USERS } from "./demo-users";
import type { DemoUser, Role, FacilityLevel } from "./types";
import {
  subscribeToManagedStaff,
  getManagedStaffSnapshot,
  getServerManagedStaffSnapshot,
  type ManagedStaffAccount,
} from "./managed-staff-storage";
import {
  subscribeToStaffOverrides,
  getStaffOverridesSnapshot,
  getServerStaffOverridesSnapshot,
  type StaffOverride,
} from "./staff-overrides-storage";

export interface DirectoryUser {
  id: string;
  username: string;
  name: string;
  title: string;
  facility: string;
  role: Role;
  facilityLevel: FacilityLevel;
  status: "active" | "suspended";
  password: string;
  source: "demo" | "managed";
}

function demoUserToDirectoryUser(
  user: DemoUser,
  overrides: Record<string, StaffOverride>,
): DirectoryUser {
  const override = overrides[user.id];
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    title: user.title,
    facility: user.facility,
    role: user.role,
    facilityLevel: user.facilityLevel,
    status: override?.status === "suspended" ? "suspended" : "active",
    password: override?.password ?? user.password,
    source: "demo",
  };
}

function managedStaffToDirectoryUser(account: ManagedStaffAccount): DirectoryUser {
  return {
    id: account.id,
    username: account.username,
    name: account.name,
    title: account.title,
    facility: account.facility,
    role: account.role,
    facilityLevel: account.facilityLevel,
    status: account.status,
    password: account.password,
    source: "managed",
  };
}

export function getAllDirectoryUsers(): DirectoryUser[] {
  const overrides = getStaffOverridesSnapshot();
  const demoUsers = DEMO_USERS.map((u) => demoUserToDirectoryUser(u, overrides));
  const managedUsers = getManagedStaffSnapshot().map(managedStaffToDirectoryUser);
  return [...demoUsers, ...managedUsers];
}

export function findUserById(id: string): DirectoryUser | undefined {
  return getAllDirectoryUsers().find((u) => u.id === id);
}

export function findUserByUsername(username: string): DirectoryUser | undefined {
  const normalized = username.trim().toLowerCase();
  return getAllDirectoryUsers().find((u) => u.username.toLowerCase() === normalized);
}

export function isUsernameTaken(username: string): boolean {
  return findUserByUsername(username) !== undefined;
}

// Excludes hospital_admin entirely — an admin can never see, suspend, or
// reset another admin account (including their own) through this view.
export function useFacilityStaff(facility: string): DirectoryUser[] {
  const overrides = useSyncExternalStore(
    subscribeToStaffOverrides,
    getStaffOverridesSnapshot,
    getServerStaffOverridesSnapshot,
  );
  const managedStaff = useSyncExternalStore(
    subscribeToManagedStaff,
    getManagedStaffSnapshot,
    getServerManagedStaffSnapshot,
  );
  return useMemo(() => {
    const demoUsers = DEMO_USERS.map((u) => demoUserToDirectoryUser(u, overrides));
    const managedUsers = managedStaff.map(managedStaffToDirectoryUser);
    return [...demoUsers, ...managedUsers].filter(
      (u) => u.facility === facility && u.role !== "hospital_admin",
    );
  }, [overrides, managedStaff, facility]);
}
