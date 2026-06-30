"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { updatePatient } from "@/lib/patients/use-patients";
import { IconClose } from "@/components/dashboard/icons";
import type { Patient } from "@/lib/patients/types";

export function EditPatientModal({
  patient,
  onClose,
}: {
  patient: Patient;
  onClose: () => void;
}) {
  const [name, setName] = useState(patient.name);
  const [age, setAge] = useState(String(patient.age));
  const [gestationalAgeWeeks, setGestationalAgeWeeks] = useState(
    String(patient.gestationalAgeWeeks),
  );
  const [obstetricHistory, setObstetricHistory] = useState(
    patient.obstetricHistory,
  );
  const [medicalHistory, setMedicalHistory] = useState(patient.medicalHistory);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstInputRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleSubmit() {
    updatePatient(patient.id, {
      name: name.trim(),
      age: Number(age),
      gestationalAgeWeeks: Number(gestationalAgeWeeks),
      obstetricHistory: obstetricHistory.trim(),
      medicalHistory: medicalHistory.trim(),
    });
    onClose();
  }

  const inputCls =
    "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
      />

      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-300 bg-[#ffeedb] p-6 shadow-2xl dark:border-zinc-700 dark:bg-orange-950/40">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            Edit Patient
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
          onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
          className="mt-5 flex flex-col gap-4 rounded-xl border border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Full name
            <input
              ref={firstInputRef}
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
            />
          </label>

          <div className="flex gap-4">
            <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Age
              <input
                type="number"
                required
                min={10}
                max={60}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className={inputCls}
              />
            </label>

            <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Gestational age (weeks)
              <input
                type="number"
                required
                min={1}
                max={42}
                value={gestationalAgeWeeks}
                onChange={(e) => setGestationalAgeWeeks(e.target.value)}
                className={inputCls}
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Obstetric history
            <textarea
              rows={2}
              value={obstetricHistory}
              onChange={(e) => setObstetricHistory(e.target.value)}
              placeholder="e.g. G2P1, previous postpartum hemorrhage"
              className={`${inputCls} resize-none`}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Medical history
            <textarea
              rows={2}
              value={medicalHistory}
              onChange={(e) => setMedicalHistory(e.target.value)}
              placeholder="e.g. Chronic hypertension"
              className={`${inputCls} resize-none`}
            />
          </label>

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
              className="rounded-xl bg-[#0f766e] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-800"
            >
              Save changes
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
