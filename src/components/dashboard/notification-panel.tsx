"use client";

import { useAuth } from "@/lib/auth/auth-context";
import { useNotificationAlerts } from "@/lib/patients/use-patients";
import { useRouter } from "next/navigation";
import { SlideOverPanel } from "./slide-over-panel";
import { IconBell, IconClipboard, IconAlert } from "./icons";

export function NotificationPanel({
  onClose,
}: {
  onClose: () => void;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const alerts = useNotificationAlerts(user?.role ?? "");

  const handleAlertClick = (type: "lab_request" | "lab_completed", patientId: string) => {
    onClose();
    if (type === "lab_completed") {
      router.push(`/dashboard/nurse/patients/${patientId}`);
    } else {
      router.push("/dashboard/lab/requests");
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
          <div className="flex flex-col gap-2.5">
            {alerts.map((alert) => {
              const isEmergency = alert.priority === "Emergency";
              return (
                <button
                  key={alert.id}
                  type="button"
                  onClick={() => handleAlertClick(alert.type, alert.patientId)}
                  className={`w-full rounded-xl border p-4 text-left shadow-sm transition-colors ${
                    isEmergency
                      ? "border-red-200 bg-red-50 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/20 dark:hover:bg-red-950/40"
                      : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        isEmergency
                          ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                          : "bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-400"
                      }`}
                    >
                      {alert.type === "lab_completed" ? (
                        <IconClipboard className="h-4 w-4" />
                      ) : (
                        <IconAlert className="h-4 w-4" />
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[11px] font-bold uppercase tracking-wide ${
                            isEmergency
                              ? "text-red-700 dark:text-red-400"
                              : "text-zinc-500 dark:text-zinc-400"
                          }`}
                        >
                          {alert.title}
                        </span>
                        {isEmergency && (
                          <span className="relative flex h-2 w-2 shrink-0">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600" />
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm font-medium leading-snug text-zinc-800 dark:text-zinc-200">
                        {alert.message}
                      </p>
                      <span className="mt-2 block text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                        Logged: {alert.date}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </SlideOverPanel>
  );
}
