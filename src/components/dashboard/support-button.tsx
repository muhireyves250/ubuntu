"use client";

import { IconChat, IconClose } from "./icons";
import { HelpAssistant, toggleHelpAssistant, useHelpAssistantOpen } from "./help-assistant";

// Opens the built-in help assistant. The floating button is hidden below lg —
// there the bottom of the screen belongs to the BottomNav, and the menu
// drawer's "Help" entry opens the assistant instead.
export function SupportButton() {
  const isOpen = useHelpAssistantOpen();
  return (
    <>
      <HelpAssistant />
      <button
        type="button"
        onClick={toggleHelpAssistant}
        aria-expanded={isOpen}
        className="fixed bottom-6 right-6 hidden items-center lg:flex gap-2 rounded-full bg-teal-900 px-4 py-3 text-sm font-medium text-white shadow-lg hover:bg-teal-800"
      >
        {isOpen ? <IconClose className="h-5 w-5" /> : <IconChat className="h-5 w-5" />}
        {isOpen ? "Close help" : "Need help?"}
      </button>
    </>
  );
}
