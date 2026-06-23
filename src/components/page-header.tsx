type PageHeaderProps = {
  title: string;
  subtitle?: string;
};

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <header className="mb-10 max-w-3xl pt-1 lg:mb-14">
      <p className="eyebrow mb-4">Errday / Daily system</p>
      <h1 className="text-5xl font-extrabold tracking-[-0.055em] text-white sm:text-6xl">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg">
          {subtitle}
        </p>
      ) : null}
    </header>
  );
}
