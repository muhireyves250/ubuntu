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
