import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-8rem)] w-full max-w-md flex-col justify-center">
      <header className="mb-8">
        <p className="mb-2 text-sm font-semibold uppercase tracking-normal text-[var(--accent)]">
          Errday
        </p>
        <h1 className="text-4xl font-bold tracking-normal text-[var(--text)]">
          Start tracking.
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Create your private Errday account.
        </p>
      </header>
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm shadow-black/20">
        <SignupForm />
      </section>
    </div>
  );
}
