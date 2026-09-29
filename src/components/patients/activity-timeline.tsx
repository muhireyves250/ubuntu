"use client";

import { useMemo, useRef, useState } from "react";
import type { Patient, Visit, Pregnancy, Referral, Recommendation, CommunityVisit } from "@/lib/patients/types";
import type { Vaccination } from "@/lib/patients/vaccination-api";
import { formatExactDateTime } from "@/lib/format";
import {
  IconCalendar,
  IconAlert,
  IconReport,
  IconCheckCircle,
  IconClock,
  IconChat,
  IconUsers,
  IconClipboard,
  IconBuilding,
} from "@/components/dashboard/icons";

type IconComponent = (props: { className?: string }) => React.ReactElement;

const VISIBLE_COUNT = 3;

type Category = "visit" | "referral" | "note" | "chw" | "vaccination" | "pregnancy" | "registration";

const CATEGORY_LABELS: Record<Category, string> = {
  visit: "Visits",
  referral: "Referrals",
  note: "Specialist notes",
  chw: "CHW visits",
  vaccination: "Vaccinations",
  pregnancy: "Pregnancy",
  registration: "Registration",
};

interface ActivityEvent {
  id: string;
  date: string;
  icon: IconComponent;
  tone: "teal" | "red" | "orange" | "zinc";
  category: Category;
  title: string;
  actor?: string;
  facility?: string;
  detail?: string;
}

const TONE_CLASSES: Record<ActivityEvent["tone"], string> = {
  teal: "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-400",
  red: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  orange: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
  zinc: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

export function ActivityTimeline({
  patient,
  visits,
  pregnancies = [],
  referrals = [],
  recommendations = [],
  communityVisits = [],
  vaccinations = [],
}: {
  patient: Patient;
  visits: Visit[];
  pregnancies?: Pregnancy[];
  referrals?: Referral[];
  recommendations?: Recommendation[];
  communityVisits?: CommunityVisit[];
  vaccinations?: Vaccination[];
}) {
  const [showAll, setShowAll] = useState(false);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);

  function handleRowKeyDown(e: React.KeyboardEvent<HTMLLIElement>, index: number, count: number) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      itemRefs.current[Math.min(index + 1, count - 1)]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      itemRefs.current[Math.max(index - 1, 0)]?.focus();
    }
  }
  const [activeCategory, setActiveCategory] = useState<Category | "all">("all");
  const allEvents: ActivityEvent[] = useMemo(() => [
    {
      id: `registered-${patient.id}`,
      date: patient.registeredAt,
      icon: IconUsers,
      tone: "zinc" as const,
      category: "registration" as const,
      title: "Patient registered",
      actor: patient.registeredBy,
      facility: patient.registrationFacility,
    },
    ...visits.map((visit): ActivityEvent => ({
      id: `visit-${visit.id}`,
      date: visit.createdAt ?? visit.date,
      icon: visit.type === "emergency" ? IconAlert : IconCalendar,
      tone: visit.type === "emergency" ? "red" : "teal",
      category: "visit",
      title: visit.type === "emergency" ? "Emergency visit logged" : `Logged ${visit.type} ANC visit`,
      actor: visit.attendingNurse,
      facility: visit.hospital,
      detail: `Classified ${visit.riskLevel.toUpperCase()}`,
    })),
    ...pregnancies.flatMap((p) => {
      const opened: ActivityEvent = {
        id: `pregnancy-opened-${p.id}`,
        date: p.createdAt,
        icon: IconBuilding,
        tone: "zinc",
        category: "pregnancy",
        title: `Pregnancy #${p.pregnancyNumber} opened`,
      };
      if (!p.delivery) return [opened];
      return [
        opened,
        {
          id: `pregnancy-closed-${p.id}`,
          date: p.delivery.date,
          icon: IconCheckCircle,
          tone: "zinc" as const,
          category: "pregnancy" as const,
          title: `Pregnancy #${p.pregnancyNumber} closed`,
          detail: p.delivery.outcome.replace("-", " "),
        },
      ];
    }),
    ...referrals.flatMap((r) => {
      const created: ActivityEvent = {
        id: `referral-${r.id}`,
        date: r.createdAt,
        icon: IconReport,
        tone: r.urgency === "emergency" ? "red" : "orange",
        category: "referral",
        title: `Referral created (${r.urgency})`,
        actor: r.referredByNurse,
        facility: `${r.referredByFacility} → ${r.receivingFacility}`,
        detail: r.reason,
      };
      const accepted: ActivityEvent[] = r.acceptedAt
        ? [{
            id: `referral-accepted-${r.id}`,
            date: r.acceptedAt,
            icon: IconCheckCircle,
            tone: "teal",
            category: "referral",
            title: "Referral accepted",
            actor: r.acceptedByNurse,
            facility: r.acceptedByFacility ?? r.receivingFacility,
          }]
        : [];
      const closed: ActivityEvent[] = r.closedAt
        ? [{
            id: `referral-closed-${r.id}`,
            date: r.closedAt,
            icon: IconClock,
            tone: "zinc",
            category: "referral",
            title: "Referral closed",
            facility: r.acceptedByFacility ?? r.receivingFacility,
            detail: `Outcome: ${r.outcome ?? "unspecified"}${r.outcomeStatement ? ` — ${r.outcomeStatement}` : ""}`,
          }]
        : [];
      return [created, ...accepted, ...closed];
    }),
    ...recommendations.flatMap((rec) => {
      const created: ActivityEvent = {
        id: `note-${rec.id}`,
        date: rec.createdAt,
        icon: IconChat,
        tone: "orange",
        category: "note",
        title: "Specialist note added",
        actor: rec.createdByGynecologist,
        facility: rec.createdByFacility,
        detail: rec.message,
      };
      const responded: ActivityEvent[] = rec.respondedAt
        ? [{
            id: `note-responded-${rec.id}`,
            date: rec.respondedAt,
            icon: IconChat,
            tone: "teal",
            category: "note",
            title: "Nurse responded to specialist note",
            actor: rec.respondedByNurse,
            detail: rec.nurseResponse,
          }]
        : [];
      return [created, ...responded];
    }),
    ...communityVisits.map((v) => ({
      id: `chw-${v.id}`,
      // CHW visits only ever record a date, not a real check-in time — the
      // backend's midnight-UTC timestamp would otherwise render as a
      // misleading "12:00 AM".
      date: v.visitDate.slice(0, 10),
      icon: IconUsers,
      tone: (v.riskFlag ? "red" : "zinc") as ActivityEvent["tone"],
      category: "chw" as const,
      title: "CHW home visit",
      actor: v.chwName,
      detail: v.riskFlag ? "Flagged for review" : v.concerns || undefined,
    })),
    ...vaccinations.map((v) => ({
      id: `vaccination-${v.id}`,
      date: v.dateTaken,
      icon: IconClipboard,
      tone: "teal" as const,
      category: "vaccination" as const,
      title: `${v.vaccineName} (${v.dosage}) administered`,
      actor: v.administeredByName,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date)), [patient, visits, pregnancies, referrals, recommendations, communityVisits, vaccinations]);

  const availableCategories = Array.from(new Set(allEvents.map((e) => e.category)));
  const events =
    activeCategory === "all" ? allEvents : allEvents.filter((e) => e.category === activeCategory);

  return (
    <div className="flex h-full min-h-0 flex-col gap-1">
      <p className="mb-2 shrink-0 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Activity
      </p>
      {allEvents.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No recorded activity yet.</p>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
        {availableCategories.length > 1 && (
          <div className="mb-3 shrink-0 flex flex-wrap gap-1.5">
            {(["all", ...availableCategories] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setActiveCategory(cat);
                  setShowAll(false);
                }}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  activeCategory === cat
                    ? "bg-[#0f766e] text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                }`}
              >
                {cat === "all" ? "All" : CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        )}
        {events.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No activity in this category.</p>
        ) : (
        <div className="flex min-h-0 flex-1 flex-col">
        <ol className="scrollbar-hidden flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
          {(showAll ? events : events.slice(0, VISIBLE_COUNT)).map((event, i, visible) => {
            const Icon = event.icon;
            return (
              <li
                key={event.id}
                ref={(el) => { itemRefs.current[i] = el; }}
                tabIndex={0}
                onKeyDown={(e) => handleRowKeyDown(e, i, visible.length)}
                className="flex gap-3 rounded-xl border border-zinc-200 bg-white p-3 transition-colors hover:border-zinc-300 focus:border-zinc-400 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:focus:border-zinc-500"
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${TONE_CLASSES[event.tone]}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{event.title}</p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">{formatExactDateTime(event.date)}</p>
                  </div>
                  {(event.actor || event.facility) && (
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      {event.actor && <span>{event.actor}</span>}
                      {event.actor && event.facility && <span> · </span>}
                      {event.facility && <span>{event.facility}</span>}
                    </p>
                  )}
                  {event.detail && (
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{event.detail}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
        {events.length > VISIBLE_COUNT && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="mt-1 shrink-0 self-start text-xs font-semibold text-teal-700 hover:underline dark:text-teal-400"
          >
            {showAll ? "Show less" : `Show ${events.length - VISIBLE_COUNT} more`}
          </button>
        )}
        </div>
        )}
        </div>
      )}
    </div>
  );
}
