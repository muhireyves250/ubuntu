"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { updatePatient } from "@/lib/patients/use-patients";
import { IconClose } from "@/components/dashboard/icons";
import type { Patient } from "@/lib/patients/types";

const CHRONIC_CONDITION_OPTIONS = [
  "Hypertension",
  "Diabetes",
  "Heart Disease",
  "HIV",
  "Asthma",
  "Epilepsy",
  "Kidney Disease",
] as const;

export function EditPatientModal({
  patient,
  onClose,
}: {
  patient: Patient;
  onClose: () => void;
}) {
  const [firstName, setFirstName] = useState(patient.firstName);
  const [lastName, setLastName] = useState(patient.lastName);
  const [dateOfBirth, setDateOfBirth] = useState(patient.dateOfBirth);
  const [phone, setPhone] = useState(patient.phone);
  const [altPhone, setAltPhone] = useState(patient.altPhone ?? "");
  const [maritalStatus, setMaritalStatus] = useState(patient.maritalStatus ?? "");

  const [district, setDistrict] = useState(patient.address.district);
  const [sector, setSector] = useState(patient.address.sector);
  const [cell, setCell] = useState(patient.address.cell);
  const [village, setVillage] = useState(patient.address.village);
  const [isibo, setIsibo] = useState(patient.address.isibo);

  const [contactName, setContactName] = useState(patient.emergencyContact.name);
  const [relationship, setRelationship] = useState(patient.emergencyContact.relationship);
  const [contactPhone, setContactPhone] = useState(patient.emergencyContact.phone);

  const [bloodGroup, setBloodGroup] = useState(patient.bloodGroup ?? "");
  const [rhFactor, setRhFactor] = useState<"" | "positive" | "negative">(patient.rhFactor ?? "");
  const [allergies, setAllergies] = useState(patient.allergies ?? "");
  const [chronicConditions, setChronicConditions] = useState<string[]>(
    (patient.chronicConditions ?? []).filter((c) =>
      (CHRONIC_CONDITION_OPTIONS as readonly string[]).includes(c),
    ),
  );
  const otherExisting = (patient.chronicConditions ?? []).find(
    (c) => !(CHRONIC_CONDITION_OPTIONS as readonly string[]).includes(c),
  );
  const [hasOtherCondition, setHasOtherCondition] = useState(!!otherExisting);
  const [otherCondition, setOtherCondition] = useState(otherExisting ?? "");

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstInputRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function toggleCondition(condition: string) {
    setChronicConditions((current) =>
      current.includes(condition)
        ? current.filter((c) => c !== condition)
        : [...current, condition],
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const conditions = [
      ...chronicConditions,
      ...(hasOtherCondition && otherCondition.trim() ? [otherCondition.trim()] : []),
    ];
    setIsSubmitting(true);
    try {
      await updatePatient(patient.id, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dateOfBirth,
        phone: phone.trim(),
        altPhone: altPhone.trim() || undefined,
        maritalStatus: maritalStatus.trim() || undefined,
        address: {
          district: district.trim(),
          sector: sector.trim(),
          cell: cell.trim(),
          village: village.trim(),
          isibo: isibo.trim(),
        },
        emergencyContact: {
          name: contactName.trim(),
          relationship: relationship.trim(),
          phone: contactPhone.trim(),
        },
        bloodGroup: bloodGroup.trim() || undefined,
        rhFactor: rhFactor || undefined,
        allergies: allergies.trim() || undefined,
        chronicConditions: conditions.length > 0 ? conditions : undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update patient");
    } finally {
      setIsSubmitting(false);
    }
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

      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-zinc-300 bg-[#ffeedb] shadow-2xl dark:border-zinc-700 dark:bg-orange-950/40">
        <div className="flex items-start justify-between gap-3 border-b border-zinc-300/70 px-6 py-5 dark:border-zinc-700/70">
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
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="flex flex-col gap-6 rounded-xl border border-zinc-300 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
                  {error}
                </p>
              )}

              <fieldset className="flex flex-col gap-3">
                <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Personal Information
                </legend>
                <p className="text-xs text-zinc-400">National ID: {patient.nationalId} (not editable)</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    First Name
                    <input ref={firstInputRef} type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputCls} />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Last Name
                    <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputCls} />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Date of Birth
                    <input type="date" required value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className={inputCls} />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Phone Number
                    <input type="text" required value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Alternative Phone Number
                    <input type="text" value={altPhone} onChange={(e) => setAltPhone(e.target.value)} className={inputCls} />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Marital Status
                    <input type="text" value={maritalStatus} onChange={(e) => setMaritalStatus(e.target.value)} className={inputCls} />
                  </label>
                </div>
              </fieldset>

              <fieldset className="flex flex-col gap-3 border-t border-zinc-100 pt-5 dark:border-zinc-800">
                <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Address
                </legend>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    District
                    <input type="text" required value={district} onChange={(e) => setDistrict(e.target.value)} className={inputCls} />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Sector
                    <input type="text" required value={sector} onChange={(e) => setSector(e.target.value)} className={inputCls} />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Cell
                    <input type="text" required value={cell} onChange={(e) => setCell(e.target.value)} className={inputCls} />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Village
                    <input type="text" required value={village} onChange={(e) => setVillage(e.target.value)} className={inputCls} />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Isibo
                    <input type="text" required value={isibo} onChange={(e) => setIsibo(e.target.value)} className={inputCls} />
                  </label>
                </div>
              </fieldset>

              <fieldset className="flex flex-col gap-3 border-t border-zinc-100 pt-5 dark:border-zinc-800">
                <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Emergency Contact
                </legend>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 sm:col-span-2">
                    Contact Name
                    <input type="text" required value={contactName} onChange={(e) => setContactName(e.target.value)} className={inputCls} />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Relationship
                    <input type="text" required value={relationship} onChange={(e) => setRelationship(e.target.value)} className={inputCls} />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Phone Number
                    <input type="text" required value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className={inputCls} />
                  </label>
                </div>
              </fieldset>

              <fieldset className="flex flex-col gap-3 border-t border-zinc-100 pt-5 dark:border-zinc-800">
                <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Basic Medical Information
                </legend>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Blood Group
                    <input type="text" value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} className={inputCls} />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Rh Factor
                    <select value={rhFactor} onChange={(e) => setRhFactor(e.target.value as typeof rhFactor)} className={inputCls}>
                      <option value="">Unknown</option>
                      <option value="positive">Positive</option>
                      <option value="negative">Negative</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 sm:col-span-2">
                    Known Allergies
                    <textarea rows={2} value={allergies} onChange={(e) => setAllergies(e.target.value)} className={`${inputCls} resize-none`} />
                  </label>
                  <div className="sm:col-span-2">
                    <p className="mb-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Chronic Medical Conditions
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
                            onChange={() => toggleCondition(condition)}
                            className="h-4 w-4 rounded border-zinc-300 text-teal-700 focus:ring-teal-600"
                          />
                          {condition}
                        </label>
                      ))}
                      <label className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 has-checked:border-teal-600 has-checked:bg-teal-50 dark:border-zinc-800 dark:text-zinc-300 dark:has-checked:border-teal-600 dark:has-checked:bg-teal-950/40">
                        <input
                          type="checkbox"
                          checked={hasOtherCondition}
                          onChange={(e) => setHasOtherCondition(e.target.checked)}
                          className="h-4 w-4 rounded border-zinc-300 text-teal-700 focus:ring-teal-600"
                        />
                        Other
                      </label>
                    </div>
                    {hasOtherCondition && (
                      <input
                        type="text"
                        placeholder="Specify condition"
                        value={otherCondition}
                        onChange={(e) => setOtherCondition(e.target.value)}
                        className={`${inputCls} mt-2 w-full`}
                      />
                    )}
                  </div>
                </div>
              </fieldset>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-zinc-300/70 bg-[#ffeedb] px-6 py-4 dark:border-zinc-700/70 dark:bg-orange-950/40">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-[#0f766e] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
