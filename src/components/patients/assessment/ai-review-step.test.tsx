import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import type { Visit } from "@/lib/patients/types";
import { API_URL, envelope, server } from "@/test/server";
import { AiReviewStep } from "./ai-review-step";

const visit = { id: "v1", pregnancyId: "preg1", symptomIds: [], labResults: [] } as unknown as Visit;

const review = (over: object = {}) => ({
  visitId: "v1",
  status: "PENDING",
  level: "ORANGE",
  provisional: true,
  reasons: ["Blood pressure 150/95"],
  missing: [],
  decision: null,
  ...over,
});

function serve(reviewBody: object | null) {
  server.use(
    http.get(`${API_URL}/clinical-reference`, () =>
      HttpResponse.json(envelope({ symptoms: [], dangerSigns: [], dangerSignThresholds: {}, chwSigns: [] })),
    ),
    http.get(`${API_URL}/predictions/visits/v1`, () => HttpResponse.json(envelope(null))),
    http.get(`${API_URL}/risk-reviews/visits/v1`, () =>
      reviewBody
        ? HttpResponse.json(envelope(reviewBody))
        : HttpResponse.json({ message: "No risk review for this visit yet" }, { status: 404 }),
    ),
  );
}

function setup(onContinue = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <AiReviewStep visit={visit} onContinue={onContinue} />
    </QueryClientProvider>,
  );
  return onContinue;
}

describe("AiReviewStep", () => {
  it("holds the nurse here until the colour has been confirmed or changed", async () => {
    serve(review());
    const onContinue = setup();
    await screen.findByText(/waiting for a clinician/i);
    const next = screen.getByRole("button", { name: /continue/i });
    expect(next).toBeDisabled();
    expect(screen.getByText(/confirm or change the colour to continue/i)).toBeInTheDocument();
    await userEvent.click(next);
    expect(onContinue).not.toHaveBeenCalled();
  });

  it("lets the nurse continue once a decision is recorded", async () => {
    serve(review());
    server.use(
      http.post(`${API_URL}/risk-reviews/visits/v1/decision`, () => {
        // After deciding, the review answers as decided.
        serve(review({ status: "DECIDED", provisional: false, decision: { level: "ORANGE", note: null, decidedAt: null, decidedBy: null } }));
        return HttpResponse.json(envelope(review({ status: "DECIDED", provisional: false })));
      }),
    );
    const onContinue = setup();
    await screen.findByText(/waiting for a clinician/i);
    await userEvent.click(screen.getByRole("button", { name: /save decision/i }));
    const next = screen.getByRole("button", { name: /continue/i });
    await waitFor(() => expect(next).toBeEnabled());
    await userEvent.click(next);
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("lets the nurse continue when the visit has no review", async () => {
    serve(null);
    const onContinue = setup();
    const next = await screen.findByRole("button", { name: /continue/i });
    await waitFor(() => expect(next).toBeEnabled());
    await userEvent.click(next);
    expect(onContinue).toHaveBeenCalledWith(null);
  });
});
