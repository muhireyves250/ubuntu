"use client";

import { use, useState } from "react";
import { notFound } from "next/navigation";
import { RoleGuard } from "@/components/role-guard";
import { PatientDetailsTab } from "@/components/patients/patient-details-tab";
import { SignsSymptomsTab } from "@/components/patients/signs-symptoms-tab";
import { VisitHistoryTab } from "@/components/patients/visit-history-tab";
import { AssessmentWizard } from "@/components/patients/assessment-wizard";
import { PregnancyTab } from "@/components/patients/pregnancy-tab";
import { ActivityTimeline } from "@/components/patients/activity-timeline";
import { ProfileOverviewTab } from "@/components/patients/profile-overview-tab";
import { AiPredictionTab } from "@/components/patients/ai-prediction-panel";
import { EditPatientModal } from "@/components/patients/edit-patient-modal";
import { CreateReferralModal } from "@/components/patients/create-referral-modal";
import { AwaitingLabsBlocker } from "@/components/patients/awaiting-labs-blocker";
import { FinalizeAssessmentBlocker } from "@/components/patients/finalize-assessment-blocker";
import {
  usePatient,
  usePregnanciesForPatient,
  useAllVisitsForPatient,
  useVisitsForPregnancy,
  finalizeAssessment,
} from "@/lib/patients/use-patients";
import { gestationalAgeWeeks } from "@/lib/patients/pregnancy";
import { getInitials, fullName, computeAge } from "@/lib/format";
import { RiskBadge } from "@/components/patients/risk-badge";
import type { Pregnancy, Referral, Visit } from "@/lib/patients/types";
import { IconChevronDown } from "@/components/dashboard/icons";

const TABS = [
  "Overview",
  "Patient Details",
  "Signs & Symptoms",
  "Pregnancy",
  "Visit History",
  "New Assessment",
  "AI Prediction",
] as const;

type Tab = (typeof TABS)[number];

type AssessmentContext = {
  type: "scheduled" | "unscheduled";
  scheduledWeek?: number;
  ancNumber?: number;
};

type EmergencyResult = { pregnancy: Pregnancy; visit: Visit; referral: Referral };

function PatientDetailContent({ patientId }: { patientId: string }) {
  const patient = usePatient(patientId);
  const pregnancies = usePregnanciesForPatient(patientId);
  const openPregnancy = pregnancies.find((p) => p.status === "open") ?? null;
  const allVisits = useAllVisitsForPatient(patientId);
  const pregnancyVisits = useVisitsForPregnancy(openPregnancy?.id ?? "");

  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [assessmentContext, setAssessmentContext] = useState<AssessmentContext | null>(null);
  const [emergencyResult, setEmergencyResult] = useState<EmergencyResult | null>(null);

  if (!patient) return notFound();

  const currentRisk = allVisits[0]?.riskLevel ?? "green";
  const latestVisit = allVisits[0];
  const isWaitingForLabs = latestVisit?.labStatus === "pending" || latestVisit?.labStatus === "in_progress";
  const needsFinalization = latestVisit?.labStatus === "completed" && latestVisit?.assessmentFinalized === false;

  return (
    <div className="flex flex-col gap-5">
      {showEditModal && (
        <EditPatientModal
          patient={patient}
          onClose={() => setShowEditModal(false)}
        />
      )}
      {showReferralModal && (
        <CreateReferralModal
          patient={patient}
          currentRisk={currentRisk}
          clinicalSummary={allVisits[0]?.notes ?? ""}
          onClose={() => setShowReferralModal(false)}
          onCreated={() => setActiveTab("Visit History")}
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

      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-zinc-300 bg-[#ffeedb] p-5 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xl font-semibold text-teal-800 dark:bg-teal-950 dark:text-teal-300">
          {getInitials(fullName(patient))}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              {fullName(patient)}
            </h2>
            <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
              {patient.nationalId}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            {computeAge(patient.dateOfBirth)} years •{" "}
            {openPregnancy
              ? `${gestationalAgeWeeks(openPregnancy.lmpDate)} weeks gestation`
              : "no active pregnancy"}
          </p>
          <span className="mt-1.5 inline-flex rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800 dark:bg-teal-950 dark:text-teal-300">
            {patient.registrationFacility}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <RiskBadge level={currentRisk} />
          <div className="relative">
            <button
              type="button"
              onClick={() => setActionsOpen((o) => !o)}
              className="flex items-center gap-1 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Actions
              <IconChevronDown className="h-3.5 w-3.5" />
            </button>
            {actionsOpen && (
              <div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                <button
                  type="button"
                  onClick={() => { setActionsOpen(false); setShowEditModal(true); }}
                  className="block w-full px-4 py-2.5 text-left text-sm text-zinc-700 hover:bg-teal-50 hover:text-teal-900 dark:text-zinc-300 dark:hover:bg-teal-950"
                >
                  Edit patient
                </button>
                <button
                  type="button"
                  onClick={() => { setActionsOpen(false); setShowReferralModal(true); }}
                  className="block w-full px-4 py-2.5 text-left text-sm text-zinc-700 hover:bg-teal-50 hover:text-teal-900 dark:text-zinc-300 dark:hover:bg-teal-950"
                >
                  Create referral
                </button>
              </div>
            )}
          </div>
        </div>
      </div>



      {isWaitingForLabs ? (
        <AwaitingLabsBlocker patient={patient} visit={latestVisit!} />
      ) : needsFinalization ? (
        <FinalizeAssessmentBlocker patient={patient} visit={latestVisit!} onFinalized={finalizeAssessment} />
      ) : (
        <>
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
                visits={allVisits}
                pregnancy={openPregnancy}
                onAction={(tab) => setActiveTab(tab as Tab)}
              />
        )}
        {activeTab === "Patient Details" && (
          <PatientDetailsTab patient={patient} />
        )}
        {activeTab === "Signs & Symptoms" && (
          <>
            {emergencyResult ? (
              <div className="flex flex-col items-center gap-6 py-4 text-center">
                <div className="flex flex-col items-center gap-2">
                  <p className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
                    Emergency Flagged
                  </p>
                  <RiskBadge level={emergencyResult.visit.riskLevel} />
                </div>
                <div className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-left text-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Summary
                  </p>
                  <p className="text-zinc-700 dark:text-zinc-300">
                    {emergencyResult.visit.emergencySummary}
                  </p>
                </div>
                <div className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-left text-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Referral
                  </p>
                  <p className="text-zinc-700 dark:text-zinc-300">
                    Sent to {emergencyResult.referral.receivingFacility} — pending acceptance
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEmergencyResult(null)}
                  className="w-full rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Back to Patient
                </button>
              </div>
            ) : (
              <SignsSymptomsTab patientId={patient.id} onFlagged={setEmergencyResult} />
            )}
          </>
        )}
        {activeTab === "New Assessment" && (
          <>
            {openPregnancy && assessmentContext ? (
              <AssessmentWizard
                pregnancyId={openPregnancy.id}
                type={assessmentContext.type}
                scheduledWeek={assessmentContext.scheduledWeek}
                ancNumber={assessmentContext.ancNumber}
                onSubmitted={() => setAssessmentContext(null)}
              />
            ) : openPregnancy && !assessmentContext ? (
              <div className="flex flex-col items-center gap-4 py-6 text-center">
                <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">What type of visit are you recording?</p>
                <div className="flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setAssessmentContext({ type: "unscheduled" })}
                    className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    Unscheduled / Walk-in Visit
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveTab("Visit History"); }}
                    className="rounded-xl border border-teal-300 bg-teal-50 px-5 py-3 text-sm font-medium text-teal-800 shadow-sm hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-300 dark:hover:bg-teal-950/60"
                  >
                    Log Scheduled ANC Visit →
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                This patient has no active pregnancy on record. Please register a pregnancy first.
              </p>
            )}
          </>
        )}
        {activeTab === "Pregnancy" && (
          <PregnancyTab
            patientId={patient.id}
            onGoToVisitHistory={() => setActiveTab("Visit History")}
          />
        )}
        {activeTab === "Visit History" && (
          <>
            {openPregnancy ? (
              <VisitHistoryTab
                pregnancy={openPregnancy}
                visits={pregnancyVisits}
                onLogScheduledVisit={(week) => {
                  setAssessmentContext({ type: "scheduled", scheduledWeek: week });
                  setActiveTab("New Assessment");
                }}
                onLogUnscheduledVisit={() => {
                  setAssessmentContext({ type: "unscheduled" });
                  setActiveTab("New Assessment");
                }}
              />
            ) : (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                This patient has no active pregnancy on record.
              </p>
            )}
          </>
        )}
        {activeTab === "AI Prediction" && (
          <AiPredictionTab visits={allVisits} />
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
        <ActivityTimeline patient={patient} visits={allVisits} />
      </div>
        </>
      )}
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
