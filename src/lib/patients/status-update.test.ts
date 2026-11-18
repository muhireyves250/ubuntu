import { describe, expect, it } from "vitest";
import { statusUpdateFor } from "./status-update";

describe("statusUpdateFor", () => {
  it("sends a red case onward, and closes nothing", () => {
    expect(statusUpdateFor("red", false)).toEqual({ escalate: true, closeAs: null });
    expect(statusUpdateFor("red", true)).toEqual({ escalate: true, closeAs: null });
  });

  it("closes an open case as stable when the decided colour is green", () => {
    expect(statusUpdateFor("green", true)).toEqual({ escalate: false, closeAs: "stable" });
  });

  it("closes an open case as improved when the decided colour is yellow", () => {
    expect(statusUpdateFor("yellow", true)).toEqual({ escalate: false, closeAs: "improved" });
  });

  it("leaves an open case alone when the decided colour is orange", () => {
    expect(statusUpdateFor("orange", true)).toEqual({ escalate: false, closeAs: null });
  });

  it("does nothing when there is no open case and the colour is not red", () => {
    for (const level of ["green", "yellow", "orange"] as const) {
      expect(statusUpdateFor(level, false)).toEqual({ escalate: false, closeAs: null });
    }
  });
});
