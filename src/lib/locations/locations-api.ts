"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { getStoredAccessToken } from "@/lib/auth/auth-context";

// Rwanda's administrative units, served one level at a time by the API
// (GET /locations?province=&district=&sector=&cell=).
export interface LocationPath {
  province?: string;
  district?: string;
  sector?: string;
  cell?: string;
}

/** The units below `path` (provinces for {}); [] while loading or when `path` is null. */
export function useLocationChildren(path: LocationPath | null): string[] {
  const params = new URLSearchParams(
    Object.entries(path ?? {}).filter((entry): entry is [string, string] => !!entry[1]),
  ).toString();
  const { data } = useQuery({
    queryKey: ["locations", params],
    queryFn: () =>
      apiFetch<string[]>(`/locations${params ? `?${params}` : ""}`, { token: getStoredAccessToken() ?? undefined }),
    enabled: path !== null,
    // Reference data: changes only with a new API release.
    staleTime: Infinity,
  });
  return path === null ? [] : (data ?? []);
}

/** The province a district belongs to, for records saved without one. */
export async function fetchProvinceOf(district: string): Promise<string | null> {
  const { province } = await apiFetch<{ province: string | null }>(
    `/locations/province-of?district=${encodeURIComponent(district)}`,
    { token: getStoredAccessToken() ?? undefined },
  );
  return province;
}
