"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RoleGuard } from "@/components/role-guard";
import {
  useLabRequest,
  useLabRequestIsLoading,
  acceptLabRequest,
  submitLabResults,
  LabRequest,
} from "@/lib/patients/lab-requests";
import type { LabTestResult } from "@/lib/patients/types";
import { getStoredAuthenticatedUser } from "@/lib/auth/auth-context";
import type { AuthenticatedUser } from "@/lib/auth/auth-context";
import { CriticalAlertModal } from "@/components/dashboard/critical-alert-modal";
import Link from "next/link";

function readSessionUser(): AuthenticatedUser | null {
  if (typeof window === "undefined") return null;
  return getStoredAuthenticatedUser();
}

type ResultForm = { result: string; unit: string; interp: LabTestResult["interpretation"] };

function buildInitialForm(request: LabRequest): Record<string, ResultForm> {
  const initForm: Record<string, ResultForm> = {};
  request.requestedInvestigatonNames.forEach((name) => {
    const existing = request.results.find((r) => r.testName === name);
    initForm[name] = existing
      ? { result: existing.result, unit: existing.unit, interp: existing.interpretation }
      : { result: "", unit: "", interp: "Normal" };
  });
  return initForm;
}

function RequestDetailContent({
  requestId,
  user,
}: {
  requestId: string;
  user: AuthenticatedUser;
}) {
  const router = useRouter();
  const fetchedRequest = useLabRequest(requestId);
  const isLoadingRequest = useLabRequestIsLoading(requestId);
  const request = fetchedRequest && fetchedRequest.facility === user.facility ? fetchedRequest : null;

  const [resultsForm, setResultsForm] = useState<Record<string, ResultForm>>({});
  const [alertState, setAlertState] = useState<{ open: boolean; hasCritical: boolean }>({
    open: false,
    hasCritical: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Re-sync the results form whenever the fetched request's identity or
  // status changes (e.g. right after accept flips Pending -> In Progress),
  // mirroring the old code's synchronous buildInitialForm-on-mount behavior.
  const formSyncKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!request) return;
    const key = `${request.id}:${request.status}`;
    if (formSyncKeyRef.current !== key) {
      formSyncKeyRef.current = key;
      setResultsForm(buildInitialForm(request));
    }
  }, [request]);

  if (isLoadingRequest) {
    return <div className="flex flex-col items-center p-6" />;
  }

  if (!request) {
    return (
      <div className="flex flex-col items-center p-6">
        <p>Laboratory Request not found or unauthorized.</p>
        <Link href="/dashboard/lab/requests" className="mt-4 text-teal-700 underline">
          Back to Requests
        </Link>
      </div>
    );
  }

  async function handleAccept() {
    if (!request || request.status !== "Pending" || isAccepting) return;
    setError(null);
    setIsAccepting(true);
    try {
      await acceptLabRequest(request.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept request. Please try again.");
    } finally {
      setIsAccepting(false);
    }
  }

  function handleResultChange(testName: string, field: keyof ResultForm, value: string) {
    setResultsForm((prev) => ({
      ...prev,
      [testName]: {
        ...prev[testName],
        [field]: value,
      },
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!request || isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const finalResults: LabTestResult[] = request.requestedInvestigatonNames.map((name, idx) => {
        const form = resultsForm[name];
        return {
          id: `res-${Date.now()}-${idx}`,
          testName: name,
          result: form.result,
          unit: form.unit,
          interpretation: form.interp,
          referenceRange: "Varies",
          completedAt: new Date().toISOString(),
          completedBy: user.id,
        };
      });

      await submitLabResults(request.id, finalResults);

      const hasCritical = finalResults.some((r) => r.interpretation === "Critical");
      setAlertState({ open: true, hasCritical });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit results. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {alertState.open && (
        <CriticalAlertModal
          hasCritical={alertState.hasCritical}
          onClose={() => {
            setAlertState({ open: false, hasCritical: false });
            router.push("/dashboard/lab/requests");
          }}
        />
      )}
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-300 bg-[#ffeedb] px-5 py-4 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
          <div>
            <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              Laboratory Request: {request.id}
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Priority:{" "}
              <span
                className={`font-semibold ${
                  request.priority === "Emergency"
                    ? "text-red-600 dark:text-red-400"
                    : request.priority === "Urgent"
                      ? "text-orange-600 dark:text-orange-400"
                      : "text-zinc-800 dark:text-zinc-200"
                }`}
              >
                {request.priority}
              </span>{" "}
              • Status: <span className="font-semibold">{request.status}</span>
            </p>
          </div>
          <Link
            href="/dashboard/lab/requests"
            className="text-sm font-medium text-teal-700 hover:underline dark:text-teal-400"
          >
            ← Back to Queue
          </Link>
        </div>

        {/* Patient Minimal Info Block */}
        <div className="rounded-xl border border-zinc-300 bg-[#ffeedb] p-4 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Patient Details (Limited Access)
          </h2>
          <div className="rounded-lg border border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">
                  Patient Name
                </p>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">{request.patientName}</p>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">
                  Patient ID
                </p>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">{request.patientId}</p>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">
                  Age / Gestational
                </p>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  {request.patientAge} yrs / {request.gestationalAge}
                </p>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">
                  Pregnancy / Visit
                </p>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  G{request.pregnancyNumber} / V{request.visitNumber} ({request.visitType})
                </p>
              </div>
            </div>
            <div className="mt-4 border-t border-zinc-200 pt-3 dark:border-zinc-800">
              <p className="mb-1 text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">
                Clinical Notes
              </p>
              <p className="text-sm font-medium italic text-zinc-800 dark:text-zinc-200">
                {request.clinicalNotes || "None"}
              </p>
              {request.allergies && (
                <p className="mt-2 text-sm font-medium text-red-600">Allergies: {request.allergies}</p>
              )}
            </div>
          </div>
        </div>

        {/* Action Panel */}
        {request.status === "Pending" ? (
          <div className="group relative overflow-hidden rounded-xl border border-teal-200 bg-linear-to-br from-teal-50 to-white p-8 text-center shadow-md transition-all hover:shadow-lg dark:border-teal-900/50 dark:from-teal-950/40 dark:to-zinc-950">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-teal-100/50 blur-3xl transition-all group-hover:scale-110 dark:bg-teal-900/20" />
            <h3 className="relative z-10 mb-3 text-xl font-bold tracking-tight text-teal-950 dark:text-teal-100">
              Request is Pending
            </h3>
            <p className="relative z-10 mx-auto mb-8 max-w-md text-sm leading-relaxed text-teal-700/90 dark:text-teal-300/80">
              Only one laboratory nurse can handle this request at a time. Accept the request to lock
              it to yourself and begin processing the samples.
            </p>
            <button
              type="button"
              onClick={handleAccept}
              disabled={isAccepting}
              className="relative z-10 inline-flex items-center justify-center rounded-xl bg-teal-900 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-teal-900/20 transition-all hover:-translate-y-0.5 hover:bg-teal-800 hover:shadow-xl active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isAccepting ? "Accepting…" : "Accept Request & Begin Tests"}
            </button>
            {error && (
              <p className="relative z-10 mt-4 rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
                {error}
              </p>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="rounded-xl border border-zinc-300 bg-[#ffeedb] p-5 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
              <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Perform Laboratory Tests
              </h2>

              <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-zinc-200 bg-zinc-50/50 text-[11px] uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-400">
                    <tr>
                      <th className="px-4 py-2 font-semibold">Test Name</th>
                      <th className="px-4 py-2 font-semibold">Result Value</th>
                      <th className="px-4 py-2 font-semibold">Unit</th>
                      <th className="px-4 py-2 font-semibold">Interpretation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                    {request.requestedInvestigatonNames.map((testName) => (
                      <tr
                        key={testName}
                        className="transition-colors hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20"
                      >
                        <td className="px-4 py-2.5 font-medium text-zinc-900 dark:text-zinc-100">
                          {testName}
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            type="text"
                            required
                            disabled={request.status === "Completed"}
                            value={resultsForm[testName]?.result || ""}
                            onChange={(e) => handleResultChange(testName, "result", e.target.value)}
                            className="w-full min-w-[120px] rounded-lg border border-zinc-300 bg-zinc-50/50 px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10 disabled:opacity-70 dark:border-zinc-700 dark:bg-zinc-950/50 dark:text-white dark:focus:bg-zinc-900"
                            placeholder="e.g. 11.5, Positive"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            type="text"
                            disabled={request.status === "Completed"}
                            value={resultsForm[testName]?.unit || ""}
                            onChange={(e) => handleResultChange(testName, "unit", e.target.value)}
                            className="w-full min-w-[80px] rounded-lg border border-zinc-300 bg-zinc-50/50 px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10 disabled:opacity-70 dark:border-zinc-700 dark:bg-zinc-950/50 dark:text-white dark:focus:bg-zinc-900"
                            placeholder="mg/dL"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="relative min-w-[110px]">
                            <select
                              disabled={request.status === "Completed"}
                              value={resultsForm[testName]?.interp || "Normal"}
                              onChange={(e) =>
                                handleResultChange(
                                  testName,
                                  "interp",
                                  e.target.value,
                                )
                              }
                              className={`w-full appearance-none rounded-lg border border-zinc-300 px-3 py-2 pr-8 text-sm outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 disabled:opacity-70 dark:border-zinc-700 dark:text-white ${
                                resultsForm[testName]?.interp === "Critical"
                                  ? "border-red-300 bg-red-50 font-bold text-red-900 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400"
                                  : resultsForm[testName]?.interp === "Abnormal"
                                    ? "border-orange-300 bg-orange-50 text-orange-900 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-400"
                                    : "bg-zinc-50/50 text-zinc-900 focus:bg-white dark:bg-zinc-950/50 dark:focus:bg-zinc-900"
                              }`}
                            >
                              <option value="Normal">Normal</option>
                              <option value="Abnormal">Abnormal</option>
                              <option value="Critical">Critical</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-zinc-400">
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {error && (
              <p className="rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
                {error}
              </p>
            )}
            {request.status === "In Progress" && (
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-teal-900 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-teal-900/20 transition-all hover:-translate-y-0.5 hover:bg-teal-800 hover:shadow-xl active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Submitting…" : "Submit Laboratory Results"}
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    </>
  );
}

export default function LabRequestDetailPage() {
  const params = useParams();
  const [user] = useState(readSessionUser);
  const requestId = typeof params.id === "string" ? params.id : "";

  return (
    <RoleGuard roles={["lab_nurse"]}>
      {user && requestId ? (
        <RequestDetailContent key={requestId} requestId={requestId} user={user} />
      ) : (
        <div className="flex flex-col items-center p-6">
          <p>Laboratory Request not found or unauthorized.</p>
          <Link href="/dashboard/lab/requests" className="mt-4 text-teal-700 underline">
            Back to Requests
          </Link>
        </div>
      )}
    </RoleGuard>
  );
}
