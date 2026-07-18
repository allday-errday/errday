type TodayHeaderProps = {
  isToday: boolean;
};

export function TodayHeader({
  isToday,
}: TodayHeaderProps) {
  return (
    <header className="mb-6 flex items-end justify-between gap-5 pt-1 sm:mb-8">
      <div className="max-w-4xl">
        <h1 className="text-3xl font-extrabold leading-none text-white sm:text-4xl">
          {isToday ? (
            <>
              Own today<span className="text-[var(--accent)]">.</span>
            </>
          ) : (
            <>
              Looking back<span className="text-[var(--accent)]">.</span>
            </>
          )}
        </h1>
      </div>
      <Link
        aria-label="Open monthly recap"
        className="flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-4 text-sm font-bold text-zinc-300 transition hover:border-[var(--accent)]/50 hover:bg-white/[0.07] hover:text-white sm:px-5"
        href="/recap"
      >
        <svg
          aria-hidden="true"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.2"
          viewBox="0 0 24 24"
        >
          <path d="M3 3v18h18" />
          <path d="m7 15 4-5 3 3 5-7" />
        </svg>
        Recap
      </Link>
    </header>
  );
}
import Link from "next/link";
