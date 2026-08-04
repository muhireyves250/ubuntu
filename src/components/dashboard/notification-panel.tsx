"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import {
  useNotificationAlerts,
  useReadNotificationIds,
  markNotificationRead,
  type NotificationAlert,
} from "@/lib/patients/use-patients";
import { useRouter } from "next/navigation";
import { formatExactDateTime } from "@/lib/format";
import { SlideOverPanel } from "./slide-over-panel";
import {
  IconBell,
  IconAlertTriangle,
  IconClipboard,
  IconClock,
  IconChat,
  IconCheckCircle,
  IconBuilding,
  IconChevronRight,
} from "./icons";

type Category = "urgent" | "due" | "lab" | "referral" | "chw" | "system";

const CATEGORY_STYLE: Record<
  Category,
  { icon: (props: { className?: string }) => React.ReactElement; chip: string; bar: string; label: string; solid: string }
> = {
  urgent: {
    icon: IconAlertTriangle,
    chip: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
    bar: "bg-red-500",
    label: "text-red-700 dark:text-red-400",
    solid: "bg-red-600",
  },
  due: {
    icon: IconClock,
    chip: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
    bar: "bg-amber-500",
    label: "text-amber-700 dark:text-amber-400",
    solid: "bg-amber-600",
  },
  lab: {
    icon: IconClipboard,
    chip: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400",
    bar: "bg-sky-500",
    label: "text-sky-700 dark:text-sky-400",
    solid: "bg-sky-600",
  },
  referral: {
    icon: IconChat,
    chip: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400",
    bar: "bg-violet-500",
    label: "text-violet-700 dark:text-violet-400",
    solid: "bg-violet-600",
  },
  chw: {
    icon: IconCheckCircle,
    chip: "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400",
    bar: "bg-teal-500",
    label: "text-teal-700 dark:text-teal-400",
    solid: "bg-teal-600",
  },
  system: {
    icon: IconBuilding,
    chip: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
    bar: "bg-zinc-400",
    label: "text-zinc-600 dark:text-zinc-400",
    solid: "bg-zinc-500",
  },
};

const TYPE_CATEGORY: Record<NotificationAlert["type"], Category> = {
  emergency_arrival: "urgent",
  critical_lab_result: "urgent",
  community_visit_flagged: "urgent",
  chw_visit_missed: "urgent",
  referral_pending: "urgent",
  chw_visit_due_today: "due",
  chw_visit_due_tomorrow: "due",
  visit_today: "due",
  lab_request: "lab",
  lab_request_accepted: "lab",
  lab_completed: "lab",
  lab_result_comment: "lab",
  referral_accepted: "referral",
  referral_accepted_elsewhere: "referral",
  referral_closed: "referral",
  recommendation_open: "referral",
  recommendation_responded: "referral",
  risk_pregnancy: "referral",
  chw_report_submitted: "chw",
  chw_case_accepted: "chw",
  chw_new_assignment: "chw",
  new_followup_assignment: "chw",
  facility_full: "system",
};

export function NotificationPanel({
  onClose,
}: {
  onClose: () => void;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const alerts = useNotificationAlerts(user?.role ?? "");
  const readIds = useReadNotificationIds();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const unreadCount = alerts.filter((a) => !readIds.has(a.id)).length;

  const handleToggle = (id: string) => {
    const opening = expandedId !== id;
    setExpandedId(opening ? id : null);
    if (opening) markNotificationRead(id);
  };

  const handleViewCase = (type: NotificationAlert["type"], patientId: string, targetId?: string) => {
    onClose();
    if (
      (type === "lab_request" || type === "lab_request_accepted" || type === "lab_result_comment") &&
      targetId
    ) {
      router.push(`/dashboard/lab/requests/${targetId}`);
    } else if (type === "lab_request" || type === "lab_result_comment") {
      router.push("/dashboard/lab/requests");
    } else if (type === "facility_full") {
      router.push("/dashboard/hospital-admin");
    } else if (
      type === "new_followup_assignment" ||
      type === "chw_visit_due_today" ||
      type === "chw_visit_due_tomorrow" ||
      type === "chw_new_assignment" ||
      type === "chw_case_accepted"
    ) {
      router.push(`/dashboard/chw/patients/${patientId}`);
    } else {
      router.push(`/dashboard/nurse/patients/${patientId}`);
    }
  };

  return (
    <SlideOverPanel title="Notifications" onClose={onClose}>
      <div className="flex flex-col gap-4">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white p-10 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <IconBell className="h-8 w-8 text-zinc-300 dark:text-zinc-700" />
            <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              No new alerts or requests.
            </p>
            <p className="text-xs text-zinc-400">You are all caught up!</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                {alerts.length} Notification{alerts.length === 1 ? "" : "s"}
              </p>
              {unreadCount > 0 && (
                <p className="text-[11px] font-semibold text-teal-700 dark:text-teal-400">
                  {unreadCount} unread
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              {alerts.map((alert) => {
                const isEmergency = alert.priority === "Emergency";
                const style = CATEGORY_STYLE[TYPE_CATEGORY[alert.type] ?? "system"];
                const Icon = style.icon;
                const isExpanded = expandedId === alert.id;
                const isRead = readIds.has(alert.id);
                return (
                  <div
                    key={alert.id}
                    className={`relative w-full overflow-hidden rounded-md border transition-colors ${
                      isEmergency
                        ? "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20"
                        : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                    }`}
                  >
                    <span className={`absolute inset-y-0 left-0 w-[3px] ${style.bar}`} />
                    <button
                      type="button"
                      onClick={() => handleToggle(alert.id)}
                      className={`flex w-full items-center gap-2.5 py-2 pr-3 pl-3.5 text-left transition-colors ${
                        isEmergency
                          ? "hover:bg-red-100 dark:hover:bg-red-950/40"
                          : "hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                      }`}
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${style.chip}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className={`text-[10px] font-semibold uppercase tracking-wide ${style.label}`}>
                            {alert.title}
                          </span>
                          <span className="shrink-0 text-[10px] text-zinc-400 dark:text-zinc-500">
                            {formatExactDateTime(alert.date)}
                          </span>
                        </div>
                        <p
                          className={`text-[13px] leading-tight ${
                            isExpanded ? "" : "truncate"
                          } ${isRead ? "text-zinc-500 dark:text-zinc-400" : "font-medium text-zinc-800 dark:text-zinc-200"}`}
                        >
                          {alert.message}
                        </p>
                      </div>

                      {!isRead && (
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.solid}`} />
                      )}
                      <IconChevronRight
                        className={`h-3.5 w-3.5 shrink-0 text-zinc-400 transition-transform dark:text-zinc-500 ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                      />
                    </button>

                    {isExpanded && (
                      <div className="flex items-center justify-between gap-3 border-t border-zinc-100 bg-zinc-50/80 px-3.5 py-2.5 dark:border-zinc-800 dark:bg-zinc-950/40">
                        <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                          {alert.priority}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleViewCase(alert.type, alert.patientId, alert.targetId)}
                          className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors ${
                            isEmergency ? "bg-red-600 hover:bg-red-700" : "bg-teal-700 hover:bg-teal-800"
                          }`}
                        >
                          View case
                          <IconChevronRight className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </SlideOverPanel>
  );
}
