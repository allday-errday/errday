import Image from "next/image";
import Link from "next/link";

type ErrdayMarkProps = {
  className?: string;
  dot?: "light" | "accent";
  title?: string;
};

type BrandLogoProps = {
  className?: string;
  href?: string;
  markClassName?: string;
  showTagline?: boolean;
  tagline?: string;
  wordmarkClassName?: string;
};

export function ErrdayMark({
  className = "size-10",
  title = "Errday flow mark",
}: ErrdayMarkProps) {
  return (
    <Image
      alt={title}
      className={className}
      height={128}
      src="/brand/errday-mark-violet.png"
      width={128}
    />
  );
}

export function ErrdayWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-bold text-[var(--text)] ${className}`}>
      errday<span className="text-[var(--accent)]">.</span>
    </span>
  );
}

export function BrandLogo({
  className = "",
  href,
  markClassName = "size-11",
  showTagline = true,
  tagline = "All day. Errday.",
  wordmarkClassName = "text-xl",
}: BrandLogoProps) {
  const content = (
    <>
      <span className="errday-mark-glow relative grid shrink-0 place-items-center">
        <ErrdayMark className={markClassName} dot="accent" title="Errday" />
      </span>
      <span className="min-w-0">
        <ErrdayWordmark className={`block leading-none ${wordmarkClassName}`} />
        {showTagline ? (
          <span className="mt-1 hidden text-[0.62rem] font-bold uppercase tracking-wide text-[#7b8290] xl:block">
            {tagline}
          </span>
        ) : null}
      </span>
    </>
  );

  const classes = `group flex shrink-0 items-center gap-3 ${className}`;

  if (href) {
    return (
      <Link className={classes} href={href}>
        {content}
      </Link>
    );
  }

  return <div className={classes}>{content}</div>;
}
