"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { SupportButton } from "@/components/dashboard/support-button";
import { RedCaseAlertPanel } from "@/components/dashboard/red-case-alert";

// The dashboard "Overview" root for every role — the only page that gets the
// fit-to-screen treatment (no outer-page scroll, internal scroll per
// column) today, matching the patient detail page's per-tab pattern. Every
// other route keeps the default: content grows and this shared card scrolls.
const FIT_TO_SCREEN_ROUTES = [
  "/dashboard",
  "/dashboard/nurse",
  "/dashboard/gynecologist",
  "/dashboard/hospital-admin",
  "/dashboard/lab",
  "/dashboard/chw",
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isHydrated } = useAuth();

  useEffect(() => {
    if (isHydrated && !user) {
      router.replace("/login");
    }
  }, [isHydrated, user, router]);

  if (!isHydrated || !user) return null;

  const fitToScreen = FIT_TO_SCREEN_ROUTES.includes(pathname);

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-[#ffebd6] text-zinc-900 dark:bg-zinc-950">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex flex-1 flex-col overflow-hidden px-4 pb-4 sm:px-6 sm:pb-6">
          <div
            className={`rounded-4xl bg-white shadow-sm dark:bg-zinc-900 ${
              fitToScreen
                ? "flex min-h-0 flex-1 flex-col px-6 py-8 sm:px-8"
                : "scrollbar-hidden flex-1 overflow-y-auto px-6 py-8 sm:px-8"
            }`}
          >
            <div className="sticky top-0 z-20 shrink-0 [&:has(>*)]:mb-6">
              <RedCaseAlertPanel />
            </div>
            {fitToScreen ? (
              <div className="min-h-0 flex-1">{children}</div>
            ) : (
              children
            )}
          </div>
        </main>
      </div>
      <SupportButton />
    </div>
  );
}
