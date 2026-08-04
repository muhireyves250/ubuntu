"use client";

import { useState } from "react";
import { postLabResultCommentApi } from "@/lib/patients/lab-result-comment-api";
import type { LabTestResult } from "@/lib/patients/types";

export function LabResultCommentBox({
  result,
  onPosted,
}: {
  result: LabTestResult;
  onPosted: () => void;
}) {
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePost() {
    if (!body.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await postLabResultCommentApi(result.labResultId, body.trim());
      setBody("");
      onPosted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post comment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-2 flex flex-col gap-2 border-t border-zinc-200 pt-2 dark:border-zinc-800">
      {(result.resultComments ?? []).map((c) => (
        <div key={c.id} className="rounded-lg bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-800">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">{c.authorName}: </span>
          <span className="text-zinc-600 dark:text-zinc-400">{c.body}</span>
        </div>
      ))}
      <div className="flex gap-2">
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a comment…"
          className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
        <button
          type="button"
          disabled={!body.trim() || isSubmitting}
          onClick={handlePost}
          className="rounded-lg bg-[#0f766e] px-3 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Post
        </button>
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
