type PageHeaderProps = {
  title: string;
  subtitle?: string;
};

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <header className="mb-7 max-w-3xl pt-1 sm:mb-10 lg:mb-14">
      <p className="eyebrow mb-3 sm:mb-4">Errday / Daily system</p>
      <h1 className="text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400 sm:mt-5 sm:text-lg sm:leading-7">
          {subtitle}
        </p>
      ) : null}
    </header>
  );
}
