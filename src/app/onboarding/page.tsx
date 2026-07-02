import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { requireUser } from "@/lib/auth";
import { getProfile } from "@/lib/db/profile";
import { safeRead } from "@/lib/db/safe-read";
import { OnboardingForm } from "./onboarding-form";

export const metadata = {
  title: "Welcome",
};

export default async function OnboardingPage() {
  const { supabase, user } = await requireUser();
  const profile = await safeRead(
    getProfile(supabase, user.id),
    null,
    "onboarding profile",
  );

  // Already set up — no need to ask twice.
  if (profile?.calorie_target) {
    redirect("/today");
  }

  return (
    <div className="mx-auto grid min-h-dvh w-full max-w-xl content-start gap-8 px-4 py-10 sm:py-14">
      <BrandLogo href="/today" showTagline={false} />
      <div>
        <p className="eyebrow">Welcome to Errday</p>
        <h1 className="mt-3 text-3xl font-extrabold leading-tight text-white sm:text-4xl">
          Let&apos;s set up your day.
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Three quick questions — then Errday knows your targets and Today is
          ready for you.
        </p>
      </div>
      <div className="card p-5 sm:p-6">
        <OnboardingForm />
      </div>
    </div>
  );
}
