type PageHeaderProps = {
  title: string;
  subtitle?: string;
};

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <header className="mb-5 max-w-3xl pt-1 sm:mb-10 lg:mb-14">
      <p className="eyebrow mb-2 sm:mb-4">Errday / Daily system</p>
      <h1 className="text-[1.9rem] font-extrabold leading-[1.05] text-white sm:text-5xl lg:text-6xl">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400 sm:mt-5 sm:text-lg sm:leading-7">
          {subtitle}
        </p>
      ) : null}
    </header>
  );
}
