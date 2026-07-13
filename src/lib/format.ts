import type { Patient, Visit } from "./patients/types";

export function shortId(id: string): string {
  return id.replace(/^patient-/, "PT-").slice(0, 14).toUpperCase();
}

export function computeAge(dateOfBirth: string): number {
  const dob = new Date(`${dateOfBirth}T00:00:00`);
  const diffMs = Date.now() - dob.getTime();
  return Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
}

export function fullName(patient: Pick<Patient, "firstName" | "lastName">): string {
  return `${patient.firstName} ${patient.lastName}`.trim();
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function formatLabs(visit: Visit): string {
  const labs = visit.labs;
  if (!labs) return "—";
  const parts: string[] = [];
  if (labs.bpSystolic != null && labs.bpDiastolic != null) {
    parts.push(`BP ${labs.bpSystolic}/${labs.bpDiastolic}`);
  }
  if (labs.hemoglobin != null) parts.push(`Hb ${labs.hemoglobin}g/dl`);
  if (labs.platelets != null) parts.push(`Plt ${labs.platelets}k`);
  if (labs.bloodSugar != null) parts.push(`BG ${labs.bloodSugar}mmol/L`);
  if (labs.urineProtein) parts.push(`Urine protein ${labs.urineProtein}`);
  if (labs.fetalHeartRate != null) parts.push(`FHR ${labs.fetalHeartRate}bpm`);
  if (labs.temperature != null) parts.push(`Temp ${labs.temperature}°C`);
  if (labs.pulse != null) parts.push(`Pulse ${labs.pulse}bpm`);
  if (labs.fundalHeight != null) parts.push(`Fundal height ${labs.fundalHeight}cm`);
  if (labs.weight != null) parts.push(`Weight ${labs.weight}kg`);
  if (labs.edema) parts.push(`Edema ${labs.edema}`);
  return parts.length > 0 ? parts.join(" · ") : "—";
}

export function relativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}
