"use client";

import { IconChat } from "./icons";

export function SupportButton() {
  return (
    <button
      type="button"
      title="Support (placeholder)"
      className="fixed bottom-6 right-6 flex items-center gap-2 rounded-full bg-teal-900 px-4 py-3 text-sm font-medium text-white shadow-lg hover:bg-teal-800"
    >
      <IconChat className="h-5 w-5" />
      Need help?
    </button>
  );
}
