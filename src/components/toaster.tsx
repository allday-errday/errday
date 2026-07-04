"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const PARAM_MESSAGES: Record<string, string> = {
  water: "Water logged",
  meal: "Meal logged",
  food: "Meal logged",
  workout: "Workout saved",
  sleep: "Sleep tracked",
  weight: "Weight logged",
  journal: "Reflection saved",
  confirmed: "Email confirmed — welcome to Errday!",
  profile: "Profile saved — your targets are set",
};

type Toast = { id: number; message: string };

export function toast(message: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("errday:toast", { detail: message }));
  }
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const push = useCallback((message: string) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, 2600);
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (typeof detail === "string") {
        push(detail);
      }
    };
    window.addEventListener("errday:toast", handler);
    return () => window.removeEventListener("errday:toast", handler);
  }, [push]);

  useEffect(() => {
    const key = searchParams.get("toast");
    if (!key) {
      return;
    }
    const timer = window.setTimeout(() => {
      push(PARAM_MESSAGES[key] ?? "Done");
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      params.delete("toast");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [searchParams, pathname, router, push]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-8">
      {toasts.map((t) => (
        <div
          className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-[var(--accent)]/40 bg-[var(--bg-soft)]/95 px-4 py-2.5 text-sm font-bold text-white shadow-2xl shadow-black/50 backdrop-blur-xl [animation:fadeRise_0.25s_ease]"
          key={t.id}
        >
          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-[var(--on-accent)]">
            <svg aria-hidden="true" className="size-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24">
              <path d="m5 13 4 4L19 7" />
            </svg>
          </span>
          {t.message}
        </div>
      ))}
    </div>
  );
}
