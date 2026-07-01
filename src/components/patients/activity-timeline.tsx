import type { Patient, Visit } from "@/lib/patients/types";

interface ActivityEvent {
  id: string;
  date: string;
  description: string;
}

export function ActivityTimeline({
  patient,
  visits,
}: {
  patient: Patient;
  visits: Visit[];
}) {
  const events: ActivityEvent[] = [
    ...visits.map((visit) => ({
      id: visit.id,
      date: visit.date,
      description: `Logged ANC visit — classified ${visit.riskLevel}`,
    })),
    {
      id: `registered-${patient.id}`,
      date: patient.registeredAt,
      description: "Patient registered",
    },
  ].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Activity
      </p>
      <ol className="flex flex-col gap-3 border-l border-zinc-200 pl-4 dark:border-zinc-800">
        {events.map((event) => (
          <li key={event.id} className="relative text-sm">
            <span
              aria-hidden
              className="absolute -left-[1.05rem] top-1.5 h-2 w-2 rounded-full bg-teal-700"
            />
            <p className="text-zinc-700 dark:text-zinc-300">{event.description}</p>
            <p className="text-xs text-zinc-400">{event.date}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
