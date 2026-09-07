"use client";

import type { Pregnancy } from "@/lib/patients/types";

const GENERAL_FLAGS: { key: keyof Pregnancy; label: string }[] = [
  { key: "historySurgicalOrCervicalTrauma", label: "Surgical/cervical trauma history" },
  { key: "historyGynecologicalProblem", label: "Gynecological problem" },
  { key: "currentlyOnMedication", label: "Currently on medication" },
  { key: "historyDiabetes", label: "Diabetes" },
  { key: "historyLungDisease", label: "Lung disease" },
  { key: "historyHypertension", label: "Hypertension" },
  { key: "alcoholUse", label: "Alcohol use" },
  { key: "historyKidneyProblems", label: "Kidney problems" },
  { key: "tobaccoUse", label: "Tobacco use" },
  { key: "historyHeartDisease", label: "Heart disease" },
];

const PREGNANCY_FLAGS: { key: keyof Pregnancy; label: string }[] = [
  { key: "historyPretermDelivery", label: "Preterm delivery" },
  { key: "historyMacrosomia", label: "Macrosomia (≥4kg)" },
  { key: "historyCongenitalMalformation", label: "Congenital malformation" },
  { key: "historyMultiplePregnancy", label: "Multiple pregnancy" },
  { key: "historyAntepartumBleeding", label: "Antepartum bleeding" },
  { key: "recurrentPregnancyLoss", label: "Recurrent pregnancy loss" },
  { key: "historyLowBirthWeightDelivery", label: "Low birth weight delivery" },
  { key: "familyPlanningBeforePregnancy", label: "Family planning before pregnancy" },
];

function Flags({ pregnancy, flags }: { pregnancy: Pregnancy; flags: typeof GENERAL_FLAGS }) {
  const active = flags.filter((f) => pregnancy[f.key]);
  if (active.length === 0) {
    return <p className="text-sm text-zinc-400">None recorded</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {active.map((f) => (
        <span
          key={f.key}
          className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700 dark:bg-orange-950/30 dark:text-orange-400"
        >
          {f.label}
        </span>
      ))}
    </div>
  );
}

export function MedicalHistoryCard({ pregnancy }: { pregnancy: Pregnancy }) {
  const hasAnyDetail =
    pregnancy.currentMedicationDetails ||
    pregnancy.mentalIllnessNotes ||
    pregnancy.torchScreeningNotes ||
    pregnancy.hivTestResult ||
    pregnancy.stiScreeningResult ||
    (pregnancy.familyPlanningBeforePregnancy && pregnancy.familyPlanningMethod) ||
    pregnancy.disabilitiesNotes;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Medical &amp; Obstetric History
      </p>

      <div>
        <p className="mb-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">General</p>
        <Flags pregnancy={pregnancy} flags={GENERAL_FLAGS} />
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Previous pregnancy history
        </p>
        <Flags pregnancy={pregnancy} flags={PREGNANCY_FLAGS} />
      </div>

      {(pregnancy.hivTestResult || pregnancy.stiScreeningResult) && (
        <div className="flex flex-wrap gap-4 text-sm">
          {pregnancy.hivTestResult && (
            <span className="text-zinc-700 dark:text-zinc-300">
              HIV test: <span className="font-medium capitalize">{pregnancy.hivTestResult}</span>
            </span>
          )}
          {pregnancy.stiScreeningResult && (
            <span className="text-zinc-700 dark:text-zinc-300">
              STI screening: <span className="font-medium capitalize">{pregnancy.stiScreeningResult}</span>
            </span>
          )}
        </div>
      )}

      {hasAnyDetail && (
        <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
          {pregnancy.currentMedicationDetails && (
            <div>
              <dt className="text-xs text-zinc-500 dark:text-zinc-400">Current medication</dt>
              <dd className="text-zinc-700 dark:text-zinc-300">{pregnancy.currentMedicationDetails}</dd>
            </div>
          )}
          {pregnancy.mentalIllnessNotes && (
            <div>
              <dt className="text-xs text-zinc-500 dark:text-zinc-400">Mental illness notes</dt>
              <dd className="text-zinc-700 dark:text-zinc-300">{pregnancy.mentalIllnessNotes}</dd>
            </div>
          )}
          {pregnancy.torchScreeningNotes && (
            <div>
              <dt className="text-xs text-zinc-500 dark:text-zinc-400">TORCH screening notes</dt>
              <dd className="text-zinc-700 dark:text-zinc-300">{pregnancy.torchScreeningNotes}</dd>
            </div>
          )}
          {pregnancy.familyPlanningBeforePregnancy && pregnancy.familyPlanningMethod && (
            <div>
              <dt className="text-xs text-zinc-500 dark:text-zinc-400">Family planning method</dt>
              <dd className="text-zinc-700 dark:text-zinc-300">
                {pregnancy.familyPlanningMethod}
                {pregnancy.familyPlanningDurationMonths != null &&
                  ` — ${pregnancy.familyPlanningDurationMonths} months`}
              </dd>
            </div>
          )}
          {pregnancy.disabilitiesNotes && (
            <div>
              <dt className="text-xs text-zinc-500 dark:text-zinc-400">Disabilities</dt>
              <dd className="text-zinc-700 dark:text-zinc-300">{pregnancy.disabilitiesNotes}</dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}
