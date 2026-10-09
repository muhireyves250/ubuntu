"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { SupportButton } from "@/components/dashboard/support-button";
import { RedCaseAlertPanel } from "@/components/dashboard/red-case-alert";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { useIdleSignOut } from "@/lib/auth/use-idle-sign-out";

// The dashboard "Overview" root for every role — the only page that gets the
// fit-to-screen treatment (no outer-page scroll, internal scroll per
// column), matching the patient detail page's per-tab pattern. Every other
// route keeps the default: content grows and this shared card scrolls.
// Fit-to-screen applies on phones (below sm, where the overview is laid
// out as a single compact app screen with only the referrals list
// scrolling) and at lg+. Tablets in between fall back to the same "card
// scrolls normally" behavior as every other route — the stacked layout is
// too tall to fit there. If content still can't fit (very short screens)
// the card's own overflow-y-auto lets it scroll rather than clip.
const FIT_TO_SCREEN_ROUTES = [
  "/dashboard",
  "/dashboard/nurse",
  "/dashboard/gynecologist",
  "/dashboard/hospital-admin",
  "/dashboard/lab",
  "/dashboard/chw",
];

// Pages built as a fixed-height screen (header + tabs/filters pinned, one
// inner area that scrolls). They get exactly the height left below the
// Pending Emergency Referrals panel, so when that panel is open the page's
// scroll area gets shorter instead of the whole card scrolling — at every
// screen size.
const FIXED_HEIGHT_ROUTES = [
  "/dashboard/settings",
  "/dashboard/nurse/patients",
  "/dashboard/nurse/risk-classification",
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isHydrated } = useAuth();
  useIdleSignOut();

  useEffect(() => {
    if (isHydrated && !user) {
      router.replace("/login");
    }
  }, [isHydrated, user, router]);

  if (!isHydrated || !user) return null;

  const fitToScreen = FIT_TO_SCREEN_ROUTES.includes(pathname);
  const fixedHeight = FIXED_HEIGHT_ROUTES.includes(pathname);

  return (
    <div className="flex h-dvh overflow-hidden bg-[#ffebd6] text-zinc-900 dark:bg-zinc-950">
      {/* h-dvh (not fixed inset-0 / 100vh) — tracks the real visible
          viewport on mobile, which shrinks correctly when the on-screen
          keyboard opens or the browser's address bar collapses, instead of
          staying pinned to a stale layout viewport size. */}
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex flex-1 flex-col overflow-hidden sm:px-6 sm:pb-6">
          {/* Edge-to-edge below the topbar on mobile — no floating card in
              a colored gutter, which reads as a desktop dashboard rather
              than a native screen. The card look (rounding, shadow, margin)
              returns at sm+ where there's room for it to read as a panel
              rather than the whole screen. */}
          <div
            className={`scrollbar-hidden bg-white dark:bg-zinc-900 flex-1 overflow-y-auto px-5 py-6 sm:rounded-4xl sm:px-8 sm:py-8 sm:shadow-sm ${
              fitToScreen
                ? "max-sm:flex max-sm:min-h-0 max-sm:flex-col max-sm:px-3 max-sm:py-3 lg:flex lg:min-h-0 lg:flex-col lg:overflow-visible"
                : fixedHeight
                  ? "flex min-h-0 flex-col"
                  : ""
            }`}
          >
            {/* Sticky only at lg+ — on a phone the panel can take up most of
                the screen, so pinning it would cover the content scrolling
                beneath it. On mobile it scrolls away with the page. */}
            <div className="shrink-0 bg-white dark:bg-zinc-900 lg:sticky lg:top-0 lg:z-20 [&:has(>*)]:mb-6">
              <RedCaseAlertPanel />
            </div>
            {fitToScreen ? (
              <div className="max-sm:min-h-0 max-sm:flex-1 lg:min-h-0 lg:flex-1">{children}</div>
            ) : fixedHeight ? (
              <div className="min-h-0 flex-1">{children}</div>
            ) : (
              children
            )}
          </div>
        </main>
        <BottomNav />
      </div>
      <SupportButton />
    </div>
  );
}
