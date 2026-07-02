import { headers } from "next/headers";
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
  const host =
    headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const protocol =
    headerList.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return (
    <div>
      <PageHeader
        subtitle="Your profile, goals, reminders and appearance."
        title="Settings"
      />

      <section className="mb-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm shadow-black/20">
        <h2 className="text-lg font-semibold text-white">Appearance</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Same design, two moods. Your choice is saved on this device.
        </p>
        <AppearanceToggle />
      </section>

      <section className="mb-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm shadow-black/20">
        <h2 className="mb-4 text-lg font-semibold text-white">Body Profile</h2>
        <SettingsForm profile={profile} />
      </section>

      <section
        className="mb-5 rounded-2xl border border-[var(--accent)]/50 bg-[var(--accent-soft)] p-5 shadow-lg shadow-[var(--accent)]/10"
        id="reminder-settings"
      >
        <h2 className="text-lg font-semibold text-white">Reminders</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Choose when to get nudges for food, supplements, gym, sleep and journal.
        </p>
        <div className="mt-4">
          <ReminderSettingsForm profile={profile} />
        </div>
      </section>

      <section className="mb-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm shadow-black/20">
        <h2 className="text-lg font-semibold text-white">Calculated Targets</h2>
        {profile?.calorie_target ? (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Metric label="Calories" value={`${profile.calorie_target} kcal`} />
            <Metric label="Protein" value={`${profile.protein_target_g ?? 0} g`} />
            <Metric label="Carbs" value={`${profile.carbs_target_g ?? 0} g`} />
            <Metric label="Fat" value={`${profile.fat_target_g ?? 0} g`} />
          </div>
        ) : (
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Save your profile to calculate calorie and macro targets.
          </p>
        )}
      </section>

      <section className="mb-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm shadow-black/20">
        <h2 className="text-lg font-semibold text-white">Apple Calendar</h2>
        <AppleCalendarCard
          feedPath={feedToken ? `/api/calendar/feed/${feedToken.token}` : null}
          origin={origin}
        />
      </section>

      <section className="mb-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm shadow-black/20">
        <h2 className="text-lg font-semibold text-white">Apple Health</h2>
        <AppleHealthCard origin={origin} token={healthToken?.token ?? null} />
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm shadow-black/20">
        <h2 className="text-lg font-semibold text-white">Account</h2>
        <p className="mt-2 text-sm text-zinc-400">{user.email}</p>
        <form action={logout} className="mt-4">
          <SubmitButton pendingLabel="Logging out..." variant="danger">
            Log out
          </SubmitButton>
        </form>
      </section>
    </div>
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
