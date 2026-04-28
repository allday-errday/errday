import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/auth";
import { getProfile } from "@/lib/db/profile";
import { ReminderSettingsForm } from "./reminder-settings-form";
import { logout } from "./actions";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const { supabase, user } = await requireUser();
  const profile = await getProfile(supabase, user.id);

  return (
    <div>
      <PageHeader
        subtitle="Profile, goals and app settings."
        title="Settings"
      />

      <section className="mb-5 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm shadow-zinc-200/70">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">Body Profile</h2>
        <SettingsForm profile={profile} />
      </section>

      <section
        className="mb-5 rounded-2xl border border-fuchsia-200 bg-gradient-to-br from-fuchsia-50 via-white to-violet-50 p-5 shadow-lg shadow-fuchsia-100/60"
        id="reminder-settings"
      >
        <h2 className="text-lg font-semibold text-zinc-900">Reminders</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Choose when to get nudges for food, supplements, gym, sleep and journal.
        </p>
        <div className="mt-4">
          <ReminderSettingsForm profile={profile} />
        </div>
      </section>

      <section className="mb-5 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm shadow-zinc-200/70">
        <h2 className="text-lg font-semibold text-zinc-900">Calculated Targets</h2>
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

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm shadow-zinc-200/70">
        <h2 className="text-lg font-semibold text-zinc-900">Account</h2>
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
    <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 font-bold text-zinc-900">{value}</p>
    </div>
  );
}
