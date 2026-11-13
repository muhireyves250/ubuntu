"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { getStoredAccessToken } from "@/lib/auth/auth-context";
import { queryClient } from "@/lib/query-client";

// Read state is stored per user by the API (/notification-reads), so a
// notification opened on one device shows as read on every other device.
const QUERY_KEY = ["notification-reads"];

async function fetchReadIds(): Promise<string[]> {
  return apiFetch<string[]>("/notification-reads", { token: getStoredAccessToken() ?? undefined });
}

export function useReadNotificationIdsQuery(): Set<string> {
  const { data } = useQuery({ queryKey: QUERY_KEY, queryFn: fetchReadIds });
  return useMemo(() => new Set(data ?? []), [data]);
}

export async function markNotificationReadApi(id: string): Promise<void> {
  // Optimistic: the dot disappears immediately, the server catches up.
  queryClient.setQueryData<string[]>(QUERY_KEY, (prev) => (prev?.includes(id) ? prev : [...(prev ?? []), id]));
  try {
    await apiFetch("/notification-reads", {
      method: "POST",
      body: { notificationId: id },
      token: getStoredAccessToken() ?? undefined,
    });
  } finally {
    await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  }
}
