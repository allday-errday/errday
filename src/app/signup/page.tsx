import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col justify-center">
      <header className="mb-8">
        <p className="mb-2 text-sm font-semibold uppercase tracking-normal text-[#d946ef]">
          Errday
        </p>
        <h1 className="text-4xl font-black tracking-normal text-[#0b0b10]">
          Start tracking.
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Create your private Errday account.
        </p>
      </header>
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm shadow-zinc-200/70">
        <SignupForm />
      </section>
    </div>
  );
}
