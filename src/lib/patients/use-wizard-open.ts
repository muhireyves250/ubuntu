"use client";

import { useCallback, useState } from "react";

/**
 * Remembers that the nurse has submitted the final step of the finish-assessment
 * wizard. From then on the visit counts as finalized, but the wizard has to stay
 * on screen until it reports it is done, because its last step is what sends a
 * red case onward. Call it before any early return in the page.
 */
export function useWizardStarted(): { started: boolean; begin: () => void; done: () => void } {
  const [started, setStarted] = useState(false);
  const begin = useCallback(() => setStarted(true), []);
  const done = useCallback(() => setStarted(false), []);
  return { started, begin, done };
}

/** The wizard is shown while the visit needs finalizing, or until it says it is done. */
export function wizardOpen(needsFinalization: boolean, started: boolean): boolean {
  return needsFinalization || started;
}
