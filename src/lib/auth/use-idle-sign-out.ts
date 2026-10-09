"use client";

import { useEffect } from "react";
import { useAuth } from "./auth-context";
import { usePreferences } from "@/lib/preferences";

const ACTIVITY_EVENTS = ["pointerdown", "keydown", "scroll", "touchstart", "mousemove"] as const;

// Signs the user out after the "Auto sign-out" preference's minutes of no
// input — for shared clinic computers left logged in.
export function useIdleSignOut() {
  const { user, logout } = useAuth();
  const { idleSignOutMinutes } = usePreferences();

  useEffect(() => {
    if (!user || idleSignOutMinutes === 0) return;
    const limitMs = idleSignOutMinutes * 60_000;
    let timer = window.setTimeout(expire, limitMs);

    function expire() {
      logout();
      // Full navigation so the layout's plain "/login" redirect can't race
      // this one and drop the timed-out notice.
      window.location.replace("/login?timed-out=1");
    }
    function reset() {
      window.clearTimeout(timer);
      timer = window.setTimeout(expire, limitMs);
    }

    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, reset, { passive: true }));
    return () => {
      window.clearTimeout(timer);
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, reset));
    };
  }, [user, idleSignOutMinutes, logout]);
}
