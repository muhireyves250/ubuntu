"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconClose } from "./icons";
import { ProfilePhoto } from "./profile-photo";
import { resizeImageToSquare } from "@/lib/image";

// Same shell as EditPatientModal: cream frame, white inner card, footer actions.
export function EditContactModal({
  name,
  phone,
  avatarUrl,
  onSave,
  onClose,
}: {
  name: string;
  phone: string;
  avatarUrl: string | null;
  /** `avatar` is only sent when the photo changed ("" = removed). */
  onSave: (changes: { phone: string; avatar?: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [value, setValue] = useState(phone);
  const [photo, setPhoto] = useState<string | null>(avatarUrl);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function choosePhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    setIsProcessingPhoto(true);
    try {
      setPhoto(await resizeImageToSquare(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not use this image");
    } finally {
      setIsProcessingPhoto(false);
    }
  }
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await onSave({
        phone: value.trim(),
        ...(photo !== avatarUrl ? { avatar: photo ?? "" } : {}),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your details");
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

      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-300 bg-[#ffeedb] shadow-2xl dark:border-zinc-700 dark:bg-orange-950/40">
        <div className="flex items-start justify-between gap-3 border-b border-zinc-300/70 px-6 py-5 dark:border-zinc-700/70">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Update Details</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="flex flex-col gap-4 rounded-xl border border-zinc-300 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
                  {error}
                </p>
              )}
              <fieldset className="flex flex-col gap-3">
                <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Profile photo
                </legend>
                <div className="flex items-center gap-4">
                  <ProfilePhoto
                    name={name}
                    src={photo}
                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-teal-100 text-lg font-semibold text-teal-800 dark:bg-teal-950 dark:text-teal-300"
                  />
                  <div className="flex flex-wrap gap-2">
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={choosePhoto} className="hidden" />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessingPhoto}
                      className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      {isProcessingPhoto ? "Preparing…" : photo ? "Change photo" : "Choose photo"}
                    </button>
                    {photo && (
                      <button
                        type="button"
                        onClick={() => setPhoto(null)}
                        className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 dark:border-red-800 dark:bg-zinc-900 dark:text-red-300 dark:hover:bg-red-950/50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                <span className="text-xs text-zinc-400">JPEG, PNG or WebP. It&apos;s cropped to a square.</span>
              </fieldset>

              <fieldset className="flex flex-col gap-3">
                <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Contact
                </legend>
                <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Phone number
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    autoFocus
                    placeholder="e.g. 0788 123 456"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className={inputCls}
                  />
                  <span className="text-xs font-normal text-zinc-400">
                    So colleagues and referring facilities can reach you. Leave empty to remove it.
                  </span>
                </label>
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
              disabled={isSubmitting || isProcessingPhoto}
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
