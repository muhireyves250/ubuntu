"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { getStoredAccessToken } from "@/lib/auth/auth-context";
import type { NotificationAlert } from "./use-patients";

// The API builds each user's notifications (GET /notification-feed); the
// browser only renders them.
export const NOTIFICATION_FEED_KEY = ["notification-feed"];

async function fetchNotificationFeed(): Promise<NotificationAlert[]> {
  return apiFetch<NotificationAlert[]>("/notification-feed", { token: getStoredAccessToken() ?? undefined });
}

export function useNotificationFeed(): NotificationAlert[] {
  const { data } = useQuery({
    queryKey: NOTIFICATION_FEED_KEY,
    queryFn: fetchNotificationFeed,
    // Picks up other users' changes; our own changes refresh it straight
    // away (see query-client.ts).
    refetchInterval: 60_000,
  });
  return data ?? [];
}
