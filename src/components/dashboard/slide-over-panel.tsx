"use client";

import { useEffect } from "react";
import { IconClose } from "./icons";

export function SlideOverPanel({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-30 flex justify-end">
      <button
        type="button"
        aria-label={`Close ${title.toLowerCase()}`}
        onClick={onClose}
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
      />

      <div className="relative flex h-full w-full max-w-sm flex-col rounded-l-[2rem] bg-[#ffebd6] shadow-xl dark:bg-zinc-950">
        <div className="flex items-center justify-between border-b border-zinc-300 px-6 py-5 dark:border-zinc-800">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 hover:bg-white dark:hover:bg-zinc-800"
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>

        <div className="scrollbar-hidden flex-1 overflow-y-auto px-4 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}
