import type { RiskLevel } from "@/lib/patients/types";

const RISK_STYLES: Record<RiskLevel, { label: string; dotClass: string; badgeClass: string }> = {
  green: {
    label: "Green",
    dotClass: "bg-emerald-500",
    badgeClass: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  },
  yellow: {
    label: "Yellow",
    dotClass: "bg-yellow-400",
    badgeClass: "bg-yellow-50 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
  },
  orange: {
    label: "Orange",
    dotClass: "bg-orange-500",
    badgeClass: "bg-orange-50 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  },
  red: {
    label: "Red",
    dotClass: "bg-red-600",
    badgeClass: "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300",
  },
};

export function RiskBadge({
  level,
  size = "md",
}: {
  level: RiskLevel;
  size?: "sm" | "md" | "lg";
}) {
  const style = RISK_STYLES[level];
  const sizeClass =
    size === "lg"
      ? "px-4 py-2 text-base"
      : size === "sm"
        ? "px-2 py-0.5 text-xs"
        : "px-2.5 py-1 text-sm";

  return (
    <span
      className={`relative inline-flex items-center gap-1.5 rounded-full font-medium ${style.badgeClass} ${sizeClass} ${level === "red" ? "ring-2 ring-red-400 ring-offset-1 animate-pulse" : ""}`}
    >
      <span aria-hidden className={`h-2 w-2 rounded-full ${style.dotClass}`} />
      {style.label}
    </span>
  );
}
