import Link from "next/link";

type TodayHeaderProps = {
  dateLabel: string;
  isToday: boolean;
  nextHref: string | null;
  prevHref: string;
};

export function TodayHeader({
  dateLabel,
  isToday,
  nextHref,
  prevHref,
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
        <div className="mt-2 flex items-center gap-1.5">
          <Link
            aria-label="Previous day"
            className="grid size-8 place-items-center rounded-full border border-white/10 bg-white/[0.035] text-zinc-400 transition hover:border-[var(--accent)]/50 hover:text-white"
            href={prevHref}
          >
            <svg aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" viewBox="0 0 24 24">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
          <p className="px-1 text-sm font-semibold leading-6 text-zinc-400">
            {dateLabel}
          </p>
          {nextHref ? (
            <Link
              aria-label="Next day"
              className="grid size-8 place-items-center rounded-full border border-white/10 bg-white/[0.035] text-zinc-400 transition hover:border-[var(--accent)]/50 hover:text-white"
              href={nextHref}
            >
              <svg aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" viewBox="0 0 24 24">
                <path d="m9 6 6 6-6 6" />
              </svg>
            </Link>
          ) : (
            <span className="grid size-8 place-items-center rounded-full border border-white/5 text-zinc-700">
              <svg aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" viewBox="0 0 24 24">
                <path d="m9 6 6 6-6 6" />
              </svg>
            </span>
          )}
          {!isToday ? (
            <Link
              className="ml-1 rounded-full bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-bold text-[var(--accent)] transition hover:brightness-125"
              href="/today"
            >
              Back to today
            </Link>
          ) : null}
        </div>
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
