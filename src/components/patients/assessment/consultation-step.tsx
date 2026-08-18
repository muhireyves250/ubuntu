"use client";

import { useState } from "react";
import { usePregnanciesForPatient, usePatient, updatePregnancy, updatePatient } from "@/lib/patients/use-patients";
import { BLOOD_GROUP_OPTIONS, CHRONIC_CONDITION_OPTIONS } from "@/lib/patients/form-options";
import type { PregnancyMedicalHistory, ScreeningResult } from "@/lib/patients/types";

const TORCH_OPTIONS = [
  "None",
  "Rubella",
  "Cytomegalovirus (CMV)",
  "Herpes Simplex",
  "Toxoplasmosis",
  "Hepatitis",
  "Other",
];

const HISTORY_CHECKBOX_FIELDS: { key: keyof PregnancyMedicalHistory; label: string }[] = [
  { key: "historySurgicalOrCervicalTrauma", label: "Surgical history or cervical trauma or cerclage" },
  { key: "historyGynecologicalProblem", label: "History of gynecological problem" },
  { key: "currentlyOnMedication", label: "Currently taking medicines" },
  { key: "historyDiabetes", label: "History of diabetes" },
  { key: "historyLungDisease", label: "Lung disease history" },
  { key: "historyHypertension", label: "History or current hypertension" },
  { key: "alcoholUse", label: "Alcohol use" },
  { key: "historyKidneyProblems", label: "History of kidney problems" },
  { key: "tobaccoUse", label: "Tobacco use" },
  { key: "historyHeartDisease", label: "History of heart disease" },
  { key: "historyPretermDelivery", label: "History of preterm delivery" },
  { key: "historyMacrosomia", label: "History of macrosomia (birth weight >= 4kg)" },
  { key: "historyCongenitalMalformation", label: "History of congenital fetal malformation" },
  { key: "historyMultiplePregnancy", label: "History of multiple pregnancy" },
  { key: "historyAntepartumBleeding", label: "History of antepartum or postpartum bleeding" },
  { key: "recurrentPregnancyLoss", label: "Recurrent pregnancy loss (3+ times)" },
  { key: "historyLowBirthWeightDelivery", label: "History of delivery with birth weight < 2.5kg" },
];

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

export function ConsultationStep({
  patientId,
  onSaved,
}: {
  patientId: string;
  onSaved: () => void;
}) {
  const patient = usePatient(patientId);
  const pregnancies = usePregnanciesForPatient(patientId);
  const openPregnancy = pregnancies.find((p) => p.status === "open");

  const [history, setHistory] = useState<Partial<PregnancyMedicalHistory>>(() =>
    openPregnancy
      ? Object.fromEntries(HISTORY_CHECKBOX_FIELDS.map((f) => [f.key, !!openPregnancy[f.key]]))
      : {},
  );
  const [hivTestResult, setHivTestResult] = useState<ScreeningResult | "">(
    openPregnancy?.hivTestResult ?? "",
  );
  const [stiScreeningResult, setStiScreeningResult] = useState<ScreeningResult | "">(
    openPregnancy?.stiScreeningResult ?? "",
  );
  const initialTorch = openPregnancy?.torchScreeningNotes ?? "";
  const [torchOption, setTorchOption] = useState(
    initialTorch && !TORCH_OPTIONS.includes(initialTorch) ? "Other" : initialTorch,
  );
  const [torchOtherNotes, setTorchOtherNotes] = useState(
    initialTorch && !TORCH_OPTIONS.includes(initialTorch) ? initialTorch : "",
  );
  const [currentMedicationDetails, setCurrentMedicationDetails] = useState(
    openPregnancy?.currentMedicationDetails ?? "",
  );
  const initialMentalIllness = openPregnancy?.mentalIllnessNotes ?? "";
  const [hasMentalIllness, setHasMentalIllness] = useState<"yes" | "no" | "">(
    !initialMentalIllness ? "" : /^none/i.test(initialMentalIllness) ? "no" : "yes",
  );
  const [mentalIllnessNotes, setMentalIllnessNotes] = useState(
    !initialMentalIllness || /^none/i.test(initialMentalIllness) ? "" : initialMentalIllness,
  );
  const initialDisabilities = openPregnancy?.disabilitiesNotes ?? "";
  const [hasDisabilities, setHasDisabilities] = useState<"yes" | "no" | "">(
    !initialDisabilities ? "" : /^none/i.test(initialDisabilities) ? "no" : "yes",
  );
  const [disabilitiesNotes, setDisabilitiesNotes] = useState(
    !initialDisabilities || /^none/i.test(initialDisabilities) ? "" : initialDisabilities,
  );
  const [familyPlanningBeforePregnancy, setFamilyPlanningBeforePregnancy] = useState<"yes" | "no" | "">(
    openPregnancy?.familyPlanningBeforePregnancy ? "yes" : "no",
  );
  const [familyPlanningMethod, setFamilyPlanningMethod] = useState(
    openPregnancy?.familyPlanningMethod ?? "",
  );
  const [familyPlanningDurationMonths, setFamilyPlanningDurationMonths] = useState(
    openPregnancy?.familyPlanningDurationMonths != null
      ? String(openPregnancy.familyPlanningDurationMonths)
      : "",
  );
  const [allergies, setAllergies] = useState(patient?.allergies ?? "");
  const [chronicConditions, setChronicConditions] = useState<string[]>(
    (patient?.chronicConditions ?? []).filter((c) =>
      (CHRONIC_CONDITION_OPTIONS as readonly string[]).includes(c),
    ),
  );
  const [bloodGroup, setBloodGroup] = useState(patient?.bloodGroup ?? "");
  const [rhFactor, setRhFactor] = useState<"" | "positive" | "negative">(
    patient?.rhFactor ?? "",
  );
  const [previousCS, setPreviousCS] = useState(
    openPregnancy ? String(openPregnancy.previousCS) : "0",
  );
  const [previousPPH, setPreviousPPH] = useState(!!openPregnancy?.previousPPH);
  const [previousEclampsia, setPreviousEclampsia] = useState(!!openPregnancy?.previousEclampsia);
  const [previousStillbirth, setPreviousStillbirth] = useState(!!openPregnancy?.previousStillbirth);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleChronicCondition(condition: string) {
    setChronicConditions((current) =>
      current.includes(condition) ? current.filter((c) => c !== condition) : [...current, condition],
    );
  }

  function toggle(key: keyof PregnancyMedicalHistory) {
    setHistory((current) => ({ ...current, [key]: !current[key] }));
  }

  async function handleSave() {
    if (!openPregnancy) return;
    setError(null);
    setIsSaving(true);
    try {
      const torchScreeningNotes =
        torchOption === "Other" ? torchOtherNotes.trim() || undefined : torchOption || undefined;
      const mentalIllnessValue =
        hasMentalIllness === "no" ? "None reported" : hasMentalIllness === "yes" ? mentalIllnessNotes.trim() || undefined : undefined;
      const disabilitiesValue =
        hasDisabilities === "no" ? "None reported" : hasDisabilities === "yes" ? disabilitiesNotes.trim() || undefined : undefined;
      const familyPlanningYes = familyPlanningBeforePregnancy === "yes";

      await Promise.all([
        updatePregnancy(openPregnancy.id, {
          ...history,
          hivTestResult: hivTestResult || undefined,
          stiScreeningResult: stiScreeningResult || undefined,
          torchScreeningNotes,
          currentMedicationDetails: currentMedicationDetails.trim() || undefined,
          mentalIllnessNotes: mentalIllnessValue,
          disabilitiesNotes: disabilitiesValue,
          familyPlanningBeforePregnancy: familyPlanningYes,
          familyPlanningMethod: familyPlanningYes ? familyPlanningMethod.trim() || undefined : undefined,
          familyPlanningDurationMonths: familyPlanningYes && familyPlanningDurationMonths
            ? Number(familyPlanningDurationMonths)
            : undefined,
          previousCS: previousCS ? Number(previousCS) : undefined,
          previousPPH,
          previousEclampsia,
          previousStillbirth,
        }),
        updatePatient(patientId, {
          allergies: allergies.trim() || undefined,
          chronicConditions: chronicConditions.length > 0 ? chronicConditions : undefined,
          bloodGroup: bloodGroup.trim() || undefined,
          rhFactor: rhFactor || undefined,
        }),
      ]);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save consultation history");
    } finally {
      setIsSaving(false);
    }
  }

  if (!openPregnancy) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        This patient has no active pregnancy on record.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Already on file
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Update anything that&apos;s changed based on what you observe on this patient.
        </p>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Known allergies
          <input
            type="text"
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </label>

        <div>
          <p className="mb-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Chronic conditions
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {CHRONIC_CONDITION_OPTIONS.map((condition) => (
              <label
                key={condition}
                className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 has-checked:border-teal-600 has-checked:bg-teal-50 dark:border-zinc-800 dark:text-zinc-300 dark:has-checked:border-teal-600 dark:has-checked:bg-teal-950/40"
              >
                <input
                  type="checkbox"
                  checked={chronicConditions.includes(condition)}
                  onChange={() => toggleChronicCondition(condition)}
                  className="h-4 w-4 rounded border-zinc-300 text-teal-700 focus:ring-teal-600"
                />
                {condition}
              </label>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Blood group
            <select
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            >
              <option value="">Unknown</option>
              {BLOOD_GROUP_OPTIONS.map((bg) => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Rh factor
            <select
              value={rhFactor}
              onChange={(e) => setRhFactor(e.target.value as typeof rhFactor)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            >
              <option value="">Unknown</option>
              <option value="positive">Positive</option>
              <option value="negative">Negative</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Previous C-sections
            <input
              type="number"
              min={0}
              value={previousCS}
              onChange={(e) => setPreviousCS(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <HistoryCheckbox label="Previous PPH" checked={previousPPH} onChange={setPreviousPPH} />
          <HistoryCheckbox label="Previous eclampsia" checked={previousEclampsia} onChange={setPreviousEclampsia} />
          <HistoryCheckbox label="Previous stillbirth" checked={previousStillbirth} onChange={setPreviousStillbirth} />
        </div>
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Consultation — General Information
      </p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Pre-filled from this patient&apos;s medical history. Confirm or update anything that has
        changed since the last visit — saving here updates the Medical History tab too.
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        {HISTORY_CHECKBOX_FIELDS.map((f) => (
          <HistoryCheckbox
            key={f.key}
            label={f.label}
            checked={!!history[f.key]}
            onChange={() => toggle(f.key)}
          />
        ))}
      </div>

      {!!history.currentlyOnMedication && (
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Current medication details
          <input
            type="text"
            value={currentMedicationDetails}
            onChange={(e) => setCurrentMedicationDetails(e.target.value)}
            placeholder="e.g. Metformin 500mg twice daily"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </label>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Mental illness
          <select
            value={hasMentalIllness}
            onChange={(e) => setHasMentalIllness(e.target.value as "yes" | "no" | "")}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
            <option value="">Not recorded</option>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Do you have any disabilities?
          <select
            value={hasDisabilities}
            onChange={(e) => setHasDisabilities(e.target.value as "yes" | "no" | "")}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
            <option value="">Not recorded</option>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </label>
        {hasMentalIllness === "yes" && (
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 sm:col-span-2">
            Mental illness details
            <input
              type="text"
              value={mentalIllnessNotes}
              onChange={(e) => setMentalIllnessNotes(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>
        )}
        {hasDisabilities === "yes" && (
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 sm:col-span-2">
            Disability details
            <input
              type="text"
              value={disabilitiesNotes}
              onChange={(e) => setDisabilitiesNotes(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          HIV Test
          <select
            value={hivTestResult}
            onChange={(e) => setHivTestResult(e.target.value as ScreeningResult | "")}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
            <option value="">Not recorded</option>
            <option value="negative">Negative</option>
            <option value="positive">Positive</option>
            <option value="unknown">Unknown</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          STI Screening
          <select
            value={stiScreeningResult}
            onChange={(e) => setStiScreeningResult(e.target.value as ScreeningResult | "")}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
            <option value="">Not recorded</option>
            <option value="negative">Negative</option>
            <option value="positive">Positive</option>
            <option value="unknown">Unknown</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          TORCH Screening
          <select
            value={torchOption}
            onChange={(e) => setTorchOption(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
            <option value="">Not recorded</option>
            {TORCH_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </label>
        {torchOption === "Other" && (
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Specify
            <input
              type="text"
              value={torchOtherNotes}
              onChange={(e) => setTorchOtherNotes(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Use of Family Planning before this pregnancy?
          <select
            value={familyPlanningBeforePregnancy}
            onChange={(e) => setFamilyPlanningBeforePregnancy(e.target.value as "yes" | "no" | "")}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
            <option value="">Not recorded</option>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </label>
        {familyPlanningBeforePregnancy === "yes" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Specify Method Used
              <input
                type="text"
                value={familyPlanningMethod}
                onChange={(e) => setFamilyPlanningMethod(e.target.value)}
                placeholder="e.g. Combined Oral Contraceptive Pills"
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Duration of method usage (months)
              <input
                type="number"
                min={0}
                value={familyPlanningDurationMonths}
                onChange={(e) => setFamilyPlanningDurationMonths(e.target.value)}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </label>
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={isSaving}
        onClick={handleSave}
        className="w-full rounded-xl bg-[#0f766e] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? "Saving…" : "Save & Continue"}
      </button>
    </div>
  );
}
