import Link from "next/link";

type TodayHeaderProps = {
  dateLabel: string;
};

export function TodayHeader({ dateLabel }: TodayHeaderProps) {
  return (
    <header className="mb-6 flex items-end justify-between gap-5 pt-1 sm:mb-8">
      <div className="max-w-4xl">
        <p className="eyebrow mb-2 flex items-center gap-3">
          <span className="inline-block h-px w-6 bg-[var(--accent)]" />
          Your daily system
        </p>
        <h1 className="text-3xl font-extrabold leading-none text-white sm:text-4xl">
          Own today<span className="text-[var(--accent)]">.</span>
        </h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-zinc-400">
          {dateLabel}
        </p>
      </div>
      <Link
        aria-label="Open settings"
        className="hidden min-h-12 items-center gap-3 rounded-full border border-white/10 bg-white/[0.035] px-5 text-sm font-bold text-zinc-300 transition hover:border-[var(--accent)]/50 hover:bg-white/[0.07] hover:text-white sm:flex"
        href="/settings#reminder-settings"
      >
        <svg
          aria-hidden="true"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 1 1 4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.3 7A2 2 0 1 1 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6h.1a1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.6 1h.1a2 2 0 1 1 0 4H21a1.7 1.7 0 0 0-1.6 1Z" />
        </svg>
        Tune your day
      </Link>
    </header>
  );
}
