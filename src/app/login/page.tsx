import { BrandLogo } from "@/components/brand-logo";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <section className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-md flex-col justify-center py-8 sm:py-12">
      <BrandLogo href="/login" showTagline={false} />
      <div className="mt-12">
        <h1 className="text-3xl font-extrabold text-white sm:text-4xl">Log in</h1>
        <p className="mt-2 text-sm text-zinc-400">Continue where you left off.</p>
      </div>
      <div className="mt-8 border-t border-[var(--border)] pt-6">
        <LoginForm />
      </div>
    </section>
  );
}
