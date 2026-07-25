"use client";

import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import {
  fetchLabRequests,
  fetchLabRequest,
  acceptLabRequestApi,
  submitLabResultsApi,
} from "./lab-request-api";
import type { LabTestResult } from "./types";

export type { LabPriority, LabStatus, ResultInterpretation, LabRequest } from "./types";
import type { LabRequest } from "./types";

export function useLabRequests(): LabRequest[] {
  const { data } = useQuery({ queryKey: ["lab-requests"], queryFn: fetchLabRequests });
  return data ?? [];
}

export function useLabRequest(id: string): LabRequest | undefined {
  const { data } = useQuery({
    queryKey: ["lab-requests", id],
    queryFn: () => fetchLabRequest(id),
    enabled: !!id,
  });
  return data;
}

// Same class of bug Slice B's usePatient()/notFound() hit: `useLabRequest()`
// returns undefined both while loading and when genuinely not found. Callers
// that render a not-found state must check this first. Shares the query
// cache with useLabRequest() (same key), so calling both triggers only one
// request.
export function useLabRequestIsLoading(id: string): boolean {
  const { isLoading } = useQuery({
    queryKey: ["lab-requests", id],
    queryFn: () => fetchLabRequest(id),
    enabled: !!id,
  });
  return isLoading;
}

export async function acceptLabRequest(id: string): Promise<void> {
  await acceptLabRequestApi(id);
  await queryClient.invalidateQueries({ queryKey: ["lab-requests"] });
  await queryClient.invalidateQueries({ queryKey: ["lab-requests", id] });
}

export async function submitLabResults(id: string, results: LabTestResult[]): Promise<void> {
  await submitLabResultsApi(id, results);
  await queryClient.invalidateQueries({ queryKey: ["lab-requests"] });
  await queryClient.invalidateQueries({ queryKey: ["lab-requests", id] });
}
