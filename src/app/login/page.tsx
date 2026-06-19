import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-8rem)] w-full max-w-md flex-col justify-center">
      <header className="mb-8">
        <p className="mb-2 text-sm font-semibold uppercase tracking-normal text-[var(--accent)]">
          Errday
        </p>
        <h1 className="text-4xl font-bold tracking-normal text-white">
          Welcome back.
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Log in to keep tracking your all-day basics.
        </p>
      </header>
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <LoginForm />
      </section>
    </div>
  );
}
