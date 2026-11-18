import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useWizardStarted, wizardOpen } from "./use-wizard-open";

describe("wizardOpen", () => {
  it("is open while the visit needs finalizing, and closed otherwise", () => {
    expect(wizardOpen(true, false)).toBe(true);
    expect(wizardOpen(false, false)).toBe(false);
  });

  it("stays open after the visit is finalized if the wizard has started its last step", () => {
    expect(wizardOpen(false, true)).toBe(true);
  });
});

describe("useWizardStarted", () => {
  it("is not started to begin with", () => {
    const { result } = renderHook(() => useWizardStarted());
    expect(result.current.started).toBe(false);
  });

  it("stays started until the wizard says it is done", () => {
    const { result } = renderHook(() => useWizardStarted());
    act(() => result.current.begin());
    expect(result.current.started).toBe(true);
    act(() => result.current.done());
    expect(result.current.started).toBe(false);
  });
});
