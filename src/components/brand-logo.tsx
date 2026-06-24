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
  dot = "accent",
  title = "Errday flow mark",
}: ErrdayMarkProps) {
  return (
    <svg
      aria-label={title}
      className={className}
      fill="none"
      role="img"
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M26.09 20.47 A38 38 0 0 1 73.91 20.47"
        stroke="#6f64e0"
        strokeLinecap="round"
        strokeWidth="8.5"
      />
      <path
        d="M79.53 26.09 A38 38 0 0 1 79.53 73.91"
        stroke="#8b82f6"
        strokeLinecap="round"
        strokeWidth="8.5"
      />
      <path
        d="M73.91 79.53 A38 38 0 0 1 26.09 79.53"
        stroke="#a99fff"
        strokeLinecap="round"
        strokeWidth="8.5"
      />
      <path
        d="M20.47 73.91 A38 38 0 0 1 20.47 26.09"
        stroke="#c4bcff"
        strokeLinecap="round"
        strokeWidth="8.5"
      />
      <g className="errday-orbit">
        <circle cx="50" cy="12" fill={dot === "light" ? "#ffffff" : "#a99fff"} r="8" />
        {dot === "light" ? <circle cx="50" cy="12" fill="#a99fff" opacity="0.35" r="8" /> : null}
      </g>
    </svg>
  );
}

export function ErrdayWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-extrabold text-[#f3f4f7] ${className}`}>
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
          <span className="mt-1 hidden text-[0.62rem] font-bold uppercase tracking-[0.22em] text-[#7b8290] xl:block">
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
