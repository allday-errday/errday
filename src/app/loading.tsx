import { Apple, Dumbbell, Moon } from "lucide-react";
import type { ReactNode } from "react";
import { ErrdayMark, ErrdayWordmark } from "@/components/brand-logo";

export default function Loading() {
  return (
    <section
      aria-busy="true"
      aria-live="polite"
      className="mx-auto flex min-h-[62dvh] max-w-md flex-col items-center justify-center px-5 text-center"
    >
      <div className="errday-loading-mark grid size-24 place-items-center rounded-xl bg-[var(--surface)] sm:size-28">
        <ErrdayMark className="size-20 sm:size-24" title="Errday" />
      </div>
      <div className="mt-6">
        <ErrdayWordmark className="text-3xl" />
        <p className="mt-3 text-base font-semibold text-white">Loading your day</p>
        <p className="mt-1 text-sm text-zinc-500">Getting today&apos;s overview ready.</p>
      </div>

      <div className="mt-7 h-1 w-36 overflow-hidden rounded-full bg-[var(--surface-2)]">
        <span className="errday-loading-progress block h-full rounded-full bg-[var(--accent)]" />
      </div>

      <div className="mt-8 grid w-full grid-cols-3 border-t border-[var(--border)] pt-5 text-xs text-zinc-500">
        <LoadingItem icon={<Apple className="size-4" />} label="Food" />
        <LoadingItem icon={<Dumbbell className="size-4" />} label="Move" />
        <LoadingItem icon={<Moon className="size-4" />} label="Recover" />
      </div>
      <span className="sr-only">Loading your day</span>
    </section>
  );
}

function LoadingItem({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="flex flex-col items-center gap-2 border-r border-[var(--border)] last:border-r-0">
      <span className="text-[var(--accent)]">{icon}</span>
      {label}
    </span>
  );
}
