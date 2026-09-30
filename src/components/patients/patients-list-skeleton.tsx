// Mirrors the Patient Registry page's toolbar/filter/table structure so
// there's no layout shift when real rows swap in.
function Bone({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800 ${className}`} />;
}

export function PatientsListSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-300 bg-[#ffeedb] px-4 py-3 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
        <Bone className="h-5 w-28" />
        <div className="flex items-center gap-2">
          <Bone className="h-8 w-24 rounded-lg" />
          <Bone className="h-8 w-8 rounded-lg" />
          <Bone className="h-9 w-40 rounded-lg" />
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 rounded-xl border border-zinc-300 bg-[#ffeedb] p-3 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
        <Bone className="h-10 min-w-48 flex-1 rounded-lg" />
        <Bone className="h-10 w-28 rounded-lg" />
        <Bone className="h-10 w-36 rounded-lg" />
        <Bone className="ml-auto h-10 w-40 rounded-lg" />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-zinc-300 bg-[#ffeedb] shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
        <div className="min-h-0 flex-1 overflow-hidden p-2 sm:hidden">
          <div className="flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-center gap-2.5">
                  <Bone className="h-9 w-9 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Bone className="h-3.5 w-32" />
                    <Bone className="h-3 w-20" />
                  </div>
                  <Bone className="h-5 w-12 rounded-full" />
                </div>
                <Bone className="h-3 w-48" />
              </div>
            ))}
          </div>
        </div>

        <div className="hidden min-h-0 flex-1 overflow-hidden sm:block">
          <table className="w-full border-separate border-spacing-x-0 border-spacing-y-1.5 text-left text-sm">
            <thead className="bg-[#ffeedb] text-xs uppercase tracking-wide text-zinc-500 dark:bg-orange-950/40 dark:text-zinc-400">
              <tr>
                {["ID", "Patient", "Facility", "Age", "Gestational age", "Practitioner", "Latest risk", "Last visit"].map(
                  (h) => (
                    <th key={h} className="px-4 py-3">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  <td className="rounded-l-lg bg-white px-4 py-3 dark:bg-zinc-900">
                    <Bone className="h-3 w-24" />
                  </td>
                  <td className="bg-white px-4 py-3 dark:bg-zinc-900">
                    <div className="flex items-center gap-2.5">
                      <Bone className="h-7 w-7 shrink-0 rounded-full" />
                      <Bone className="h-3.5 w-32" />
                    </div>
                  </td>
                  <td className="bg-white px-4 py-3 dark:bg-zinc-900">
                    <Bone className="h-3 w-28" />
                  </td>
                  <td className="bg-white px-4 py-3 dark:bg-zinc-900">
                    <Bone className="h-3 w-8" />
                  </td>
                  <td className="bg-white px-4 py-3 dark:bg-zinc-900">
                    <Bone className="h-3 w-14" />
                  </td>
                  <td className="bg-white px-4 py-3 dark:bg-zinc-900">
                    <Bone className="h-3 w-24" />
                  </td>
                  <td className="bg-white px-4 py-3 dark:bg-zinc-900">
                    <Bone className="h-5 w-14 rounded-full" />
                  </td>
                  <td className="rounded-r-lg bg-white px-4 py-3 dark:bg-zinc-900">
                    <Bone className="h-3 w-20" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex shrink-0 items-center justify-between border-t border-zinc-300 px-4 py-2.5 dark:border-zinc-700">
          <Bone className="h-3 w-32" />
          <Bone className="h-6 w-24" />
        </div>
      </div>
    </div>
  );
}
