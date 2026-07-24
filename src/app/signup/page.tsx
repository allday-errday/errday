import { BrandLogo } from "@/components/brand-logo";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <section className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-md flex-col justify-center py-8 sm:py-12">
      <BrandLogo href="/signup" showTagline={false} />
      <div className="mt-12">
        <h1 className="text-3xl font-extrabold text-white sm:text-4xl">Create account</h1>
        <p className="mt-2 text-sm text-zinc-400">Set up your daily tracker.</p>
      </div>
      <div className="mt-8 border-t border-[var(--border)] pt-6">
        <SignupForm />
      </div>
    </section>
  );
}
