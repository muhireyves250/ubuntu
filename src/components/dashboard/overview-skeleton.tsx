// Mirrors DashboardOverview's structure/proportions so there's no layout
// shift when the real data swaps in — same grid, same md:h-60 row, same
// flex-[3]/flex-[2] split, same lg:w-80 side panel.
function Bone({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800 ${className}`} />;
}

function CardBone({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-[1.25rem] border border-zinc-300 bg-[#ffeedb] p-4 dark:border-zinc-700 dark:bg-orange-950/40 ${className}`}
    >
      <div className="flex items-center gap-3">
        <Bone className="h-9 w-9 shrink-0 rounded-xl" />
        <div className="flex flex-1 flex-col gap-1.5">
          <Bone className="h-2.5 w-14" />
          <Bone className="h-4 w-10" />
        </div>
      </div>
    </div>
  );
}

export function OverviewSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex shrink-0 items-center justify-between">
        <Bone className="h-5 w-24" />
        <Bone className="h-7 w-32 rounded-md" />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="grid shrink-0 grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <CardBone key={i} />
            ))}
          </div>

          <div className="flex shrink-0 flex-col gap-4 md:h-60 md:flex-row">
            <div className="rounded-[1.25rem] border border-zinc-300 bg-[#ffeedb] p-5 dark:border-zinc-700 dark:bg-orange-950/40 md:flex-[3]">
              <div className="flex items-center justify-between">
                <Bone className="h-4 w-32" />
                <Bone className="h-7 w-24 rounded-md" />
              </div>
              <div className="mt-5 flex items-center gap-6">
                <Bone className="h-28 w-28 shrink-0 rounded-full" />
                <div className="flex flex-1 flex-col gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between gap-3">
                      <Bone className="h-3 w-36" />
                      <Bone className="h-3 w-10" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="rounded-[1.25rem] border border-zinc-300 bg-[#ffeedb] p-5 dark:border-zinc-700 dark:bg-orange-950/40 md:flex-[2]">
              <div className="flex items-center justify-between">
                <Bone className="h-4 w-28" />
                <Bone className="h-3 w-12" />
              </div>
              <div className="mt-4 flex flex-col gap-2.5">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Bone key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col rounded-[1.25rem] border border-zinc-300 bg-[#ffeedb] p-4 dark:border-zinc-700 dark:bg-orange-950/40">
            <div className="flex shrink-0 items-center justify-between">
              <Bone className="h-4 w-32" />
              <Bone className="h-7 w-40 rounded-md" />
            </div>
            <div className="mt-3 grid min-h-0 flex-1 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Bone key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          </div>
        </div>

        <div className="flex h-full min-h-0 w-full flex-col gap-4 lg:w-80 lg:shrink-0">
          <div className="flex min-h-0 flex-1 flex-col gap-3 rounded-[1.25rem] border border-zinc-300 bg-[#ffeedb] p-6 dark:border-zinc-700 dark:bg-orange-950/40">
            <div className="flex shrink-0 items-center gap-3">
              <Bone className="h-12 w-12 shrink-0 rounded-full" />
              <Bone className="h-6 w-28 rounded-full" />
            </div>
            <div className="mt-2 flex shrink-0 flex-col gap-2">
              <Bone className="h-5 w-32" />
              <Bone className="h-3 w-full" />
              <Bone className="h-3 w-2/3" />
            </div>
            <div className="mt-4 flex min-h-0 flex-1 flex-col gap-2 rounded-xl border border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
              <Bone className="h-4 w-28" />
              <div className="mt-2 flex flex-1 flex-col gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Bone key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
