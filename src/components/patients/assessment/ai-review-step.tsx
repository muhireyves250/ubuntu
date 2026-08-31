"use client";

import { Fragment, useState } from "react";
import { IconActivity, IconAlert } from "@/components/dashboard/icons";
import type { Patient, Visit, LabTestResult } from "@/lib/patients/types";
import type { RiskPrediction } from "@/lib/patients/risk-prediction-api";
import { SYMPTOM_CHECKLIST } from "@/lib/patients/symptom-checklist";
import { runAiPrediction, useRiskPredictionForVisit, confirmAiRisk } from "@/lib/patients/use-patients";
import { queryClient } from "@/lib/query-client";
import { LabResultCommentBox } from "@/components/patients/lab-result-comment-box";

function InterpretationBadge({ value }: { value: LabTestResult["interpretation"] }) {
  if (value === "Normal") {
    return (
      <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
        Normal
      </span>
    );
  }
  if (value === "Abnormal") {
    return (
      <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
        Abnormal
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-0.5 text-[10px] font-extrabold text-red-700 dark:bg-red-950/40 dark:text-red-400 animate-pulse">
      Critical
    </span>
  );
}

function RiskMeter({ pct, label }: { pct: number; label: string }) {
  const isRed = pct >= 75;
  const isAmber = pct >= 40 && pct < 75;
  const barColor = isRed ? "bg-red-600" : isAmber ? "bg-amber-500" : "bg-teal-600";
  const textColor = isRed
    ? "text-red-700 dark:text-red-400"
    : isAmber
      ? "text-amber-700 dark:text-amber-400"
      : "text-teal-700 dark:text-teal-400";
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between text-xs font-semibold">
        <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
        <span className={`font-mono font-bold ${textColor}`}>{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div className={`h-full rounded-full transition-all duration-300 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-zinc-100 py-1.5 text-sm dark:border-zinc-800">
      <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className="font-semibold text-zinc-950 dark:text-zinc-50">{value}</span>
    </div>
  );
}

const RISK_BANNER_CONFIG = {
  red: { bg: "bg-red-50 border-red-300 dark:bg-red-950/20 dark:border-red-900/60", text: "text-red-800 dark:text-red-300", badge: "bg-red-600 text-white", label: "RED CASE — OBSTETRIC EMERGENCY", icon: "🚨" },
  orange: { bg: "bg-orange-50 border-orange-300 dark:bg-orange-950/20 dark:border-orange-900/60", text: "text-orange-800 dark:text-orange-300", badge: "bg-orange-600 text-white", label: "ORANGE CASE — HIGH COMPLICATION RISK", icon: "⚠" },
  yellow: { bg: "bg-yellow-50 border-yellow-300 dark:bg-yellow-950/20 dark:border-yellow-900/60", text: "text-yellow-800 dark:text-yellow-300", badge: "bg-amber-500 text-white", label: "YELLOW CASE — ELEVATED RISK", icon: "⚡" },
  green: { bg: "bg-teal-50 border-teal-300 dark:bg-teal-950/20 dark:border-teal-900/60", text: "text-teal-800 dark:text-teal-300", badge: "bg-teal-600 text-white", label: "GREEN CASE — LOW CLINICAL RISK", icon: "✓" },
};

export function AiReviewStep({
  patient,
  visit,
  onConfirm,
}: {
  patient: Patient;
  visit: Visit;
  onConfirm: (prediction: RiskPrediction) => void;
}) {
  const labResults: LabTestResult[] = visit.labResults ?? [];
  const existingPrediction = useRiskPredictionForVisit(visit.id);
  const [prediction, setPrediction] = useState<RiskPrediction | null>(null);
  const shownPrediction = prediction ?? existingPrediction;
  const [isRunning, setIsRunning] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendToAi() {
    setError(null);
    setIsRunning(true);
    try {
      const result = await runAiPrediction(visit.id);
      setPrediction(result);
      // Red cases are transferred (if this facility can't manage them)
      // only after the finalize pipeline's treatment/stabilization steps
      // complete — see FinalizeAssessmentBlocker's Vaccination step — not
      // immediately here, so the patient is stabilized before transport.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach AI prediction service. You may still proceed manually.");
    } finally {
      setIsRunning(false);
    }
  }

  const symptomLabels = visit.symptomIds
    .map((id) => SYMPTOM_CHECKLIST.find((s) => s.id === id)?.label ?? id)
    .filter(Boolean);

  const v = visit.labs;
  const config = shownPrediction ? RISK_BANNER_CONFIG[shownPrediction.predictedRiskLevel] : null;

  const getHbStyle = (val: number | undefined) => {
    if (val == null) return "text-zinc-950 dark:text-zinc-50";
    if (val < 7) return "text-red-600 font-bold dark:text-red-400";
    if (val < 11) return "text-amber-600 font-semibold dark:text-amber-400";
    return "text-zinc-950 dark:text-zinc-50";
  };

  return (
    <div className="flex flex-col gap-4">
      {config && (
        <div className={`flex items-center justify-between rounded-xl border p-4 shadow-sm ${config.bg} ${config.text}`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{config.icon}</span>
            <div className="text-sm">
              <span className="font-extrabold uppercase tracking-wide">{config.label}</span>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                For patient <strong className="font-bold text-zinc-800 dark:text-zinc-200">{patient.firstName} {patient.lastName}</strong>
              </p>
            </div>
          </div>
          <span className={`rounded-lg px-3 py-1.5 text-xs font-black uppercase tracking-wider ${config.badge}`}>
            {shownPrediction!.predictedRiskLevel} CASE
          </span>
        </div>
      )}

      {shownPrediction?.predictedRiskLevel === "red" && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-300 bg-red-50 p-4 text-red-800 shadow-sm dark:border-red-700 dark:bg-red-950/30 dark:text-red-300">
          <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="text-sm">
            <p className="text-xs font-bold uppercase tracking-wide">Emergency transfer pending stabilization</p>
            <p className="mt-1 text-xs opacity-90">
              If this facility can&apos;t manage this case, the patient will be transferred automatically once
              treatment is complete — after Final Diagnosis, Treatment, Consumables, and Follow-up &amp; Discharge.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-5 items-stretch">
        <div className="lg:col-span-3 overflow-hidden rounded-xl border border-zinc-300 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900 flex flex-col">
          <div className="flex items-center gap-2 border-b border-zinc-300 bg-[#ffeedb] px-4 py-2.5 dark:border-zinc-700 dark:bg-orange-950/40">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-teal-700 dark:bg-zinc-900 dark:text-teal-400">
              <IconActivity className="h-4 w-4" />
            </span>
            <h3 className="font-bold text-sm text-zinc-950 dark:text-zinc-50">Clinical Assessment Summary</h3>
          </div>
          <div className="p-4 flex-1 flex flex-col gap-4 overflow-y-auto max-h-[50vh] scrollbar-thin">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1.5">
                Vitals &amp; Physical Indicators
              </p>
              {v ? (
                <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                  {v.bpSystolic != null && v.bpDiastolic != null && (
                    <Field label="Blood Pressure" value={`${v.bpSystolic}/${v.bpDiastolic} mmHg`} />
                  )}
                  {v.hemoglobin != null && (
                    <Field label="Hemoglobin (Hb)" value={<span className={getHbStyle(v.hemoglobin)}>{v.hemoglobin} g/dL</span>} />
                  )}
                  {v.bloodSugar != null && <Field label="Blood Glucose" value={`${v.bloodSugar} mmol/L`} />}
                  {v.temperature != null && <Field label="Temperature" value={`${v.temperature} °C`} />}
                  {v.pulse != null && <Field label="Pulse Rate" value={`${v.pulse} bpm`} />}
                  {v.weight != null && <Field label="Weight" value={`${v.weight} kg`} />}
                </div>
              ) : (
                <p className="text-xs text-zinc-400 italic">No vital parameters recorded.</p>
              )}
            </div>

            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-2">
                Signs &amp; Symptoms
              </p>
              {symptomLabels.length === 0 ? (
                <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">No symptoms checked by nurse.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {symptomLabels.map((lbl) => (
                    <span key={lbl} className="rounded bg-zinc-100 border border-zinc-200 px-2 py-0.5 text-[10px] font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      {lbl}
                    </span>
                  ))}
                </div>
              )}
              {visit.notes && (
                <div className="mt-2 bg-zinc-50 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800 dark:bg-zinc-950/20 text-xs italic text-zinc-600 dark:text-zinc-400">
                  <span className="font-bold not-italic block text-[10px] mb-0.5 text-zinc-700 dark:text-zinc-300">Nurse Notes:</span>
                  {visit.notes}
                </div>
              )}
            </div>

            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-2">
                Laboratory Test Results
              </p>
              {labResults.length === 0 ? (
                <p className="text-xs text-zinc-400 italic">No laboratory files are linked to this visit.</p>
              ) : (
                <div className="overflow-hidden border border-zinc-200 rounded-lg dark:border-zinc-800">
                  <table className="w-full text-left text-xs divide-y divide-zinc-200 dark:divide-zinc-800">
                    <thead className="bg-[#ffeedb] text-[9px] font-bold uppercase tracking-wider text-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-400">
                      <tr>
                        <th className="px-3 py-2">Test Name</th>
                        <th className="px-3 py-2">Result</th>
                        <th className="px-3 py-2">Unit</th>
                        <th className="px-3 py-2">Interpreter</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-900">
                      {labResults.map((r) => (
                        <Fragment key={r.id}>
                          <tr>
                            <td className="px-3 py-2 font-medium text-zinc-900 dark:text-zinc-50">{r.testName}</td>
                            <td className="px-3 py-2 font-mono">{r.result}</td>
                            <td className="px-3 py-2 text-zinc-500">{r.unit}</td>
                            <td className="px-3 py-2"><InterpretationBadge value={r.interpretation} /></td>
                          </tr>
                          <tr>
                            <td colSpan={4} className="px-3 pb-3">
                              <LabResultCommentBox
                                result={r}
                                onPosted={() => queryClient.invalidateQueries({ queryKey: ["visits", "pregnancy", visit.pregnancyId] })}
                              />
                            </td>
                          </tr>
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 overflow-hidden rounded-xl border border-zinc-300 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900 flex flex-col">
          <div className="flex items-center gap-2 border-b border-zinc-300 bg-[#ffeedb] px-4 py-2.5 dark:border-zinc-700 dark:bg-orange-950/40">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-teal-800 text-[10px] font-extrabold dark:bg-zinc-900 dark:text-teal-400">
              AI
            </span>
            <h3 className="font-bold text-sm text-zinc-950 dark:text-zinc-50">AI Diagnostic Intelligence</h3>
          </div>
          <div className="p-4 flex-1 flex flex-col gap-4 overflow-y-auto max-h-[50vh] scrollbar-thin">
            {!shownPrediction ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Run the AI model against this visit&apos;s vitals, symptoms, consultation history, and labs.
                </p>
                {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
                <button
                  type="button"
                  disabled={isRunning}
                  onClick={handleSendToAi}
                  className="rounded-xl bg-[#0f766e] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRunning ? "Sending…" : "Send to AI"}
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <RiskMeter pct={Math.round(shownPrediction.eclampsiaProb * 100)} label="Eclampsia" />
                  <RiskMeter pct={Math.round(shownPrediction.hemorrhageProb * 100)} label="Hemorrhage" />
                  <RiskMeter pct={Math.round(shownPrediction.maternalDeathProb * 100)} label="Maternal Death" />
                  <RiskMeter pct={Math.round(shownPrediction.emergencyReferralProb * 100)} label="Emergency Referral" />
                </div>
                <div className="rounded-lg border border-teal-200 bg-teal-50/40 p-3 dark:border-teal-900/25 dark:bg-teal-950/25 mt-auto">
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-teal-700 dark:text-teal-400 block mb-1">
                    AI Recommendation
                  </span>
                  <p className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300 font-medium">
                    {shownPrediction.recommendation}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        disabled={!shownPrediction || isConfirming}
        onClick={async () => {
          if (!shownPrediction) return;
          setIsConfirming(true);
          try {
            // Reflects the AI's finding in the visit's actual risk status
            // right away — separate from the emergency transfer, which
            // still only happens once treatment is complete.
            await confirmAiRisk(
              visit.id,
              shownPrediction.predictedRiskLevel,
              [
                `AI predicted ${shownPrediction.predictedRiskLevel} risk (${shownPrediction.modelVersion})`,
                ...shownPrediction.suggestedDiagnoses.map((d) => d.title),
              ],
            );
          } catch {
            // Best-effort — don't block the nurse from proceeding with
            // the assessment just because this status sync failed.
          } finally {
            setIsConfirming(false);
          }
          onConfirm(shownPrediction);
        }}
        className="w-full rounded-xl bg-[#0f766e] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isConfirming ? "Updating risk status…" : "Continue to Final Diagnosis →"}
      </button>
    </div>
  );
}
