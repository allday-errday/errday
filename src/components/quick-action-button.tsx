import Link from "next/link";

type QuickActionButtonProps = {
  href?: string;
  label: string;
};

const className =
  "flex min-h-14 items-center rounded-xl border border-zinc-200 bg-white px-4 text-left text-sm font-semibold text-zinc-800 shadow-sm shadow-zinc-200/70 transition hover:border-fuchsia-200 hover:bg-fuchsia-50/40 hover:shadow-md hover:shadow-fuchsia-100/60 active:scale-[0.98]";

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
