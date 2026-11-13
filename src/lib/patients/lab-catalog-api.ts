"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { getStoredAccessToken } from "@/lib/auth/auth-context";

// The lab catalog comes from the API (GET /lab-catalog): the tests a nurse
// can request, by category, and for each the recognised answers and which of
// them are normal. Lab nurses pick from these lists instead of free-typing.
//
// Two shapes:
// - single-answer tests: one dropdown (singleAnswers)
// - panel tests: one dropdown per reading (panels), saved as a single
//   result string "Reading: value; Reading: value"
// Every dropdown also offers "Other…" with a free-text box.

export interface SingleResultOptions {
  options: string[];
  /** Values that count as normal. Absent for tests with no normal (e.g. blood group). */
  normal?: string[];
}

export interface PanelReading {
  label: string;
  options: string[];
  normal: string[];
}

export interface LabCatalog {
  categories: { category: string; tests: string[] }[];
  singleAnswers: Record<string, SingleResultOptions>;
  panels: Record<string, PanelReading[]>;
}

const EMPTY_CATALOG: LabCatalog = { categories: [], singleAnswers: {}, panels: {} };

export function useLabCatalogQuery() {
  return useQuery({
    queryKey: ["lab-catalog"],
    queryFn: () => apiFetch<LabCatalog>("/lab-catalog", { token: getStoredAccessToken() ?? undefined }),
    // Reference data: changes only with a new API release.
    staleTime: Infinity,
  });
}

export function useLabCatalog(): LabCatalog {
  return useLabCatalogQuery().data ?? EMPTY_CATALOG;
}

export const OTHER_OPTION = "__other__";

/** "Colour: Yellow; Protein: Trace" -> { Colour: "Yellow", Protein: "Trace" } */
export function parsePanelResult(result: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const part of result.split("; ")) {
    const at = part.indexOf(": ");
    if (at > 0) values[part.slice(0, at)] = part.slice(at + 2);
  }
  return values;
}

export function formatPanelResult(panel: PanelReading[], values: Record<string, string>): string {
  return panel
    .filter((reading) => values[reading.label])
    .map((reading) => `${reading.label}: ${values[reading.label]}`)
    .join("; ");
}

/**
 * Whether an answer is outside the catalog's normal list — used to suggest
 * "Abnormal" as the nurse picks (null when the test has no normal list).
 */
export function isAbnormalResult(catalog: LabCatalog, testName: string, result: string): boolean | null {
  const panel = catalog.panels[testName];
  if (panel) {
    const values = parsePanelResult(result);
    return panel.some((reading) => values[reading.label] && !reading.normal.includes(values[reading.label]));
  }
  const single = catalog.singleAnswers[testName];
  if (single?.normal && result) return !single.normal.includes(result);
  return null;
}
