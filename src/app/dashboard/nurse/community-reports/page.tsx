"use client";

import { RoleGuard } from "@/components/role-guard";
import { IconReport } from "@/components/dashboard/icons";
import { CommunityVisitList } from "@/components/patients/community-visit-list";

function CommunityReportsContent() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-300 bg-[#ffeedb] px-4 py-3 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">
          Community Reports
        </h2>
      </div>

      <div className="rounded-[1.25rem] border border-amber-300 bg-amber-50/60 p-6 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/20">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
            <IconReport className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-semibold text-amber-900 dark:text-amber-300">
              CHW Home Visit Reports
            </h2>
            <p className="text-sm text-amber-700/80 dark:text-amber-400/80">
              Reports submitted by community health workers for patients in your facility.
            </p>
          </div>
        </div>

        <div className="mt-4">
          <CommunityVisitList />
        </div>
      </div>
    </div>
  );
}

export default function CommunityReportsPage() {
  return (
    <RoleGuard roles={["nurse"]}>
      <CommunityReportsContent />
    </RoleGuard>
  );
}
