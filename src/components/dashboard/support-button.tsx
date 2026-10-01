"use client";

import { IconChat } from "./icons";

// Hidden below lg — there the bottom of the screen belongs to the BottomNav,
// and a floating button would cover page content.
export function SupportButton() {
  return (
    <button
      type="button"
      title="Support (placeholder)"
      className="fixed bottom-6 right-6 hidden items-center lg:flex gap-2 rounded-full bg-teal-900 px-4 py-3 text-sm font-medium text-white shadow-lg hover:bg-teal-800"
    >
      <IconChat className="h-5 w-5" />
      Need help?
    </button>
  );
}
