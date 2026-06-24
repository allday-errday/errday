import { AuthVisual } from "@/components/auth-visual";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="grid min-h-[calc(100dvh-3rem)] gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(24rem,0.8fr)] lg:gap-6">
      <AuthVisual mode="login" />
      <section className="order-first flex items-center justify-center px-1 py-3 sm:px-8 sm:py-10 lg:order-none lg:py-16">
        <div className="w-full max-w-md">
          <p className="eyebrow">Private access</p>
          <h1 className="mt-3 text-4xl font-extrabold leading-tight text-white sm:mt-4 sm:text-5xl">
            Pick up<br />your rhythm.
          </h1>
          <p className="mt-4 text-sm leading-6 text-zinc-400 sm:mt-5 sm:text-base sm:leading-7">
            Your day is waiting exactly where you left it.
          </p>
          <div className="mt-6 rounded-[1.25rem] border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/30 sm:mt-9 sm:rounded-[1.5rem] sm:p-6">
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
