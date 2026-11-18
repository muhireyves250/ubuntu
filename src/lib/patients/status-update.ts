import type { RiskLevel } from "./types";

/**
 * What finishing an assessment does to the patient's case, given the colour a
 * clinician decided: a red case is sent onward; an open case is closed when
 * the decided colour says the patient has improved.
 */
export function statusUpdateFor(
  decided: RiskLevel,
  hasOpenCase: boolean,
): { escalate: boolean; closeAs: "stable" | "improved" | null } {
  if (decided === "red") return { escalate: true, closeAs: null };
  if (hasOpenCase && decided === "green") return { escalate: false, closeAs: "stable" };
  if (hasOpenCase && decided === "yellow") return { escalate: false, closeAs: "improved" };
  return { escalate: false, closeAs: null };
}
