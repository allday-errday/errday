import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/auth";
import { getProfile } from "@/lib/db/profile";
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

      <section className="mb-5 rounded-lg border border-white/10 bg-[#151515] p-5">
        <h2 className="mb-4 text-lg font-semibold text-white">Body Profile</h2>
        <SettingsForm profile={profile} />
      </section>

      <section className="mb-5 rounded-lg border border-white/10 bg-[#151515] p-5">
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

      <section className="rounded-lg border border-white/10 bg-[#151515] p-5">
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
    <div className="rounded-lg bg-black/20 p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 font-bold text-white">{value}</p>
    </div>
  );
}
