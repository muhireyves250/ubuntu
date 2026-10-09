"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/auth-context";
import { ROLE_LABEL } from "@/lib/auth/role-routes";
import {
  changePassword,
  fetchMyActivity,
  fetchMyProfile,
  signOutEverywhere,
  updateMyPhone,
  type ActivityEntry,
} from "@/lib/auth/account-api";
import { ApiError } from "@/lib/api/client";
import { getInitials, formatExactDateTime, relativeTime } from "@/lib/format";
import { setPreference, usePreferences, type Preferences } from "@/lib/preferences";
import { useFacilityCapacity, setFacilityMaxCapacity, DEFAULT_CAPACITY } from "@/lib/patients/use-patients";
import { ConfirmModal } from "@/components/dashboard/confirm-modal";
import { FACILITY_LEVEL_LABEL } from "@/components/dashboard/profile-panel";
import { Field } from "@/components/patients/patient-details-tab";
import { IconActivity, IconBuilding, IconClock, IconEdit, IconLock, IconPhone, IconSettings, IconUsers } from "@/components/dashboard/icons";
import { EditContactModal } from "@/components/dashboard/edit-contact-modal";


type Tab = "profile" | "security" | "preferences" | "facility" | "activity";

const LABEL = "text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500";
const INPUT =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";
const SELECT =
  "rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 outline-none focus:border-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";
const PRIMARY_BUTTON =
  "rounded-lg bg-teal-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-800 disabled:opacity-60";
const ERROR_TEXT =
  "rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-medium text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300";

const ENTITY_LABEL: Record<string, string> = {
  patients: "patient",
  visits: "visit",
  pregnancies: "pregnancy",
  referrals: "referral",
  "lab-requests": "lab request",
  alerts: "alert",
  assessments: "assessment",
  diagnoses: "diagnosis",
  recommendations: "recommendation",
  "patient-comments": "patient comment",
  "follow-ups": "follow-up",
  "chw-assignments": "CHW assignment",
  "community-visits": "community visit",
  vaccinations: "vaccination",
  pharmacy: "pharmacy record",
  facilities: "facility setting",
  partners: "partner record",
  auth: "account",
};

const ACTION_VERB: Record<string, string> = { CREATE: "Created", UPDATE: "Updated", DELETE: "Deleted" };

function describeActivity(entry: ActivityEntry): string {
  if (entry.entity === "auth") return "Changed account settings";
  const verb = ACTION_VERB[entry.action] ?? entry.action;
  return `${verb} ${ENTITY_LABEL[entry.entity] ?? entry.entity.replace(/-/g, " ")}`;
}

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError && err.statusCode === 404) return "This isn't available on the server yet.";
  return err instanceof Error ? err.message : fallback;
}

// Same card as the Patient Details page's sections: cream header strip with
// an icon, white body.
function Section({
  icon,
  title,
  className = "",
  children,
}: {
  icon: React.ReactNode;
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`overflow-hidden rounded-2xl border border-zinc-200 shadow-sm transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600 ${className}`}
    >
      <div className="flex items-center gap-2.5 border-b border-zinc-200 bg-[#ffeedb] px-4 py-3 dark:border-zinc-800 dark:bg-orange-950/40">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-teal-700 dark:bg-zinc-900 dark:text-teal-400">
          {icon}
        </span>
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
      </div>
      <div className="bg-white p-5 dark:bg-zinc-900">{children}</div>
    </section>
  );
}

function SettingRow({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <p className={LABEL}>{label}</p>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{hint}</p>
      </div>
      {children}
    </div>
  );
}

function SettingsContent() {
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  const preferences = usePreferences();
  const capacity = useFacilityCapacity(user?.facility ?? "");

  const profileQuery = useQuery({ queryKey: ["account", "me"], queryFn: fetchMyProfile, retry: false });
  const activityQuery = useQuery({ queryKey: ["account", "activity"], queryFn: fetchMyActivity, retry: false });

  const [isEditingContact, setIsEditingContact] = useState(false);
  const [phoneStatus, setPhoneStatus] = useState<{ kind: "saved" | "error"; text: string } | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [capacityDraft, setCapacityDraft] = useState<string | null>(null);
  const [capacityStatus, setCapacityStatus] = useState<{ kind: "saved" | "error"; text: string } | null>(null);

  const [tab, setTab] = useState<Tab>("profile");
  const [confirming, setConfirming] = useState<"sign-out" | "sign-out-everywhere" | null>(null);
  const [isSigningOutEverywhere, setIsSigningOutEverywhere] = useState(false);

  if (!user) return null;

  function signOut(reason?: "password-changed" | "signed-out-everywhere") {
    logout();
    // Full navigation, not router.replace: the dashboard layout's own
    // "no user → /login" redirect would otherwise race this and drop the
    // ?reason the login page uses to explain what happened.
    window.location.replace(reason ? `/login?${reason}=1` : "/login");
  }

  const savedPhone = profileQuery.data?.phone ?? "";

  async function savePhone(phone: string) {
    try {
      const updated = await updateMyPhone(phone);
      queryClient.setQueryData(["account", "me"], updated);
      setPhoneStatus({ kind: "saved", text: "Contact details saved." });
    } catch (err) {
      throw new Error(errorMessage(err, "Could not save your phone number."));
    }
  }

  async function savePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);
    if (newPassword.length < 8) return setPasswordError("New password must be at least 8 characters.");
    if (newPassword !== confirmPassword) return setPasswordError("New password and confirmation don't match.");
    setIsSavingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      // The server signs out every session after a password change.
      signOut("password-changed");
    } catch (err) {
      setPasswordError(errorMessage(err, "Could not change your password."));
      setIsSavingPassword(false);
    }
  }

  async function saveCapacity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCapacityStatus(null);
    const parsed = Number(capacityDraft);
    if (!Number.isInteger(parsed) || parsed < 0) {
      setCapacityStatus({ kind: "error", text: "Enter a whole number, 0 or more." });
      return;
    }
    try {
      await setFacilityMaxCapacity(parsed);
      setCapacityDraft(null);
      setCapacityStatus({ kind: "saved", text: "Capacity limit saved." });
    } catch (err) {
      setCapacityStatus({ kind: "error", text: errorMessage(err, "Could not save the capacity limit.") });
    }
  }

  async function confirmSignOutEverywhere() {
    setIsSigningOutEverywhere(true);
    try {
      await signOutEverywhere();
    } finally {
      // Even if the call fails, sign this device out — that's what was asked.
      signOut("signed-out-everywhere");
    }
  }

  const isAdmin = user.role === "hospital_admin";

  const tabs: { id: Tab; label: string }[] = [
    { id: "profile", label: "Profile" },
    { id: "security", label: "Security" },
    { id: "preferences", label: "Preferences" },
    ...(isAdmin ? [{ id: "facility" as const, label: "Facility" }] : []),
    { id: "activity", label: "Activity" },
  ];

  const statusText = (status: { kind: "saved" | "error"; text: string }) => (
    <p className={status.kind === "error" ? ERROR_TEXT : "text-xs font-medium text-emerald-700 dark:text-emerald-400"}>
      {status.text}
    </p>
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      {/* Header: who you are + sign out */}
      <div className="flex shrink-0 items-center justify-between gap-3 rounded-xl border border-zinc-300 bg-[#ffeedb] px-4 py-3 shadow-sm dark:border-zinc-700 dark:bg-orange-950/40">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-zinc-700 shadow-sm dark:bg-zinc-900 dark:text-zinc-300">
            {getInitials(user.name)}
          </span>
          <div className="min-w-0">
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Settings</h2>
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
              {user.name} · {ROLE_LABEL[user.role]}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setConfirming("sign-out")}
          className="shrink-0 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 dark:border-red-800 dark:bg-zinc-900 dark:text-red-300 dark:hover:bg-red-950/50"
        >
          Sign out
        </button>
      </div>

      {/* Tab bar — same as the Patient Details page */}
      <div
        role="tablist"
        aria-label="Settings sections"
        className="scrollbar-hidden flex max-w-full shrink-0 gap-1 self-start overflow-x-auto rounded-full border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t.id
                ? "bg-[#0f766e] text-white shadow-sm shadow-teal-700/20"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content panel — same white panel as the Patient Details page. It
          fills the height left on screen (shorter when the emergency panel is
          open) and scrolls inside, so header and tabs stay in view. */}
      <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-zinc-300 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto p-2">
          {tab === "profile" && (
            <div className="flex flex-col gap-4">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsEditingContact(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-[#0f766e] px-3.5 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-800"
                >
                  <IconEdit className="h-3.5 w-3.5" />
                  Update details
                </button>
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                <Section icon={<IconUsers className="h-4 w-4" />} title="Personal Information">
                  <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                    <Field label="Full name" value={user.name} />
                    <Field label="Username" value={`@${user.username}`} />
                    <Field label="Role" value={ROLE_LABEL[user.role]} />
                  </dl>
                </Section>
                <Section icon={<IconBuilding className="h-4 w-4" />} title="Facility">
                  <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                    <Field label="Facility" value={user.facility} />
                    <Field label="Facility level" value={FACILITY_LEVEL_LABEL[user.facilityLevel]} />
                  </dl>
                </Section>
                <Section icon={<IconPhone className="h-4 w-4" />} title="Contact" className="lg:col-span-2">
                  <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                    <Field label="Email" value={profileQuery.isLoading ? "Loading…" : (profileQuery.data?.email ?? "—")} />
                    <Field label="Phone" value={profileQuery.isLoading ? "Loading…" : (savedPhone || "—")} mono />
                  </dl>
                  {phoneStatus && <div className="mt-4">{statusText(phoneStatus)}</div>}
                </Section>
              </div>
            </div>
          )}

          {tab === "security" && (
            <div className="grid gap-5 lg:grid-cols-2">
              <Section icon={<IconLock className="h-4 w-4" />} title="Change Password">
                <form onSubmit={savePassword} className="flex flex-col gap-4">
                  <label className="flex flex-col gap-1.5">
                    <span className={LABEL}>Current password</span>
                    <input type="password" required autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={INPUT} />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className={LABEL}>New password</span>
                    <input type="password" required minLength={8} autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={INPUT} />
                    <span className="text-xs text-zinc-400">At least 8 characters. You&apos;ll be signed out on every device.</span>
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className={LABEL}>Confirm new password</span>
                    <input type="password" required autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={INPUT} />
                  </label>
                  {passwordError && <p className={ERROR_TEXT}>{passwordError}</p>}
                  <button type="submit" disabled={isSavingPassword} className={`${PRIMARY_BUTTON} self-start`}>
                    {isSavingPassword ? "Changing…" : "Change password"}
                  </button>
                </form>
              </Section>
              <Section icon={<IconClock className="h-4 w-4" />} title="Sessions" className="self-start">
                <div className="flex flex-col gap-5">
                  <SettingRow label="Auto sign-out" hint="On this device, after no activity — for shared computers.">
                    <select
                      aria-label="Auto sign-out"
                      value={preferences.idleSignOutMinutes}
                      onChange={(e) => setPreference("idleSignOutMinutes", Number(e.target.value) as Preferences["idleSignOutMinutes"])}
                      className={SELECT}
                    >
                      <option value={0}>Never</option>
                      <option value={15}>After 15 minutes</option>
                      <option value={30}>After 30 minutes</option>
                      <option value={60}>After 1 hour</option>
                    </select>
                  </SettingRow>
                  <SettingRow label="Sign out everywhere" hint="End your sessions on every device, including this one.">
                    <button
                      type="button"
                      onClick={() => setConfirming("sign-out-everywhere")}
                      className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 dark:border-red-800 dark:bg-zinc-900 dark:text-red-300 dark:hover:bg-red-950/50"
                    >
                      Sign out everywhere
                    </button>
                  </SettingRow>
                </div>
              </Section>
            </div>
          )}

          {tab === "preferences" && (
            <div className="grid gap-5 lg:grid-cols-2">
              <Section icon={<IconSettings className="h-4 w-4" />} title="Display Preferences">
                <div className="flex flex-col gap-5">
                  <SettingRow label="Overview date range" hint="Range the dashboard opens with on this device.">
                    <select
                      aria-label="Overview date range"
                      value={preferences.overviewRange}
                      onChange={(e) => setPreference("overviewRange", e.target.value as Preferences["overviewRange"])}
                      className={SELECT}
                    >
                      <option value="7">Last 7 days</option>
                      <option value="30">Last 30 days</option>
                      <option value="90">Last 90 days</option>
                      <option value="all">All time</option>
                    </select>
                  </SettingRow>
                  <SettingRow label="Patient list layout" hint="How the Patient Registry opens on this device.">
                    <select
                      aria-label="Patient list layout"
                      value={preferences.patientListView}
                      onChange={(e) => setPreference("patientListView", e.target.value as Preferences["patientListView"])}
                      className={SELECT}
                    >
                      <option value="list">List View</option>
                      <option value="cards">Card View</option>
                    </select>
                  </SettingRow>
                </div>
              </Section>
            </div>
          )}

          {tab === "facility" && isAdmin && (
            <div className="grid gap-5 lg:grid-cols-2">
              <Section icon={<IconBuilding className="h-4 w-4" />} title="Emergency Capacity">
                <form onSubmit={saveCapacity} className="flex flex-col gap-2">
                  <label className="flex flex-col gap-1.5">
                    <span className={LABEL}>Capacity limit for {user.facility}</span>
                    <span className="flex gap-2">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={capacityDraft ?? (capacity.max === DEFAULT_CAPACITY ? "" : String(capacity.max))}
                        placeholder="Not set"
                        onChange={(e) => {
                          setCapacityDraft(e.target.value);
                          setCapacityStatus(null);
                        }}
                        className={INPUT}
                      />
                      <button type="submit" disabled={capacityDraft === null} className={`${PRIMARY_BUTTON} shrink-0`}>
                        Save
                      </button>
                    </span>
                  </label>
                  <p className="text-xs text-zinc-400">
                    Active emergency cases your facility can take at once. Currently {capacity.active} active.
                  </p>
                  {capacityStatus && statusText(capacityStatus)}
                </form>
              </Section>
            </div>
          )}

          {tab === "activity" && (
            <Section icon={<IconActivity className="h-4 w-4" />} title="Recent Activity">
              <p className="mb-3 text-xs text-zinc-400">Your last 20 changes in ubuntumed, from the audit log.</p>
              {activityQuery.isLoading ? (
                <p className="py-6 text-center text-sm text-zinc-400">Loading…</p>
              ) : activityQuery.isError ? (
                <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                  {errorMessage(activityQuery.error, "Could not load your activity.")}
                </p>
              ) : (activityQuery.data ?? []).length === 0 ? (
                <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">No activity recorded yet.</p>
              ) : (
                <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {activityQuery.data!.map((entry) => (
                    <li key={entry.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          aria-hidden
                          className={`h-2 w-2 shrink-0 rounded-full ${
                            entry.action === "DELETE" ? "bg-red-500" : entry.action === "UPDATE" ? "bg-amber-500" : "bg-teal-600"
                          }`}
                        />
                        <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">{describeActivity(entry)}</span>
                      </span>
                      <time
                        dateTime={entry.createdAt}
                        title={formatExactDateTime(entry.createdAt)}
                        className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500"
                      >
                        {relativeTime(entry.createdAt)}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          )}

        </div>
      </div>

      {isEditingContact && (
        <EditContactModal phone={savedPhone} onSave={savePhone} onClose={() => setIsEditingContact(false)} />
      )}
      {confirming === "sign-out" && (
        <ConfirmModal
          title="Sign out?"
          description="You'll need to sign in again to use ubuntumed on this device."
          confirmLabel="Sign out"
          tone="danger"
          onConfirm={() => signOut()}
          onCancel={() => setConfirming(null)}
        />
      )}
      {confirming === "sign-out-everywhere" && (
        <ConfirmModal
          title="Sign out on all devices?"
          description="Every session for your account ends, including this one. You'll need to sign in again everywhere."
          confirmLabel="Sign out everywhere"
          loadingLabel="Signing out…"
          isLoading={isSigningOutEverywhere}
          tone="danger"
          onConfirm={confirmSignOutEverywhere}
          onCancel={() => setConfirming(null)}
        />
      )}
    </div>
  );
}

export default function SettingsPage() {
  return <SettingsContent />;
}
