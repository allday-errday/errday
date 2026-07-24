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
        <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl">
          Set up your profile
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          This takes a minute.
        </p>
      </div>
      <div className="border-t border-[var(--border)] pt-6">
        <OnboardingForm />
      </div>
    </div>
  );
}
