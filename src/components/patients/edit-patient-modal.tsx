"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { updatePatient } from "@/lib/patients/use-patients";
import type { Patient } from "@/lib/patients/types";

interface EditPatientModalProps {
  patient: Patient;
  onClose: () => void;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition-colors focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100 placeholder:text-zinc-400";

export function EditPatientModal({ patient, onClose }: EditPatientModalProps) {
  const [name, setName] = useState(patient.name);
  const [age, setAge] = useState(String(patient.age));
  const [gestationalAgeWeeks, setGestationalAgeWeeks] = useState(
    String(patient.gestationalAgeWeeks),
  );
  const [obstetricHistory, setObstetricHistory] = useState(
    patient.obstetricHistory,
  );
  const [medicalHistory, setMedicalHistory] = useState(patient.medicalHistory);
  const [isSaving, setIsSaving] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstInputRef.current?.focus();
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSaving(true);
    updatePatient(patient.id, {
      name: name.trim(),
      age: Number(age),
      gestationalAgeWeeks: Number(gestationalAgeWeeks),
      obstetricHistory: obstetricHistory.trim(),
      medicalHistory: medicalHistory.trim(),
    });
    setIsSaving(false);
    onClose();
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-patient-title"
        className="flex w-full max-w-md flex-col rounded-3xl bg-white shadow-[0_24px_60px_-12px_rgba(0,0,0,0.25)] ring-1 ring-black/5"
      >
        {/* Header */}
        <div className="flex items-center justify-between rounded-t-3xl bg-teal-700 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-white">
                <path
                  d="M11 4H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4M18.5 2.5a2.121 2.121 0 0 1 3 3L13 14l-4 1 1-4 7.5-7.5Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <h2
                id="edit-patient-title"
                className="text-sm font-semibold text-white"
              >
                Edit patient
              </h2>
              <p className="text-xs text-teal-200">{patient.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-teal-100 transition-colors hover:bg-white/20 hover:text-white"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path
                d="M18 6 6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-6">
          <Field label="Full name">
            <input
              ref={firstInputRef}
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Patient full name"
              className={inputCls}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Age (years)">
              <input
                type="number"
                required
                min={10}
                max={70}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Gestational age (wks)">
              <input
                type="number"
                required
                min={4}
                max={42}
                value={gestationalAgeWeeks}
                onChange={(e) => setGestationalAgeWeeks(e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="Obstetric history">
            <textarea
              rows={3}
              value={obstetricHistory}
              onChange={(e) => setObstetricHistory(e.target.value)}
              placeholder="e.g. G2P1, previous C/S…"
              className={`${inputCls} resize-none`}
            />
          </Field>

          <Field label="Medical history">
            <textarea
              rows={3}
              value={medicalHistory}
              onChange={(e) => setMedicalHistory(e.target.value)}
              placeholder="e.g. hypertension, diabetes…"
              className={`${inputCls} resize-none`}
            />
          </Field>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-zinc-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-200 px-5 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-teal-700 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-600 active:scale-[0.98] disabled:opacity-60"
            >
              {isSaving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
