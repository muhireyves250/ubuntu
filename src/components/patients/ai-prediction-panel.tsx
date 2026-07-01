"use client";

import { useMemo, useState } from "react";
import { computePrediction, computePredictionHistory } from "@/lib/patients/ai-prediction";
import type { Visit } from "@/lib/patients/types";

function riskColor(value: number) {
  if (value >= 0.8) return { bar: "bg-red-500", text: "text-red-700", bg: "bg-red-50" };
  if (value >= 0.5) return { bar: "bg-yellow-400", text: "text-yellow-700", bg: "bg-yellow-50" };
  return { bar: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" };
}

function ProbabilityBar({ label, value, tooltip }: { label: string; value: number; tooltip: string }) {
  const [showTip, setShowTip] = useState(false);
  const pct = Math.round(value * 100);
  const col = riskColor(value);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
          <button
            type="button"
            onMouseEnter={() => setShowTip(true)}
            onMouseLeave={() => setShowTip(false)}
            className="relative flex h-4 w-4 items-center justify-center rounded-full border border-zinc-300 text-xs text-zinc-400 hover:border-zinc-400 hover:text-zinc-600"
          >
            ?
            {showTip && (
              <div className="absolute bottom-full left-1/2 z-10 mb-1.5 w-52 -translate-x-1/2 rounded-lg bg-zinc-900 px-3 py-2 text-xs text-white shadow-lg">
                {tooltip}
              </div>
            )}
          </button>
        </div>
        <span className={`text-sm font-semibold ${col.text}`}>{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all duration-700 ${col.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function RadarChart({ prediction }: { prediction: ReturnType<typeof computePrediction> }) {
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const r = 72;
  const axes = [
    { label: "Eclampsia", value: prediction.eclampsiaRisk },
    { label: "Hemorrhage", value: prediction.hemorrhageRisk },
    { label: "Preterm", value: prediction.pretermRisk },
    { label: "Emergency", value: prediction.emergencyRisk },
  ];
  const n = axes.length;

  function toXY(index: number, frac: number) {
    const angle = (Math.PI * 2 * index) / n - Math.PI / 2;
    return {
      x: cx + r * frac * Math.cos(angle),
      y: cy + r * frac * Math.sin(angle),
    };
  }

  const gridLevels = [0.25, 0.5, 0.75, 1.0];
  const dataPoints = axes.map((ax, i) => toXY(i, ax.value));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";

  const labelOffset = 18;

  return (
    <svg width={size} height={size} className="mx-auto overflow-visible">
      {/* Grid rings */}
      {gridLevels.map((lvl) => {
        const pts = axes.map((_, i) => toXY(i, lvl));
        const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";
        return (
          <path
            key={lvl}
            d={path}
            fill="none"
            stroke="#e4e4e7"
            strokeWidth={1}
            className="dark:stroke-zinc-700"
          />
        );
      })}
      {/* Axis lines */}
      {axes.map((_, i) => {
        const outer = toXY(i, 1);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={outer.x}
            y2={outer.y}
            stroke="#e4e4e7"
            strokeWidth={1}
            className="dark:stroke-zinc-700"
          />
        );
      })}
      {/* Data polygon */}
      <path d={dataPath} fill="rgba(15,118,110,0.18)" stroke="#0f766e" strokeWidth={2} strokeLinejoin="round" />
      {/* Data points */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={4} fill="#0f766e" />
      ))}
      {/* Labels */}
      {axes.map((ax, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        const lx = cx + (r + labelOffset) * Math.cos(angle);
        const ly = cy + (r + labelOffset) * Math.sin(angle);
        const anchor = Math.cos(angle) > 0.1 ? "start" : Math.cos(angle) < -0.1 ? "end" : "middle";
        return (
          <text
            key={i}
            x={lx}
            y={ly}
            textAnchor={anchor}
            dominantBaseline="middle"
            fontSize={10}
            fill="#71717a"
            fontWeight={500}
          >
            {ax.label}
            {" "}
            <tspan fontWeight={700} fill={riskColor(ax.value).bar.replace("bg-", "").includes("red") ? "#ef4444" : riskColor(ax.value).bar.includes("yellow") ? "#ca8a04" : "#10b981"}>
              {Math.round(ax.value * 100)}%
            </tspan>
          </text>
        );
      })}
    </svg>
  );
}

function LineChart({ history }: { history: ReturnType<typeof computePrediction>[] }) {
  if (history.length < 2) return null;
  const w = 380;
  const h = 100;
  const pad = { top: 10, right: 12, bottom: 24, left: 28 };
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;

  const series = [
    { key: "eclampsiaRisk" as const, color: "#f97316", label: "Eclampsia" },
    { key: "hemorrhageRisk" as const, color: "#ef4444", label: "Hemorrhage" },
    { key: "emergencyRisk" as const, color: "#8b5cf6", label: "Emergency" },
  ];

  function xOf(i: number) {
    return pad.left + (i / (history.length - 1)) * innerW;
  }
  function yOf(val: number) {
    return pad.top + innerH - val * innerH;
  }

  return (
    <div className="flex flex-col gap-2">
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
        {/* Y grid lines */}
        {[0, 0.5, 1].map((v) => (
          <line
            key={v}
            x1={pad.left}
            x2={w - pad.right}
            y1={yOf(v)}
            y2={yOf(v)}
            stroke="#e4e4e7"
            strokeWidth={1}
          />
        ))}
        {/* X axis labels */}
        {history.map((p, i) => (
          <text
            key={p.visitId}
            x={xOf(i)}
            y={h - 4}
            textAnchor="middle"
            fontSize={8}
            fill="#a1a1aa"
          >
            {new Date(p.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
          </text>
        ))}
        {/* Series lines */}
        {series.map(({ key, color }) => {
          const d = history
            .map((p, i) => `${i === 0 ? "M" : "L"}${xOf(i).toFixed(1)},${yOf(p[key]).toFixed(1)}`)
            .join(" ");
          return <path key={key} d={d} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />;
        })}
        {/* Dots */}
        {series.map(({ key, color }) =>
          history.map((p, i) => (
            <circle key={`${key}-${i}`} cx={xOf(i)} cy={yOf(p[key])} r={3} fill={color} />
          )),
        )}
      </svg>
      {/* Legend */}
      <div className="flex gap-4 text-xs text-zinc-500">
        {series.map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1">
            <span className="inline-block h-2 w-4 rounded-full" style={{ backgroundColor: color }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function AiPredictionTab({ visits }: { visits: Visit[] }) {
  const history = useMemo(() => computePredictionHistory(visits), [visits]);
  const latest = history[0] ?? null;

  if (!latest || visits.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-zinc-400">
            <path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9M9 3v6h12M9 3l12 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="font-medium text-zinc-600 dark:text-zinc-400">No prediction available</p>
        <p className="text-sm text-zinc-400">Record an assessment first to generate AI risk predictions.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">AI Prediction</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Based on assessment of {new Date(latest.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} ·{" "}
            <span className="font-medium">{Math.round(latest.confidence * 100)}% confidence</span>
          </p>
        </div>
        <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 ring-1 ring-teal-200 dark:bg-teal-950 dark:text-teal-300">
          AI · Simulated
        </span>
      </div>

      {/* Alert */}
      {latest.alert && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900 dark:bg-red-950/30">
          <svg viewBox="0 0 24 24" fill="none" className="mt-0.5 h-4 w-4 shrink-0 text-red-500">
            <path d="M12 9v4M12 17h.01M10.3 3.9l-8 13.8A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.3l-8-13.8a2 2 0 0 0-3.4 0Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <p className="text-sm font-medium text-red-700 dark:text-red-300">{latest.alert}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Probability bars */}
        <div className="flex flex-col gap-5 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Risk probabilities</p>
          <ProbabilityBar
            label="Eclampsia risk"
            value={latest.eclampsiaRisk}
            tooltip="Probability of eclamptic seizure based on blood pressure, symptom patterns, and obstetric history."
          />
          <ProbabilityBar
            label="Hemorrhage risk"
            value={latest.hemorrhageRisk}
            tooltip="Probability of postpartum or antepartum hemorrhage based on history and current signs."
          />
          <ProbabilityBar
            label="Preterm delivery risk"
            value={latest.pretermRisk}
            tooltip="Probability of delivery before 37 weeks based on gestational age, contractions, and risk factors."
          />
          <ProbabilityBar
            label="Emergency referral risk"
            value={latest.emergencyRisk}
            tooltip="Composite probability that an emergency referral will be required within 24 hours."
          />
        </div>

        {/* Radar chart */}
        <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Risk overview</p>
          <RadarChart prediction={latest} />
        </div>
      </div>

      {/* Top contributing factors */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Top contributing factors</p>
        <ul className="mt-3 flex flex-col gap-2">
          {latest.topFactors.map((factor, i) => (
            <li key={i} className="flex items-center gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-50 text-xs font-bold text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                {i + 1}
              </span>
              <span className="flex-1 text-sm text-zinc-700 dark:text-zinc-300 capitalize">{factor.label}</span>
              <span className="text-sm font-semibold text-zinc-500">
                {Math.round(factor.contribution * 100)}%
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Prediction history */}
      {history.length >= 2 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Prediction history</p>
          <div className="mt-4">
            <LineChart history={[...history].reverse()} />
          </div>
          <div className="mt-4 overflow-hidden rounded-lg border border-zinc-100 dark:border-zinc-800">
            <table className="w-full text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/60">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-400">Date</th>
                  <th className="px-3 py-2 text-center font-semibold text-zinc-400">Eclampsia</th>
                  <th className="px-3 py-2 text-center font-semibold text-zinc-400">Hemorrhage</th>
                  <th className="px-3 py-2 text-center font-semibold text-zinc-400">Emergency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {history.map((p) => (
                  <tr key={p.visitId} className="bg-white dark:bg-zinc-900">
                    <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                      {new Date(p.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className={`px-3 py-2 text-center font-semibold ${riskColor(p.eclampsiaRisk).text}`}>
                      {Math.round(p.eclampsiaRisk * 100)}%
                    </td>
                    <td className={`px-3 py-2 text-center font-semibold ${riskColor(p.hemorrhageRisk).text}`}>
                      {Math.round(p.hemorrhageRisk * 100)}%
                    </td>
                    <td className={`px-3 py-2 text-center font-semibold ${riskColor(p.emergencyRisk).text}`}>
                      {Math.round(p.emergencyRisk * 100)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
