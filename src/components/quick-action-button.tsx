import Link from "next/link";

type QuickActionButtonProps = {
  href?: string;
  label: string;
};

const className =
  "flex min-h-14 items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-left text-sm font-semibold text-zinc-100 transition hover:border-[var(--accent)]/60 hover:bg-[var(--accent-soft)] active:scale-[0.98]";

export function QuickActionButton({ href, label }: QuickActionButtonProps) {
  if (href) {
    return (
      <Link className={className} href={href}>
        {label}
      </Link>
    );
  }

  return (
    <button className={className} type="button">
      {label}
    </button>
  );
}
