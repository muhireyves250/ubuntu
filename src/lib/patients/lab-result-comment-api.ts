import { apiFetch } from "@/lib/api/client";
import { getStoredAccessToken } from "@/lib/auth/auth-context";
import type { LabResultComment } from "./types";

interface BackendLabResultComment {
  id: string;
  labResultId: string;
  body: string;
  createdAt: string;
  author: { id: string; firstName: string; lastName: string; role: string };
}

function toFrontendComment(c: BackendLabResultComment): LabResultComment {
  return {
    id: c.id,
    labResultId: c.labResultId,
    authorId: c.author.id,
    authorName: `${c.author.firstName} ${c.author.lastName}`,
    authorRole: c.author.role,
    body: c.body,
    createdAt: c.createdAt,
  };
}

export async function postLabResultCommentApi(labResultId: string, body: string): Promise<LabResultComment> {
  const token = getStoredAccessToken();
  const c = await apiFetch<BackendLabResultComment>(
    `/lab-requests/results/${labResultId}/comments`,
    { method: "POST", body: { body }, token: token ?? undefined },
  );
  return toFrontendComment(c);
}
