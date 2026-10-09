"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchMyProfile } from "./account-api";

/** The signed-in user's own profile (email, phone, photo) from /auth/me. */
export function useMyProfile() {
  return useQuery({ queryKey: ["account", "me"], queryFn: fetchMyProfile, staleTime: 5 * 60_000, retry: false });
}
