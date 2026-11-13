import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      // Default is true — every alt-tab/window-focus refetches every
      // mounted, stale query at once (a detail page alone can mount a
      // dozen). Real freshness after any mutation (accept/close referral,
      // finalize assessment, etc.) already comes from each mutation's own
      // explicit invalidateQueries call, not from this — so disabling it
      // trades "catch another nurse's change the instant you refocus" for
      // "catch it within staleTime" (30s-2min depending on the query),
      // which is a fair trade for not re-fetching everything on every tab
      // switch.
      refetchOnWindowFocus: false,
    },
  },
});

// Some answers are derived by the API from other data — notifications, each
// patient's current risk colour (on the patient list/detail), pregnancy
// schedules (which depend on visits and home visits), what a facility
// may do with a patient, emergency capacity, the dashboard work lists and
// counters, and the director's reports. Whenever the app invalidates
// anything else (i.e. after the user changes something), those are
// refreshed too, so they stay as current as when the browser derived them.
const SERVER_DERIVED_KEYS = [
  "notification-feed",
  "patients",
  "patient-access",
  "facility-capacity",
  "pregnancies",
  "worklists",
  "reports",
];

queryClient.getQueryCache().subscribe((event) => {
  if (
    event.type === "updated" &&
    event.action.type === "invalidate" &&
    !SERVER_DERIVED_KEYS.includes(String(event.query.queryKey[0]))
  ) {
    for (const key of SERVER_DERIVED_KEYS) {
      void queryClient.invalidateQueries({ queryKey: [key] });
    }
  }
});
