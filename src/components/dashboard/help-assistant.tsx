"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { searchHelp, suggestedTopics, type HelpTopic } from "@/lib/help/help-topics";
import { IconChat, IconClose } from "./icons";

// Open/closed lives in a tiny module store so both the floating "Need help?"
// button (desktop) and the menu drawer's Help entry (mobile) can open it.
let isOpen = false;
const listeners = new Set<() => void>();
function setOpen(open: boolean) {
  isOpen = open;
  listeners.forEach((listener) => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function openHelpAssistant() {
  setOpen(true);
}
export function toggleHelpAssistant() {
  setOpen(!isOpen);
}
export function useHelpAssistantOpen() {
  return useSyncExternalStore(subscribe, () => isOpen, () => false);
}

type Message =
  | { id: number; from: "user"; text: string }
  | { id: number; from: "assistant"; topic: HelpTopic; related: HelpTopic[] }
  | { id: number; from: "assistant"; notFound: true; suggestions: HelpTopic[] };

let nextId = 1;

export function HelpAssistant() {
  const open = useHelpAssistantOpen();
  const pathname = usePathname();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  if (!user || !open) return null;
  const role = user.role;

  function answer(question: string, topic?: HelpTopic) {
    const userMessage: Message = { id: nextId++, from: "user", text: question };
    let reply: Message;
    if (topic) {
      reply = { id: nextId++, from: "assistant", topic, related: searchHelp(topic.question, role).filter((t) => t.id !== topic.id).slice(0, 2) };
    } else {
      const matches = searchHelp(question, role);
      reply = matches.length
        ? { id: nextId++, from: "assistant", topic: matches[0], related: matches.slice(1, 3) }
        : { id: nextId++, from: "assistant", notFound: true, suggestions: suggestedTopics(role, pathname, 4) };
    }
    setMessages((prev) => [...prev, userMessage, reply]);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = draft.trim();
    if (!question) return;
    setDraft("");
    answer(question);
  }

  const chip =
    "rounded-full border border-teal-200 bg-white px-3 py-1.5 text-left text-xs font-medium text-teal-800 transition-colors hover:bg-teal-50 dark:border-teal-900 dark:bg-zinc-900 dark:text-teal-300 dark:hover:bg-teal-950";

  return (
    <div
      role="dialog"
      aria-label="ubuntumed help"
      className="fixed inset-x-0 bottom-0 z-[60] flex h-[85dvh] flex-col overflow-hidden rounded-t-2xl border border-zinc-300 bg-[#ffeedb] shadow-2xl dark:border-zinc-700 dark:bg-orange-950/40 sm:inset-x-auto sm:bottom-24 sm:right-6 sm:h-[min(600px,calc(100dvh-8rem))] sm:w-[380px] sm:rounded-2xl"
    >
      {/* Header — same cream bar as the app's modals */}
      <div className="flex items-center justify-between gap-3 border-b border-zinc-300/70 px-4 py-3 dark:border-zinc-700/70">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-900 text-white">
            <IconChat className="h-4.5 w-4.5" />
          </span>
          <div>
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Help</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Answers about using ubuntumed</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close help"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        >
          <IconClose className="h-4 w-4" />
        </button>
      </div>

      {/* Conversation */}
      <div ref={scrollRef} className="scrollbar-hidden flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-white px-4 py-4 dark:bg-zinc-900">
        <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-[#ffeedb] px-3.5 py-2.5 text-sm text-zinc-800 dark:bg-orange-950/40 dark:text-zinc-200">
          Hi {user.name.split(" ")[0]}! Ask how to do something in ubuntumed, or pick a question below.
          <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
            Please don&apos;t type patient names or details here.
          </span>
        </div>
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {suggestedTopics(role, pathname, 5).map((topic) => (
              <button key={topic.id} type="button" onClick={() => answer(topic.question, topic)} className={chip}>
                {topic.question}
              </button>
            ))}
          </div>
        )}

        {messages.map((message) =>
          message.from === "user" ? (
            <div key={message.id} className="max-w-[85%] self-end rounded-2xl rounded-tr-sm bg-teal-900 px-3.5 py-2.5 text-sm text-white">
              {message.text}
            </div>
          ) : "notFound" in message ? (
            <div key={message.id} className="flex max-w-[90%] flex-col gap-2">
              <div className="rounded-2xl rounded-tl-sm bg-[#ffeedb] px-3.5 py-2.5 text-sm text-zinc-800 dark:bg-orange-950/40 dark:text-zinc-200">
                I couldn&apos;t find an answer to that. Try other words, or pick one of these:
              </div>
              <div className="flex flex-wrap gap-2">
                {message.suggestions.map((topic) => (
                  <button key={topic.id} type="button" onClick={() => answer(topic.question, topic)} className={chip}>
                    {topic.question}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div key={message.id} className="flex max-w-[92%] flex-col gap-2">
              <div className="rounded-2xl rounded-tl-sm bg-[#ffeedb] px-3.5 py-3 text-sm text-zinc-800 dark:bg-orange-950/40 dark:text-zinc-200">
                <p className="font-semibold text-zinc-900 dark:text-zinc-50">{message.topic.question}</p>
                <ol className="mt-2 flex list-decimal flex-col gap-1.5 pl-4 marker:font-semibold marker:text-teal-700">
                  {message.topic.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                {message.topic.link && pathname !== message.topic.link.href && (
                  <Link
                    href={message.topic.link.href}
                    onClick={() => setOpen(false)}
                    className="mt-3 inline-flex rounded-lg bg-[#0f766e] px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-800"
                  >
                    {message.topic.link.label}
                  </Link>
                )}
              </div>
              {message.related.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Related</span>
                  <div className="flex flex-wrap gap-2">
                    {message.related.map((topic) => (
                      <button key={topic.id} type="button" onClick={() => answer(topic.question, topic)} className={chip}>
                        {topic.question}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ),
        )}
      </div>

      {/* Question box */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-zinc-300/70 px-3 py-3 dark:border-zinc-700/70">
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask a question…"
          aria-label="Ask a question"
          className="min-w-0 flex-1 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="shrink-0 rounded-full bg-[#0f766e] px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
        >
          Ask
        </button>
      </form>
    </div>
  );
}
