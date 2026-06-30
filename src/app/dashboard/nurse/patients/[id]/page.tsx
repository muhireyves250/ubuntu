"use client";

import { use, useState } from "react";
import { notFound } from "next/navigation";
import { RoleGuard } from "@/components/role-guard";
import { PatientDetailsTab } from "@/components/patients/patient-details-tab";
import { SignsSymptomsTab } from "@/components/patients/signs-symptoms-tab";
import { ClassificationTab } from "@/components/patients/classification-tab";
import { VisitHistoryTab } from "@/components/patients/visit-history-tab";
import { AssessmentWizard } from "@/components/patients/assessment-wizard";
import { PregnancyTab } from "@/components/patients/pregnancy-tab";
import { ActivityTimeline } from "@/components/patients/activity-timeline";
import { ProfileOverviewTab } from "@/components/patients/profile-overview-tab";
import { EditPatientModal } from "@/components/patients/edit-patient-modal";
import {
  usePatient,
  useVisitsForPatient,
  usePregnancyForPatient,
  useAncVisitsForPregnancy,
} from "@/lib/patients/use-patients";
import { gestationalAgeWeeks } from "@/lib/patients/pregnancy";
import { getInitials } from "@/lib/format";
import { RiskBadge } from "@/components/patients/risk-badge";
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconMore,
  IconPrint,
} from "@/components/dashboard/icons";

const TABS = [
  "Overview",
  "Patient Details",
  "Signs & Symptoms",
  "New Assessment",
  "Pregnancy",
  "Classification",
  "Visit History",
] as const;

type Tab = (typeof TABS)[number];

function PatientDetailContent({ patientId }: { patientId: string }) {
  const patient = usePatient(patientId);
  const visits = useVisitsForPatient(patientId);
  const pregnancy = usePregnancyForPatient(patientId);
  const ancVisits = useAncVisitsForPregnancy(pregnancy?.id ?? "");
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [showEditModal, setShowEditModal] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);

  if (!patient) return notFound();

  const currentRisk = visits[0]?.riskLevel ?? "green";

  return (
    <div className="flex flex-col gap-5">
      {showEditModal && (
        <EditPatientModal
          patient={patient}
          onClose={() => setShowEditModal(false)}
        />
      )}
      {currentRisk === "red" && (
        <div className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white shadow-sm">
          <span>⚠</span>
          <span>
            HIGH RISK — This patient is currently classified Red. Immediate
            review recommended.
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-300 bg-[#ffeedb] px-4 py-3 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
        <h1 className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {patient.id.toUpperCase()}
        </h1>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setActionsOpen((o) => !o)}
              className="flex items-center gap-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-white/60 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800/60"
            >
              Actions
              <IconChevronDown className="h-3.5 w-3.5" />
            </button>
            {actionsOpen && (
              <div className="absolute left-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                <button
                  type="button"
                  onClick={() => {
                    setActionsOpen(false);
                    setShowEditModal(true);
                  }}
                  className="block w-full px-4 py-2.5 text-left text-sm text-zinc-700 hover:bg-teal-50 hover:text-teal-900 dark:text-zinc-300 dark:hover:bg-teal-950"
                >
                  Edit patient
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            disabled
            className="flex items-center gap-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 dark:border-zinc-800 dark:text-zinc-300"
          >
            View
            <IconChevronDown className="h-3.5 w-3.5" />
          </button>
          <span className="rounded-full bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-800 dark:bg-teal-950 dark:text-teal-300">
            {patient.facility}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled
              title="Previous"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 dark:border-zinc-800"
            >
              <IconChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled
              title="Next"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 dark:border-zinc-800"
            >
              <IconChevronRight className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            disabled
            title="Print"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 dark:border-zinc-800"
          >
            <IconPrint className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled
            title="More"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 dark:border-zinc-800"
          >
            <IconMore className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 rounded-xl border border-zinc-300 bg-[#ffeedb] p-4 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-teal-100 text-lg font-semibold text-teal-800 dark:bg-teal-950 dark:text-teal-300">
          {getInitials(patient.name)}
        </span>
        <div className="flex flex-1 flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              {patient.name}
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {patient.age} years •{" "}
              {pregnancy
                ? gestationalAgeWeeks(pregnancy.lmpDate)
                : patient.gestationalAgeWeeks}{" "}
              weeks gestation
            </p>
          </div>
          <RiskBadge level={currentRisk} />
        </div>
      </div>

      <div className="scrollbar-hidden flex w-fit gap-1 overflow-x-auto rounded-full border border-zinc-300 bg-[#ffeedb] p-1 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-[#0f766e] text-white shadow-sm shadow-teal-700/20"
                : "text-zinc-600 hover:bg-white/60 dark:text-zinc-300 dark:hover:bg-zinc-800/60"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-zinc-300 bg-[#ffeedb] p-5 dark:border-zinc-700 dark:bg-orange-950/40">
        {activeTab === "Overview" && (
          <ProfileOverviewTab
            patient={patient}
            visits={visits}
            pregnancy={pregnancy}
            ancVisits={ancVisits}
            onAction={(tab) => setActiveTab(tab as Tab)}
          />
        )}
        {activeTab === "Patient Details" && (
          <PatientDetailsTab patient={patient} />
        )}
        {activeTab === "Signs & Symptoms" && (
          <SignsSymptomsTab patientId={patient.id} />
        )}
        {activeTab === "New Assessment" && (
          <AssessmentWizard patientId={patient.id} />
        )}
        {activeTab === "Pregnancy" && <PregnancyTab patientId={patient.id} />}
        {activeTab === "Classification" && (
          <ClassificationTab currentRisk={currentRisk} visits={visits} />
        )}
        {activeTab === "Visit History" && (
          <VisitHistoryTab
            visits={visits}
            onAddVisit={() => setActiveTab("Signs & Symptoms")}
          />
        )}
      </div>

      <div className="rounded-xl border border-zinc-300 bg-[#ffeedb] p-5 dark:border-zinc-700 dark:bg-orange-950/40">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Add a comment
        </p>
        <textarea
          disabled
          rows={3}
          placeholder="Comments are not supported yet"
          className="mt-2 w-full resize-none rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-400 placeholder:text-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
        />
        <button
          type="button"
          disabled
          className="mt-2 rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-400 dark:border-zinc-800"
        >
          Comment
        </button>
      </div>

      <div className="rounded-xl border border-zinc-300 bg-[#ffeedb] p-5 dark:border-zinc-700 dark:bg-orange-950/40">
        <ActivityTimeline patient={patient} visits={visits} />
      </div>
    </div>
  );
}

export default function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <RoleGuard path="/dashboard/nurse">
      <PatientDetailContent patientId={id} />
    </RoleGuard>
  );
}
