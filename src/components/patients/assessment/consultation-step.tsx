"use client";

import { useState } from "react";
import { usePregnanciesForPatient, usePatient, updatePregnancy } from "@/lib/patients/use-patients";
import type { Patient, Pregnancy, PregnancyMedicalHistory, ScreeningResult } from "@/lib/patients/types";

function OnFileField({ label, value }: { label: string; value: React.ReactNode }) {
  const filled = value !== null && value !== undefined && value !== "" && value !== 0 && value !== false;
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
        {filled ? value : "—"}
      </p>
    </div>
  );
}

// Surfaces data already captured elsewhere in the system (Patient record,
// pregnancy-creation fields) so the nurse can see it during consultation
// without re-entering it — read-only here, edited from its own source
// (Patient Details / New Pregnancy) rather than duplicated as input.
function AlreadyOnFileSection({ patient, pregnancy }: { patient?: Patient; pregnancy?: Pregnancy }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Already on file
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <OnFileField label="Known allergies" value={patient?.allergies} />
        <OnFileField
          label="Chronic conditions"
          value={patient?.chronicConditions?.length ? patient.chronicConditions.join(", ") : undefined}
        />
        <OnFileField label="Blood group" value={patient?.bloodGroup} />
        <OnFileField label="Rh factor" value={patient?.rhFactor} />
        <OnFileField label="Previous C-sections" value={pregnancy?.previousCS} />
        <OnFileField label="Previous PPH" value={pregnancy?.previousPPH ? "Yes" : undefined} />
        <OnFileField label="Previous eclampsia" value={pregnancy?.previousEclampsia ? "Yes" : undefined} />
        <OnFileField label="Previous stillbirth" value={pregnancy?.previousStillbirth ? "Yes" : undefined} />
      </div>
    </div>
  );
}

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
  const [torchScreeningNotes, setTorchScreeningNotes] = useState(
    openPregnancy?.torchScreeningNotes ?? "",
  );
  const [currentMedicationDetails, setCurrentMedicationDetails] = useState(
    openPregnancy?.currentMedicationDetails ?? "",
  );
  const [mentalIllnessNotes, setMentalIllnessNotes] = useState(
    openPregnancy?.mentalIllnessNotes ?? "",
  );
  const [disabilitiesNotes, setDisabilitiesNotes] = useState(
    openPregnancy?.disabilitiesNotes ?? "",
  );
  const [familyPlanningBeforePregnancy, setFamilyPlanningBeforePregnancy] = useState(
    !!openPregnancy?.familyPlanningBeforePregnancy,
  );
  const [familyPlanningMethod, setFamilyPlanningMethod] = useState(
    openPregnancy?.familyPlanningMethod ?? "",
  );
  const [familyPlanningDurationMonths, setFamilyPlanningDurationMonths] = useState(
    openPregnancy?.familyPlanningDurationMonths != null
      ? String(openPregnancy.familyPlanningDurationMonths)
      : "",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(key: keyof PregnancyMedicalHistory) {
    setHistory((current) => ({ ...current, [key]: !current[key] }));
  }

  async function handleSave() {
    if (!openPregnancy) return;
    setError(null);
    setIsSaving(true);
    try {
      await updatePregnancy(openPregnancy.id, {
        ...history,
        hivTestResult: hivTestResult || undefined,
        stiScreeningResult: stiScreeningResult || undefined,
        torchScreeningNotes: torchScreeningNotes || undefined,
        currentMedicationDetails: currentMedicationDetails.trim() || undefined,
        mentalIllnessNotes: mentalIllnessNotes.trim() || undefined,
        disabilitiesNotes: disabilitiesNotes.trim() || undefined,
        familyPlanningBeforePregnancy,
        familyPlanningMethod: familyPlanningBeforePregnancy
          ? familyPlanningMethod.trim() || undefined
          : undefined,
        familyPlanningDurationMonths: familyPlanningBeforePregnancy && familyPlanningDurationMonths
          ? Number(familyPlanningDurationMonths)
          : undefined,
      });
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
      <AlreadyOnFileSection patient={patient} pregnancy={openPregnancy} />

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

      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Mental illness
        <input
          type="text"
          value={mentalIllnessNotes}
          onChange={(e) => setMentalIllnessNotes(e.target.value)}
          placeholder="e.g. None reported"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Do you have any disabilities?
        <input
          type="text"
          value={disabilitiesNotes}
          onChange={(e) => setDisabilitiesNotes(e.target.value)}
          placeholder="e.g. None reported"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </label>

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
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 sm:col-span-2">
          TORCH Screening Notes
          <input
            type="text"
            value={torchScreeningNotes}
            onChange={(e) => setTorchScreeningNotes(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </label>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
        <HistoryCheckbox
          label="Use of Family Planning before this pregnancy?"
          checked={familyPlanningBeforePregnancy}
          onChange={setFamilyPlanningBeforePregnancy}
        />
        {familyPlanningBeforePregnancy && (
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
