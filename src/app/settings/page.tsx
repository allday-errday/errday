import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/auth";
import { getCalendarFeedToken } from "@/lib/db/calendar";
import { getHealthSyncToken } from "@/lib/db/health";
import { getProfile } from "@/lib/db/profile";
import { safeRead } from "@/lib/db/safe-read";
import { AppearanceToggle } from "./appearance-toggle";
import { AppleCalendarCard } from "./apple-calendar-card";
import { AppleHealthCard } from "./apple-health-card";
import { ReminderSettingsForm } from "./reminder-settings-form";
import { logout } from "./actions";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const { supabase, user } = await requireUser();
  const [profile, feedToken, healthToken, headerList] = await Promise.all([
    getProfile(supabase, user.id),
    safeRead(getCalendarFeedToken(supabase, user.id), null, "calendar feed"),
    safeRead(getHealthSyncToken(supabase, user.id), null, "health sync"),
    headers(),
  ]);
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const protocol = headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return (
    <div>
      <PageHeader title="Settings" />

      <SettingsSection description="Theme and display preference on this device." title="Appearance">
        <AppearanceToggle />
      </SettingsSection>

      <SettingsSection description="Body data, goal and activity level used for your targets." title="Body profile">
        <SettingsForm profile={profile} />
      </SettingsSection>

      <SettingsSection description="Food, supplements, gym, sleep and journal nudges." id="reminder-settings" tone="accent" title="Reminders">
        <ReminderSettingsForm profile={profile} />
      </SettingsSection>

      <SettingsSection description="Calories and macros calculated from your body profile." title="Targets">
        {profile?.calorie_target ? (
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Calories" value={`${profile.calorie_target} kcal`} />
            <Metric label="Protein" value={`${profile.protein_target_g ?? 0} g`} />
            <Metric label="Carbs" value={`${profile.carbs_target_g ?? 0} g`} />
            <Metric label="Fat" value={`${profile.fat_target_g ?? 0} g`} />
          </div>
        ) : (
          <p className="text-sm leading-6 text-zinc-400">Save your profile to calculate calorie and macro targets.</p>
        )}
      </SettingsSection>

      <SettingsSection description="Subscribe your iPhone Calendar to Errday events." title="Apple Calendar">
        <AppleCalendarCard feedPath={feedToken ? `/api/calendar/feed/${feedToken.token}` : null} origin={origin} />
      </SettingsSection>

      <SettingsSection description="Bring Apple Watch steps, energy and sleep into Today through Apple Health." title="Apple Watch & Health">
        <AppleHealthCard origin={origin} token={healthToken?.token ?? null} />
      </SettingsSection>

      <SettingsSection description="Calendar and help when you need it." title="More">
        <div className="grid gap-2 sm:grid-cols-2">
          <Link className="flex min-h-11 items-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 text-sm font-bold text-white" href="/calendar">
            Calendar
          </Link>
          <Link className="flex min-h-11 items-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 text-sm font-bold text-white" href="/coach">
            Ask Errday
          </Link>
        </div>
      </SettingsSection>

      <SettingsSection description="Sign out of this Errday account." title="Account">
        <p className="break-all text-sm text-zinc-400">{user.email}</p>
        <form action={logout} className="mt-4">
          <SubmitButton pendingLabel="Logging out..." variant="danger">Log out</SubmitButton>
        </form>
      </SettingsSection>
    </div>
  );
}

function SettingsSection({
  children,
  description,
  id,
  title,
  tone = "default",
}: {
  children: ReactNode;
  description: string;
  id?: string;
  title: string;
  tone?: "accent" | "default";
}) {
  return (
    <details
      className={`group mb-3 overflow-hidden rounded-xl border ${
        tone === "accent"
          ? "border-[var(--accent)]/45 bg-[var(--accent-soft)]"
          : "border-[var(--border)] bg-[var(--surface)]"
      }`}
      id={id}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 sm:p-5">
        <span className="min-w-0">
          <span className="block text-lg font-semibold text-white">{title}</span>
          <span className="mt-1 block text-sm leading-5 text-zinc-400">{description}</span>
        </span>
        <span className="grid size-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-[var(--accent)] transition group-open:rotate-180">
          <ChevronDown className="size-5" />
        </span>
      </summary>
      <div className="border-t border-[var(--border)] p-4 sm:p-5">{children}</div>
    </details>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/70 p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 font-bold text-white">{value}</p>
    </div>
  );
}
