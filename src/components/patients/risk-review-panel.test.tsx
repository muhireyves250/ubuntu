import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { API_URL, envelope, server } from "@/test/server";
import { RiskReviewPanel } from "./risk-review-panel";

const pending = {
  visitId: "v1",
  status: "PENDING",
  level: "ORANGE",
  provisional: true,
  reasons: ["Blood pressure 150/95", "Haemoglobin below 9"],
  missing: [],
  decision: null,
};

const decided = {
  ...pending,
  status: "DECIDED",
  level: "RED",
  provisional: false,
  decision: {
    level: "RED",
    note: "Seen and confirmed",
    decidedAt: "2026-11-18T10:00:00.000Z",
    decidedBy: { firstName: "Ada", lastName: "Mukamana" },
  },
};

function showReview(body: unknown, status = 200) {
  server.use(
    http.get(`${API_URL}/risk-reviews/visits/v1`, () =>
      status === 200
        ? HttpResponse.json(envelope(body))
        : HttpResponse.json(body as object, { status }),
    ),
  );
}

function setup(canDecide: boolean) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <RiskReviewPanel visitId="v1" canDecide={canDecide} />
    </QueryClientProvider>,
  );
}

describe("RiskReviewPanel", () => {
  it("shows the one colour, its reasons, and that it still awaits a decision", async () => {
    showReview(pending);
    setup(false);
    expect(await screen.findByText("Orange")).toBeInTheDocument();
    expect(screen.getByText("Blood pressure 150/95")).toBeInTheDocument();
    expect(screen.getByText("Haemoglobin below 9")).toBeInTheDocument();
    expect(screen.getByText(/waiting for a clinician/i)).toBeInTheDocument();
  });

  it("shows who decided, and the note, once decided", async () => {
    showReview(decided);
    setup(false);
    expect(await screen.findByText("Red")).toBeInTheDocument();
    expect(screen.getByText(/Ada Mukamana/)).toBeInTheDocument();
    expect(screen.getByText("Seen and confirmed")).toBeInTheDocument();
    expect(screen.queryByText(/waiting for a clinician/i)).not.toBeInTheDocument();
  });

  it("shows nothing when the visit has no review yet", async () => {
    showReview({ message: "No risk review for this visit yet" }, 404);
    const { container } = setup(true);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it("offers no decision form to someone who cannot decide", async () => {
    showReview(pending);
    setup(false);
    await screen.findByText(/waiting for a clinician/i);
    expect(screen.queryByRole("button", { name: /save decision/i })).not.toBeInTheDocument();
  });

  it("confirms the shown colour without a note", async () => {
    showReview(pending);
    let body: unknown;
    server.use(
      http.post(`${API_URL}/risk-reviews/visits/v1/decision`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(envelope(decided));
      }),
    );
    setup(true);
    await screen.findByText(/waiting for a clinician/i);
    await userEvent.click(screen.getByRole("button", { name: /save decision/i }));
    await waitFor(() => expect(body).toEqual({ finalLevel: "ORANGE" }));
  });

  it("raises the colour without a note", async () => {
    showReview(pending);
    let body: unknown;
    server.use(
      http.post(`${API_URL}/risk-reviews/visits/v1/decision`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(envelope(decided));
      }),
    );
    setup(true);
    await screen.findByText(/waiting for a clinician/i);
    await userEvent.selectOptions(screen.getByLabelText(/final colour/i), "red");
    await userEvent.click(screen.getByRole("button", { name: /save decision/i }));
    await waitFor(() => expect(body).toEqual({ finalLevel: "RED" }));
  });

  it("will not lower the colour without a note, and sends the note once given", async () => {
    showReview(pending);
    let body: unknown;
    server.use(
      http.post(`${API_URL}/risk-reviews/visits/v1/decision`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(envelope(decided));
      }),
    );
    setup(true);
    await screen.findByText(/waiting for a clinician/i);
    await userEvent.selectOptions(screen.getByLabelText(/final colour/i), "yellow");
    const save = screen.getByRole("button", { name: /save decision/i });
    expect(save).toBeDisabled();
    expect(screen.getByText(/add a note to lower the colour/i)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/note/i), "Reading was a cuff error");
    expect(save).toBeEnabled();
    await userEvent.click(save);
    await waitFor(() =>
      expect(body).toEqual({ finalLevel: "YELLOW", note: "Reading was a cuff error" }),
    );
  });

  it("shows the API's message when the decision is refused", async () => {
    showReview(pending);
    server.use(
      http.post(`${API_URL}/risk-reviews/visits/v1/decision`, () =>
        HttpResponse.json({ message: "Visit is locked" }, { status: 403 }),
      ),
    );
    setup(true);
    await screen.findByText(/waiting for a clinician/i);
    await userEvent.click(screen.getByRole("button", { name: /save decision/i }));
    expect(await screen.findByText("Visit is locked")).toBeInTheDocument();
  });

  it("never names the rules or the AI as where the colour comes from", async () => {
    showReview(pending);
    const { container } = setup(true);
    await screen.findByText(/waiting for a clinician/i);
    expect(container.textContent).not.toMatch(/\b(ai|rules?|rule engine|model)\b/i);
  });
});
