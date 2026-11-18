import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RiskBadge } from "./risk-badge";

describe("RiskBadge", () => {
  it.each([
    ["green", "Green"],
    ["yellow", "Yellow"],
    ["orange", "Orange"],
    ["red", "Red"],
  ] as const)("shows %s as %s", (level, label) => {
    render(<RiskBadge level={level} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
