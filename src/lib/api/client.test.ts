import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { API_URL, envelope, server } from "@/test/server";
import { ApiError, apiFetch, apiFetchAllPages } from "./client";

describe("apiFetch", () => {
  it("returns the data inside the API envelope and sends the token", async () => {
    let auth: string | null = null;
    server.use(
      http.get(`${API_URL}/thing`, ({ request }) => {
        auth = request.headers.get("authorization");
        return HttpResponse.json(envelope({ id: "1" }));
      }),
    );
    expect(await apiFetch<{ id: string }>("/thing", { token: "t0k" })).toEqual({ id: "1" });
    expect(auth).toBe("Bearer t0k");
  });

  it("throws an ApiError carrying the API's message and status", async () => {
    server.use(
      http.get(`${API_URL}/bad`, () => HttpResponse.json({ message: "Nope" }, { status: 400 })),
    );
    await expect(apiFetch("/bad")).rejects.toMatchObject({
      name: "ApiError",
      message: "Nope",
      statusCode: 400,
    });
    await expect(apiFetch("/bad")).rejects.toBeInstanceOf(ApiError);
  });

  it("walks every page", async () => {
    server.use(
      http.get(`${API_URL}/list`, ({ request }) => {
        const page = Number(new URL(request.url).searchParams.get("page"));
        return HttpResponse.json(
          envelope({ data: [page * 10, page * 10 + 1], meta: { totalPages: 3 } }),
        );
      }),
    );
    expect(await apiFetchAllPages<number>("/list")).toEqual([10, 11, 20, 21, 30, 31]);
  });
});
