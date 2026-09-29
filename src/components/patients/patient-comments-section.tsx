"use client";

import { useState } from "react";
import { useCommentsForPatient, createComment } from "@/lib/patients/use-patients";
import { useAuth } from "@/lib/auth/auth-context";
import { formatExactDateTime, getInitials } from "@/lib/format";
import { IconChat } from "@/components/dashboard/icons";
import type { PatientComment } from "@/lib/patients/patient-comment-api";

const ROLE_LABELS: Record<string, string> = {
  NURSE: "Nurse",
  GYNECOLOGIST: "Gynecologist",
  LAB_TECHNICIAN: "Lab Technician",
  HOSPITAL_DIRECTOR: "Hospital Admin",
  COMMUNITY_HEALTH_WORKER: "CHW",
};

// A stable color per person (hashed from their name) so participants stay
// visually distinct across a thread, instead of every avatar being teal.
const AVATAR_PALETTES = [
  "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300",
  "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
];

function paletteFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length];
}

function Avatar({ name, size = "h-9 w-9 text-xs" }: { name: string; size?: string }) {
  return (
    <span className={`flex ${size} shrink-0 items-center justify-center rounded-full font-semibold ${paletteFor(name)}`}>
      {getInitials(name)}
    </span>
  );
}

function ReplyComposer({
  onSubmit,
  onCancel,
}: {
  onSubmit: (body: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const body = draft.trim();
    if (!body || isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post reply");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-2 flex flex-col gap-1.5">
      <textarea
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={2}
        placeholder="Write a reply…"
        className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 transition-shadow focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
      />
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!draft.trim() || isSubmitting}
          className="rounded-md bg-[#0f766e] px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
        >
          {isSubmitting ? "Posting…" : "Reply"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-3 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function CommentRow({
  comment,
  patientId,
  nested = false,
}: {
  comment: PatientComment;
  patientId: string;
  nested?: boolean;
}) {
  const [isReplying, setIsReplying] = useState(false);
  const roleLabel = ROLE_LABELS[comment.authorRole] ?? comment.authorRole;

  return (
    <li className="flex gap-3">
      <Avatar name={comment.authorName} size={nested ? "h-7 w-7 text-[11px]" : "h-9 w-9 text-xs"} />
      <div className="min-w-0 flex-1">
        <div className="group rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{comment.authorName}</p>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              {roleLabel}
            </span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">· {comment.facilityName}</span>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            {comment.body}
          </p>
        </div>
        <div className="mt-1.5 flex items-center gap-3 px-1">
          <p className="text-xs text-zinc-400 dark:text-zinc-500">{formatExactDateTime(comment.createdAt)}</p>
          {!nested && (
            <button
              type="button"
              onClick={() => setIsReplying((v) => !v)}
              className="text-xs font-semibold text-teal-700 hover:underline dark:text-teal-400"
            >
              Reply
            </button>
          )}
        </div>

        {isReplying && (
          <ReplyComposer
            onSubmit={async (body) => {
              await createComment(patientId, body, comment.id);
              setIsReplying(false);
            }}
            onCancel={() => setIsReplying(false)}
          />
        )}

        {comment.replies.length > 0 && (
          <ul className="mt-3 flex flex-col gap-3 border-l-2 border-zinc-100 pl-3.5 dark:border-zinc-800">
            {comment.replies.map((reply) => (
              <CommentRow key={reply.id} comment={reply} patientId={patientId} nested />
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

export function PatientCommentsSection({ patientId }: { patientId: string }) {
  const { user } = useAuth();
  const comments = useCommentsForPatient(patientId);
  const [draft, setDraft] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalCount = comments.reduce((sum, c) => sum + 1 + c.replies.length, 0);

  async function handleSubmit() {
    const body = draft.trim();
    if (!body || isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await createComment(patientId, body);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post comment");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex shrink-0 items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-400">
          <IconChat className="h-3.5 w-3.5" />
        </span>
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Comments</p>
        {totalCount > 0 && (
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            {totalCount}
          </span>
        )}
      </div>

      <div className="flex shrink-0 gap-3">
        <Avatar name={user?.name ?? "Me"} />
        <div className="flex-1">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder="Share an update or note for anyone viewing this patient…"
            className="w-full resize-none rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 transition-shadow focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
          {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!draft.trim() || isSubmitting}
              className="rounded-md bg-[#0f766e] px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
            >
              {isSubmitting ? "Posting…" : "Comment"}
            </button>
          </div>
        </div>
      </div>

      <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto">
        {comments.length > 0 ? (
          <ul className="flex flex-col gap-4">
            {comments.map((c) => (
              <CommentRow key={c.id} comment={c} patientId={patientId} />
            ))}
          </ul>
        ) : (
          <p className="text-center text-sm text-zinc-400 dark:text-zinc-500">
            No comments yet — be the first to add one.
          </p>
        )}
      </div>
    </div>
  );
}
