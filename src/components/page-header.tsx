type PageHeaderProps = {
  title: string;
  subtitle?: string;
};

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <header className="mb-6 pt-1">
      <p className="mb-2 text-sm font-semibold uppercase tracking-normal text-[#FF69B4]">
        Errday
      </p>
      <h1 className="text-3xl font-bold tracking-normal text-[#0b0b10]">{title}</h1>
      {subtitle ? (
        <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-400">
          {subtitle}
        </p>
      ) : null}
    </header>
  );
}
