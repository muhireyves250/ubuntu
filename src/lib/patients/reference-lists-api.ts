"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { getStoredAccessToken } from "@/lib/auth/auth-context";

// Reference lists the forms pick from, served by the API
// (GET /reference-lists): the diagnosis catalog and the patient
// registration/edit dropdowns.

export interface DiagnosisCatalogEntry {
  code: string;
  title: string;
}

export interface PatientFormOptions {
  genders: string[];
  maritalStatuses: string[];
  relationships: string[];
  bloodGroups: string[];
  religions: string[];
  insuranceTypes: { value: string; label: string }[];
  chronicConditions: string[];
}

export interface ReferenceLists {
  diagnosisCategories: { category: string; diagnoses: DiagnosisCatalogEntry[] }[];
  patientForm: PatientFormOptions;
  /** A CHW follow-up is due this many days after it is assigned. */
  chwFollowUpDueDays: number;
}

/** undefined until loaded (the dashboard loads it as soon as you sign in). */
export function useReferenceLists(): ReferenceLists | undefined {
  const { data } = useQuery({
    queryKey: ["reference-lists"],
    queryFn: () => apiFetch<ReferenceLists>("/reference-lists", { token: getStoredAccessToken() ?? undefined }),
    // Reference data: changes only with a new API release.
    staleTime: Infinity,
  });
  return data;
}
