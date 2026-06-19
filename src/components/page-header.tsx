type PageHeaderProps = {
  title: string;
  subtitle?: string;
};

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <header className="mb-6 pt-1">
      <p className="mb-2 text-sm font-semibold uppercase tracking-normal text-[var(--accent)]">
        Errday
      </p>
      <h1 className="text-3xl font-bold tracking-normal text-white sm:text-4xl">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-2 max-w-md text-sm leading-6 text-zinc-400">
          {subtitle}
        </p>
      ) : null}
    </header>
  );
}
