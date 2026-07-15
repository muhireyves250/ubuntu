"use client";

import { useState } from "react";
import { MaternalCareReport } from "./maternal-care-report";
import { ReferralReport } from "./referral-report";
import { LaboratoryReport } from "./laboratory-report";
import { StaffPerformanceReport } from "./staff-performance-report";

const REPORT_TABS = ["Maternal Care", "Referral", "Laboratory", "Staff Performance"] as const;
type ReportTab = (typeof REPORT_TABS)[number];

const RANGE_OPTIONS: { value: string; label: string; days?: number }[] = [
  { value: "7", label: "Last 7 days", days: 7 },
  { value: "30", label: "Last 30 days", days: 30 },
  { value: "90", label: "Last 90 days", days: 90 },
  { value: "all", label: "All time", days: undefined },
];

export function ReportsContent() {
  const [tab, setTab] = useState<ReportTab>("Maternal Care");
  const [range, setRange] = useState("30");
  const selectedDays = RANGE_OPTIONS.find((r) => r.value === range)?.days;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Reports</h1>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
        >
          {RANGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="scrollbar-hidden flex w-fit gap-1 overflow-x-auto rounded-full border border-zinc-300 bg-[#ffeedb] p-1 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
        {REPORT_TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              tab === t
                ? "bg-[#0f766e] text-white shadow-sm shadow-teal-700/20"
                : "text-zinc-600 hover:bg-white/60 dark:text-zinc-300 dark:hover:bg-zinc-800/60"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-zinc-300 bg-[#ffeedb] p-5 dark:border-zinc-700 dark:bg-orange-950/40">
        {tab === "Maternal Care" && <MaternalCareReport days={selectedDays} />}
        {tab === "Referral" && <ReferralReport days={selectedDays} />}
        {tab === "Laboratory" && <LaboratoryReport days={selectedDays} />}
        {tab === "Staff Performance" && <StaffPerformanceReport days={selectedDays} />}
      </div>
    </div>
  );
}
