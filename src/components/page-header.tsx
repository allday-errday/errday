import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
};

export function PageHeader({ title, subtitle, trailing }: PageHeaderProps) {
  return (
    <header className="mb-6 max-w-3xl pt-1 sm:mb-10 lg:mb-14">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[2.125rem] font-bold leading-[1.05] text-white sm:text-5xl lg:text-6xl">
          {title}
        </h1>
        {trailing ? <div className="shrink-0">{trailing}</div> : null}
      </div>
      {subtitle ? (
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400 sm:mt-4 sm:text-lg sm:leading-7">
          {subtitle}
        </p>
      ) : null}
    </header>
  );
}
