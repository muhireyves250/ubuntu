"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { useFollowUpAssignmentsForChw, usePatients } from "@/lib/patients/use-patients";
import { FOLLOW_UP_REASON_LABELS } from "@/lib/patients/types";
import type { FollowUpAssignment } from "@/lib/patients/types";
import { StatCard } from "@/components/dashboard/stat-card";
import { IconClipboard, IconClock, IconAlert, IconCheckCircle, IconUsers } from "@/components/dashboard/icons";

function AssignmentRow({ assignment, patientName, village }: { assignment: FollowUpAssignment; patientName: string; village: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.push(`/dashboard/chw/patients/${assignment.patientId}`)}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
    >
      <div className="min-w-0">
        <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">{patientName}</p>
        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
          {village} • {FOLLOW_UP_REASON_LABELS[assignment.reason]}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            assignment.priority === "high"
              ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
          }`}
        >
          {assignment.priority === "high" ? "High priority" : "Routine"}
        </span>
        <span className="text-xs text-zinc-400">Due {assignment.dueDate}</span>
      </div>
    </button>
  );
}

function AssignmentSection({
  title,
  assignments,
  patientNameOf,
  villageOf,
  emptyText,
}: {
  title: string;
  assignments: FollowUpAssignment[];
  patientNameOf: (patientId: string) => string;
  villageOf: (patientId: string) => string;
  emptyText: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{title}</h3>
      {assignments.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-4 text-center text-sm text-zinc-400 dark:border-zinc-800">
          {emptyText}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {assignments.map((a) => (
            <AssignmentRow key={a.id} assignment={a} patientName={patientNameOf(a.patientId)} village={villageOf(a.patientId)} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ChwDashboardContent() {
  const { user } = useAuth();
  const patients = usePatients();
  const assignments = useFollowUpAssignmentsForChw(user?.id ?? "");

  const patientNameOf = (patientId: string) => {
    const p = patients.find((pt) => pt.id === patientId);
    return p ? `${p.firstName} ${p.lastName}` : "Unknown patient";
  };
  const villageOf = (patientId: string) => {
    const p = patients.find((pt) => pt.id === patientId);
    return p?.address.village ?? "—";
  };

  const { today, upcoming, missed, highPriority, completed } = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const pending = assignments.filter((a) => a.status === "pending");
    return {
      today: pending.filter((a) => a.dueDate === todayStr),
      upcoming: pending.filter((a) => a.dueDate > todayStr),
      missed: pending.filter((a) => a.dueDate < todayStr),
      highPriority: pending.filter((a) => a.priority === "high"),
      completed: assignments.filter((a) => a.status === "completed"),
    };
  }, [assignments]);

  if (!user) return null;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Community Follow-up — {user.facility}
      </h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <StatCard icon={IconUsers} value={String(assignments.filter((a) => a.status === "pending").length)} label="Assigned" accentClass="bg-teal-100 text-teal-700" />
        <StatCard icon={IconClipboard} value={String(today.length)} label="Today" accentClass="bg-sky-100 text-sky-700" />
        <StatCard icon={IconClock} value={String(upcoming.length)} label="Upcoming" accentClass="bg-violet-100 text-violet-700" />
        <StatCard icon={IconAlert} value={String(missed.length)} label="Missed" accentClass="bg-red-100 text-red-700" />
        <StatCard icon={IconCheckCircle} value={String(completed.length)} label="Completed" accentClass="bg-zinc-100 text-zinc-600" />
      </div>

      <AssignmentSection title="Today's Visits" assignments={today} patientNameOf={patientNameOf} villageOf={villageOf} emptyText="No visits due today." />
      <AssignmentSection title="High Priority" assignments={highPriority} patientNameOf={patientNameOf} villageOf={villageOf} emptyText="No high-priority cases." />
      <AssignmentSection title="Missed" assignments={missed} patientNameOf={patientNameOf} villageOf={villageOf} emptyText="Nothing overdue." />
      <AssignmentSection title="Upcoming" assignments={upcoming} patientNameOf={patientNameOf} villageOf={villageOf} emptyText="No upcoming visits." />
      <AssignmentSection title="Completed" assignments={completed} patientNameOf={patientNameOf} villageOf={villageOf} emptyText="No completed visits yet." />
    </div>
  );
}
