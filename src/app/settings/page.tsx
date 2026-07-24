import {
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  HeartPulse,
  LogOut,
  MoreHorizontal,
  SlidersHorizontal,
  Target,
  UserRound,
} from "lucide-react";
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
      <PageHeader title="Profile" />

      <section className="mb-6 border-y border-[var(--border)] py-5">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
            <UserRound className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{user.email}</p>
            <p className="mt-1 text-sm text-zinc-500">Your account</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 divide-x divide-[var(--border)] border-t border-[var(--border)] pt-4">
          <ProfileValue label="Goal" value={goalLabel(profile?.goal)} />
          <ProfileValue label="Weight" value={formatWeight(profile?.current_weight_kg)} />
          <ProfileValue label="Target" value={formatWeight(profile?.target_weight_kg)} />
        </div>
      </section>

      <SettingsSection icon={<SlidersHorizontal className="size-5" />} title="Appearance">
        <AppearanceToggle />
      </SettingsSection>

      <SettingsSection icon={<UserRound className="size-5" />} title="Body profile">
        <SettingsForm profile={profile} />
      </SettingsSection>

      <SettingsSection icon={<Bell className="size-5" />} id="reminder-settings" title="Reminders">
        <ReminderSettingsForm profile={profile} />
      </SettingsSection>

      <SettingsSection icon={<Target className="size-5" />} title="Targets">
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

      <SettingsSection icon={<CalendarDays className="size-5" />} title="Apple Calendar">
        <AppleCalendarCard feedPath={feedToken ? `/api/calendar/feed/${feedToken.token}` : null} origin={origin} />
      </SettingsSection>

      <SettingsSection icon={<HeartPulse className="size-5" />} title="Apple Watch & Health">
        <AppleHealthCard origin={origin} token={healthToken?.token ?? null} />
      </SettingsSection>

      <SettingsSection icon={<MoreHorizontal className="size-5" />} title="Extras">
        <div className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
          <ProfileLink href="/recap" label="Monthly recap" />
          <ProfileLink href="/coach" label="Coach" />
        </div>
      </SettingsSection>

      <SettingsSection icon={<LogOut className="size-5" />} title="Account">
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
  icon,
  id,
  title,
}: {
  children: ReactNode;
  icon: ReactNode;
  id?: string;
  title: string;
}) {
  return (
    <details
      className="group border-b border-[var(--border)]"
      id={id}
    >
      <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-3">
        <span className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--surface-2)] text-[var(--accent)]">
            {icon}
          </span>
          <span className="block text-base font-semibold text-white">{title}</span>
        </span>
        <ChevronDown className="size-5 shrink-0 text-zinc-500 transition group-open:rotate-180" />
      </summary>
      <div className="pb-5 pt-2">{children}</div>
    </details>
  );
}

function ProfileValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-3 first:pl-0 last:pr-0">
      <p className="truncate text-xs text-zinc-500">{label}</p>
      <p className="mt-1 truncate text-sm font-bold text-white">{value}</p>
    </div>
  );
}

function ProfileLink({ href, label }: { href: string; label: string }) {
  return (
    <Link className="flex min-h-12 items-center justify-between text-sm font-bold text-white" href={href}>
      {label}
      <ChevronRight aria-hidden="true" className="size-4 text-[var(--accent)]" />
    </Link>
  );
}

function goalLabel(goal: string | null | undefined) {
  if (goal === "lose") return "Lose weight";
  if (goal === "gain") return "Build up";
  if (goal === "maintain") return "Maintain";
  return "Not set";
}

function formatWeight(value: number | string | null | undefined) {
  if (value === null || value === undefined) return "Not set";
  return `${Number(value)} kg`;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/70 p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 font-bold text-white">{value}</p>
    </div>
  );
}
