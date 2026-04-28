import Link from "next/link";

type QuickActionButtonProps = {
  href?: string;
  label: string;
};

const className =
  "flex min-h-14 items-center rounded-lg border border-white/10 bg-[#151515] px-4 text-left text-sm font-semibold text-white shadow-lg shadow-black/20 transition hover:border-[#d946ef]/60 hover:bg-[#1c1c1c] active:scale-[0.98]";

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
