"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { SupportButton } from "@/components/dashboard/support-button";
import { RedCaseAlertPanel } from "@/components/dashboard/red-case-alert";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isHydrated } = useAuth();

  useEffect(() => {
    if (isHydrated && !user) {
      router.replace("/login");
    }
  }, [isHydrated, user, router]);

  if (!isHydrated || !user) return null;

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-[#ffebd6] text-zinc-900 dark:bg-zinc-950">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex flex-1 flex-col overflow-hidden px-4 pb-4 sm:px-6 sm:pb-6">
          <div className="scrollbar-hidden flex-1 overflow-y-auto rounded-4xl bg-white px-6 py-8 shadow-sm dark:bg-zinc-900 sm:px-8">
            <div className="sticky top-0 z-20 [&:has(>*)]:mb-6">
              <RedCaseAlertPanel />
            </div>
            {children}
          </div>
        </main>
      </div>
      <SupportButton />
    </div>
  );
}
