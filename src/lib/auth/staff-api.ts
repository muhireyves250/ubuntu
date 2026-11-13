"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { getStoredAccessToken } from "@/lib/auth/auth-context";
import { queryClient } from "@/lib/query-client";
import { mapBackendRole, usernameToEmail } from "./role-mapping";
import type { Role } from "./types";

// Staff Management is backed by the API: accounts a hospital admin creates
// can really log in, and suspending one blocks it on every device at once.

export type AssignableRole = Extract<Role, "nurse" | "lab_nurse" | "gynecologist" | "pharmacist">;

export interface StaffMember {
  id: string;
  username: string;
  name: string;
  title?: string;
  role: Role;
  status: "active" | "suspended";
}

interface BackendStaff {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  title: string | null;
  role: string;
  isActive: boolean;
}

const ROLE_TO_BACKEND: Record<AssignableRole, string> = {
  nurse: "NURSE",
  lab_nurse: "LAB_TECHNICIAN",
  gynecologist: "GYNECOLOGIST",
  pharmacist: "PHARMACIST",
};

function toStaffMember(s: BackendStaff): StaffMember {
  return {
    id: s.id,
    username: s.email.split("@")[0],
    name: `${s.firstName} ${s.lastName}`.trim(),
    title: s.title ?? undefined,
    role: mapBackendRole(s.role),
    status: s.isActive ? "active" : "suspended",
  };
}

function token() {
  return getStoredAccessToken() ?? undefined;
}

async function fetchStaff(): Promise<StaffMember[]> {
  const list = await apiFetch<BackendStaff[]>("/staff", { token: token() });
  return list.map(toStaffMember);
}

export function useFacilityStaff(): StaffMember[] {
  const { data } = useQuery({ queryKey: ["staff"], queryFn: fetchStaff });
  return data ?? [];
}

export async function registerStaff(input: {
  username: string;
  name: string;
  title: string;
  role: AssignableRole;
  password: string;
}): Promise<void> {
  await apiFetch("/staff", {
    method: "POST",
    body: {
      email: usernameToEmail(input.username),
      name: input.name,
      title: input.title,
      role: ROLE_TO_BACKEND[input.role],
      password: input.password,
    },
    token: token(),
  });
  await queryClient.invalidateQueries({ queryKey: ["staff"] });
}

export async function setStaffStatus(id: string, status: "active" | "suspended"): Promise<void> {
  await apiFetch(`/staff/${id}/status`, { method: "PATCH", body: { status }, token: token() });
  await queryClient.invalidateQueries({ queryKey: ["staff"] });
}

export async function resetStaffPassword(id: string, password: string): Promise<void> {
  await apiFetch(`/staff/${id}/password`, { method: "PATCH", body: { password }, token: token() });
}
