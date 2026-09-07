"use client";

import { useEffect, useState } from "react";
import { createPregnancy } from "@/lib/patients/use-patients";
import { computeEdd, gestationalAgeWeeks } from "@/lib/patients/pregnancy";
import { IconClose } from "@/components/dashboard/icons";
import type { Pregnancy, PregnancyMedicalHistory, ScreeningResult } from "@/lib/patients/types";

const EMPTY_HISTORY: Required<Omit<PregnancyMedicalHistory, "currentMedicationDetails" | "mentalIllnessNotes" | "hivTestResult" | "torchScreeningNotes" | "stiScreeningResult" | "familyPlanningMethod" | "familyPlanningDurationMonths" | "disabilitiesNotes">> = {
  historySurgicalOrCervicalTrauma: false,
  historyGynecologicalProblem: false,
  currentlyOnMedication: false,
  historyDiabetes: false,
  historyLungDisease: false,
  historyHypertension: false,
  alcoholUse: false,
  historyKidneyProblems: false,
  tobaccoUse: false,
  historyHeartDisease: false,
  historyPretermDelivery: false,
  historyMacrosomia: false,
  historyCongenitalMalformation: false,
  historyMultiplePregnancy: false,
  historyAntepartumBleeding: false,
  recurrentPregnancyLoss: false,
  familyPlanningBeforePregnancy: false,
  historyLowBirthWeightDelivery: false,
};

function HistoryCheckbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-zinc-300 text-teal-700 focus:ring-teal-600"
      />
      {label}
    </label>
  );
}

export function NewPregnancyModal({
  patientId,
  onClose,
  onCreated,
}: {
  patientId: string;
  onClose: () => void;
  onCreated: (pregnancy: Pregnancy) => void;
}) {
  const [gravidity, setGravidity] = useState("");
  const [parity, setParity] = useState("");
  const [termDeliveries, setTermDeliveries] = useState("0");
  const [prematureDeliveriesCount, setPrematureDeliveriesCount] = useState("0");
  const [numberOfAbortions, setNumberOfAbortions] = useState("0");
  const [aliveChildren, setAliveChildren] = useState("0");
  const [ageOfLastBornYears, setAgeOfLastBornYears] = useState("");
  const [monthsOfLastBorn, setMonthsOfLastBorn] = useState("");
  const [previousCS, setPreviousCS] = useState("0");
  const [previousPPH, setPreviousPPH] = useState(false);
  const [previousEclampsia, setPreviousEclampsia] = useState(false);
  const [previousStillbirth, setPreviousStillbirth] = useState(false);
  const [lmpDate, setLmpDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState(EMPTY_HISTORY);
  const [currentMedicationDetails, setCurrentMedicationDetails] = useState("");
  const [mentalIllnessNotes, setMentalIllnessNotes] = useState("");
  const [hivTestResult, setHivTestResult] = useState<ScreeningResult | "">("");
  const [torchScreeningNotes, setTorchScreeningNotes] = useState("");
  const [stiScreeningResult, setStiScreeningResult] = useState<ScreeningResult | "">("");
  const [familyPlanningMethod, setFamilyPlanningMethod] = useState("");
  const [familyPlanningDurationMonths, setFamilyPlanningDurationMonths] = useState("");
  const [disabilitiesNotes, setDisabilitiesNotes] = useState("");

  function toggleHistory(key: keyof typeof EMPTY_HISTORY) {
    setHistory((current) => ({ ...current, [key]: !current[key] }));
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const edd = lmpDate ? computeEdd(lmpDate) : null;
  const weeks = lmpDate ? gestationalAgeWeeks(lmpDate) : null;

  function handleLmpChange(value: string) {
    setLmpDate(value);
    if (!startDate) setStartDate(value);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const pregnancy = await createPregnancy({
        patientId,
        gravidity: Number(gravidity),
        parity: Number(parity),
        termDeliveries: termDeliveries ? Number(termDeliveries) : undefined,
        prematureDeliveriesCount: prematureDeliveriesCount ? Number(prematureDeliveriesCount) : undefined,
        numberOfAbortions: numberOfAbortions ? Number(numberOfAbortions) : undefined,
        aliveChildren: aliveChildren ? Number(aliveChildren) : undefined,
        ageOfLastBornYears: ageOfLastBornYears ? Number(ageOfLastBornYears) : undefined,
        monthsOfLastBorn: monthsOfLastBorn ? Number(monthsOfLastBorn) : undefined,
        previousCS: Number(previousCS),
        previousPPH,
        previousEclampsia,
        previousStillbirth,
        lmpDate,
        startDate,
        ...history,
        currentMedicationDetails: currentMedicationDetails || undefined,
        mentalIllnessNotes: mentalIllnessNotes || undefined,
        hivTestResult: hivTestResult || undefined,
        torchScreeningNotes: torchScreeningNotes || undefined,
        stiScreeningResult: stiScreeningResult || undefined,
        familyPlanningMethod: familyPlanningMethod || undefined,
        familyPlanningDurationMonths: familyPlanningDurationMonths ? Number(familyPlanningDurationMonths) : undefined,
        disabilitiesNotes: disabilitiesNotes || undefined,
      });
      onCreated(pregnancy);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not create pregnancy",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
      />

      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-300 bg-[#ffeedb] p-6 shadow-2xl dark:border-zinc-700 dark:bg-orange-950/40">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            New Pregnancy
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-5 flex flex-col gap-4 rounded-xl border border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
        >
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </p>
          )}

          <div className="flex gap-4">
            <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Gravidity
              <input
                type="number"
                required
                min={1}
                value={gravidity}
                onChange={(event) => setGravidity(event.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </label>
            <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Parity
              <input
                type="number"
                required
                min={0}
                value={parity}
                onChange={(event) => setParity(event.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Previous C-sections
            <input
              type="number"
              required
              min={0}
              value={previousCS}
              onChange={(event) => setPreviousCS(event.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>

          <fieldset>
            <legend className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Obstetric counts
            </legend>
            <div className="mt-2 grid gap-3 sm:grid-cols-3">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Term deliveries
                <input
                  type="number"
                  min={0}
                  value={termDeliveries}
                  onChange={(event) => setTermDeliveries(event.target.value)}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Premature deliveries
                <input
                  type="number"
                  min={0}
                  value={prematureDeliveriesCount}
                  onChange={(event) => setPrematureDeliveriesCount(event.target.value)}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Number of abortions
                <input
                  type="number"
                  min={0}
                  value={numberOfAbortions}
                  onChange={(event) => setNumberOfAbortions(event.target.value)}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Alive children
                <input
                  type="number"
                  min={0}
                  value={aliveChildren}
                  onChange={(event) => setAliveChildren(event.target.value)}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Age of last born (years)
                <input
                  type="number"
                  min={0}
                  value={ageOfLastBornYears}
                  onChange={(event) => setAgeOfLastBornYears(event.target.value)}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Age of last born (months)
                <input
                  type="number"
                  min={0}
                  value={monthsOfLastBorn}
                  onChange={(event) => setMonthsOfLastBorn(event.target.value)}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                />
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Risk history
            </legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <label className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={previousPPH}
                  onChange={(event) => setPreviousPPH(event.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-teal-700 focus:ring-teal-600"
                />
                Previous postpartum hemorrhage (PPH)
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={previousEclampsia}
                  onChange={(event) =>
                    setPreviousEclampsia(event.target.checked)
                  }
                  className="h-4 w-4 rounded border-zinc-300 text-teal-700 focus:ring-teal-600"
                />
                Previous eclampsia
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={previousStillbirth}
                  onChange={(event) =>
                    setPreviousStillbirth(event.target.checked)
                  }
                  className="h-4 w-4 rounded border-zinc-300 text-teal-700 focus:ring-teal-600"
                />
                Previous stillbirth
              </label>
            </div>
          </fieldset>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Last menstrual period (LMP)
            <input
              type="date"
              required
              value={lmpDate}
              onChange={(event) => handleLmpChange(event.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Pregnancy start date
            <input
              type="date"
              required
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>

          {lmpDate && (
            <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
              <span>Estimated due date</span>
              <span className="font-medium text-zinc-900 dark:text-zinc-50">
                {edd} · {weeks}w now
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Medical &amp; obstetric history
            <span className="text-xs text-zinc-400">{showHistory ? "Hide" : "Show"}</span>
          </button>

          {showHistory && (
            <div className="flex flex-col gap-4">
              <fieldset>
                <legend className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  General information
                </legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <HistoryCheckbox label="Surgical history / cervical trauma or cerclage" checked={history.historySurgicalOrCervicalTrauma} onChange={() => toggleHistory("historySurgicalOrCervicalTrauma")} />
                  <HistoryCheckbox label="History of gynecological problem" checked={history.historyGynecologicalProblem} onChange={() => toggleHistory("historyGynecologicalProblem")} />
                  <HistoryCheckbox label="Currently taking medicines" checked={history.currentlyOnMedication} onChange={() => toggleHistory("currentlyOnMedication")} />
                  <HistoryCheckbox label="History of diabetes" checked={history.historyDiabetes} onChange={() => toggleHistory("historyDiabetes")} />
                  <HistoryCheckbox label="Lung disease history" checked={history.historyLungDisease} onChange={() => toggleHistory("historyLungDisease")} />
                  <HistoryCheckbox label="History of hypertension" checked={history.historyHypertension} onChange={() => toggleHistory("historyHypertension")} />
                  <HistoryCheckbox label="Alcohol use" checked={history.alcoholUse} onChange={() => toggleHistory("alcoholUse")} />
                  <HistoryCheckbox label="History of kidney problems" checked={history.historyKidneyProblems} onChange={() => toggleHistory("historyKidneyProblems")} />
                  <HistoryCheckbox label="Tobacco use" checked={history.tobaccoUse} onChange={() => toggleHistory("tobaccoUse")} />
                  <HistoryCheckbox label="History of heart disease" checked={history.historyHeartDisease} onChange={() => toggleHistory("historyHeartDisease")} />
                </div>
                {history.currentlyOnMedication && (
                  <input
                    type="text"
                    placeholder="Which medications?"
                    value={currentMedicationDetails}
                    onChange={(e) => setCurrentMedicationDetails(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                  />
                )}
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <input
                    type="text"
                    placeholder="Mental illness notes (or 'none')"
                    value={mentalIllnessNotes}
                    onChange={(e) => setMentalIllnessNotes(e.target.value)}
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                  />
                  <input
                    type="text"
                    placeholder="TORCH screening notes"
                    value={torchScreeningNotes}
                    onChange={(e) => setTorchScreeningNotes(e.target.value)}
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                  />
                  <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                    HIV test result
                    <select
                      value={hivTestResult}
                      onChange={(e) => setHivTestResult(e.target.value as ScreeningResult | "")}
                      className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                    >
                      <option value="">Not recorded</option>
                      <option value="negative">Negative</option>
                      <option value="positive">Positive</option>
                      <option value="unknown">Unknown</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                    STI screening result
                    <select
                      value={stiScreeningResult}
                      onChange={(e) => setStiScreeningResult(e.target.value as ScreeningResult | "")}
                      className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                    >
                      <option value="">Not recorded</option>
                      <option value="negative">Negative</option>
                      <option value="positive">Positive</option>
                      <option value="unknown">Unknown</option>
                    </select>
                  </label>
                </div>
              </fieldset>

              <fieldset>
                <legend className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Previous pregnancy history
                </legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <HistoryCheckbox label="History of preterm delivery" checked={history.historyPretermDelivery} onChange={() => toggleHistory("historyPretermDelivery")} />
                  <HistoryCheckbox label="History of macrosomia (≥ 4kg)" checked={history.historyMacrosomia} onChange={() => toggleHistory("historyMacrosomia")} />
                  <HistoryCheckbox label="History of congenital fetal malformation" checked={history.historyCongenitalMalformation} onChange={() => toggleHistory("historyCongenitalMalformation")} />
                  <HistoryCheckbox label="History of multiple pregnancy" checked={history.historyMultiplePregnancy} onChange={() => toggleHistory("historyMultiplePregnancy")} />
                  <HistoryCheckbox label="History of antepartum bleeding" checked={history.historyAntepartumBleeding} onChange={() => toggleHistory("historyAntepartumBleeding")} />
                  <HistoryCheckbox label="Recurrent pregnancy loss (3+ times)" checked={history.recurrentPregnancyLoss} onChange={() => toggleHistory("recurrentPregnancyLoss")} />
                  <HistoryCheckbox label="History of low birth weight delivery (< 2.5kg)" checked={history.historyLowBirthWeightDelivery} onChange={() => toggleHistory("historyLowBirthWeightDelivery")} />
                  <HistoryCheckbox label="Used family planning before this pregnancy" checked={history.familyPlanningBeforePregnancy} onChange={() => toggleHistory("familyPlanningBeforePregnancy")} />
                </div>
                {history.familyPlanningBeforePregnancy && (
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <input
                      type="text"
                      placeholder="Method used"
                      value={familyPlanningMethod}
                      onChange={(e) => setFamilyPlanningMethod(e.target.value)}
                      className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                    />
                    <input
                      type="number"
                      min={0}
                      placeholder="Duration (months)"
                      value={familyPlanningDurationMonths}
                      onChange={(e) => setFamilyPlanningDurationMonths(e.target.value)}
                      className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                    />
                  </div>
                )}
                <input
                  type="text"
                  placeholder="Disabilities (or 'none')"
                  value={disabilitiesNotes}
                  onChange={(e) => setDisabilitiesNotes(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                />
              </fieldset>
            </div>
          )}

          <div className="mt-2 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-[#0f766e] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Creating…" : "Create Pregnancy"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
