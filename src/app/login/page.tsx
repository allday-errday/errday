import { AuthVisual } from "@/components/auth-visual";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="grid min-h-[calc(100dvh-3rem)] gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(24rem,0.8fr)]">
      <AuthVisual mode="login" />
      <section className="flex items-center justify-center px-1 py-10 sm:px-8 lg:py-16">
        <div className="w-full max-w-md">
          <p className="eyebrow">Private access</p>
          <h1 className="mt-4 text-5xl font-extrabold tracking-[-0.06em] text-white">
            Pick up<br />your rhythm.
          </h1>
          <p className="mt-5 text-base leading-7 text-zinc-400">
            Your day is waiting exactly where you left it.
          </p>
          <div className="mt-9 rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/30 sm:p-6">
            <LoginForm />
          </div>
          <p className="mt-6 text-center text-xs font-semibold text-zinc-600">
            Private by default. Built for your eyes only.
          </p>
        </div>
      </section>
    </div>
  );
}
