"use client";

import { IconBell } from "./icons";
import { SlideOverPanel } from "./slide-over-panel";

export function NotificationPanel({
  onClose,
}: {
  onClose: () => void;
}) {
  return (
    <SlideOverPanel title="Notifications" onClose={onClose}>
      <div className="flex flex-col items-center justify-center gap-2 rounded-[1.25rem] border border-zinc-300 bg-white p-10 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <IconBell className="h-8 w-8 text-zinc-300 dark:text-zinc-700" />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No notifications yet.
        </p>
      </div>
    </SlideOverPanel>
  );
}
