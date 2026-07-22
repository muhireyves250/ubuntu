const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

interface ApiEnvelope<T> {
  data: T;
  message: string;
  statusCode: number;
  timestamp: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(
  path: string,
  options: { method?: string; body?: unknown; token?: string } = {},
): Promise<T> {
  const { method = "GET", body, token } = options;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const json = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!res.ok) {
    throw new ApiError(json?.message ?? `Request failed with status ${res.status}`, res.status);
  }
  if (!json) {
    throw new ApiError("Empty response from server", res.status);
  }
  return json.data;
}
