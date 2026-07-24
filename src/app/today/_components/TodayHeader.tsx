type TodayHeaderProps = {
  isToday: boolean;
};

export function TodayHeader({
  isToday,
}: TodayHeaderProps) {
  return (
    <header className="mb-6 pt-1 sm:mb-8">
      <div className="max-w-4xl">
        <h1 className="text-3xl font-bold leading-none text-white sm:text-4xl">
          {isToday ? (
            <>
              Today<span className="text-[var(--accent)]">.</span>
            </>
          ) : (
            <>
              Previous day<span className="text-[var(--accent)]">.</span>
            </>
          )}
        </h1>
      </div>
    </header>
  );
}
