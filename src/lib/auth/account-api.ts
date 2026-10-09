import { apiFetch, ApiError } from "@/lib/api/client";
import { getStoredAccessToken } from "./auth-context";

function token() {
  return getStoredAccessToken() ?? undefined;
}

// Several auth endpoints reply 204 No Content. apiFetch treats an empty body
// as an error, so a 2xx ApiError from them is still a success.
async function noContent(path: string, body?: unknown): Promise<void> {
  try {
    await apiFetch<null>(path, { method: "POST", body, token: token() });
  } catch (err) {
    if (err instanceof ApiError && err.statusCode >= 200 && err.statusCode < 300) return;
    throw err;
  }
}

export function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  return noContent("/auth/change-password", { currentPassword, newPassword });
}

/** Invalidates every session for this account, on all devices. */
export function signOutEverywhere(): Promise<void> {
  return noContent("/auth/logout");
}

export interface AccountProfile {
  email: string;
  phone?: string | null;
  /** Small base64 data URL, or null when no photo is set. */
  avatarUrl?: string | null;
}

export function fetchMyProfile(): Promise<AccountProfile> {
  return apiFetch<AccountProfile>("/auth/me", { token: token() });
}

/** `avatar: ""` removes the photo; omitted fields are left unchanged. */
export function updateMyProfile(changes: { phone?: string; avatar?: string }): Promise<AccountProfile> {
  return apiFetch<AccountProfile>("/auth/me", { method: "PATCH", body: changes, token: token() });
}

export interface ActivityEntry {
  id: string;
  action: "CREATE" | "UPDATE" | "DELETE" | string;
  entity: string;
  entityId: string;
  ipAddress: string | null;
  createdAt: string;
}

export function fetchMyActivity(): Promise<ActivityEntry[]> {
  return apiFetch<ActivityEntry[]>("/auth/me/activity", { token: token() });
}
