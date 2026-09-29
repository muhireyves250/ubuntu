import { apiFetch } from "@/lib/api/client";
import { getStoredAccessToken } from "@/lib/auth/auth-context";

export interface PatientComment {
  id: string;
  patientId: string;
  body: string;
  createdAt: string;
  authorName: string;
  authorRole: string;
  facilityName: string;
  replies: PatientComment[];
}

export interface CommentReply {
  id: string;
  patientId: string;
  patientName: string;
  body: string;
  createdAt: string;
  authorName: string;
  parentCommentId: string;
  parentBody: string;
}

interface BackendPatientComment {
  id: string;
  patientId: string;
  body: string;
  createdAt: string;
  author: { firstName: string; lastName: string; role: string };
  facility: { id: string; name: string };
  replies?: BackendPatientComment[];
}

interface BackendCommentReply extends BackendPatientComment {
  parent: { id: string; body: string };
  patient: { id: string; firstName: string; lastName: string };
}

function toFrontendComment(c: BackendPatientComment): PatientComment {
  return {
    id: c.id,
    patientId: c.patientId,
    body: c.body,
    createdAt: c.createdAt,
    authorName: `${c.author.firstName} ${c.author.lastName}`,
    authorRole: c.author.role,
    facilityName: c.facility.name,
    replies: (c.replies ?? []).map(toFrontendComment),
  };
}

function toFrontendReply(c: BackendCommentReply): CommentReply {
  return {
    id: c.id,
    patientId: c.patientId,
    patientName: `${c.patient.firstName} ${c.patient.lastName}`,
    body: c.body,
    createdAt: c.createdAt,
    authorName: `${c.author.firstName} ${c.author.lastName}`,
    parentCommentId: c.parent.id,
    parentBody: c.parent.body,
  };
}

export async function fetchCommentsForPatient(patientId: string): Promise<PatientComment[]> {
  const token = getStoredAccessToken();
  const comments = await apiFetch<BackendPatientComment[]>(`/patients/${patientId}/comments`, {
    token: token ?? undefined,
  });
  return comments.map(toFrontendComment);
}

export async function createCommentApi(
  patientId: string,
  body: string,
  parentId?: string,
): Promise<PatientComment> {
  const token = getStoredAccessToken();
  const c = await apiFetch<BackendPatientComment>(`/patients/${patientId}/comments`, {
    method: "POST",
    body: { body, parentId },
    token: token ?? undefined,
  });
  return toFrontendComment(c);
}

export async function fetchRepliesToMe(): Promise<CommentReply[]> {
  const token = getStoredAccessToken();
  const replies = await apiFetch<BackendCommentReply[]>("/comments/replies-to-me", {
    token: token ?? undefined,
  });
  return replies.map(toFrontendReply);
}
