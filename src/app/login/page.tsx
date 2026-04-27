import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col justify-center">
      <header className="mb-8">
        <p className="mb-2 text-sm font-semibold uppercase tracking-normal text-[#22c55e]">
          Errday
        </p>
        <h1 className="text-4xl font-black tracking-normal text-white">
          Welcome back.
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Log in to keep tracking your all-day basics.
        </p>
      </header>
      <section className="rounded-lg border border-white/10 bg-[#151515] p-5">
        <LoginForm />
      </section>
    </div>
  );
}
