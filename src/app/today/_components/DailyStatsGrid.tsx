export type DailyStat = {
  helper: string;
  label: string;
  value: string;
};

type DailyStatsGridProps = {
  stats: DailyStat[];
};

export function DailyStatsGrid({ stats }: DailyStatsGridProps) {
  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-black uppercase tracking-normal text-zinc-500">
          Stats
        </h2>
        <button
          className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-black text-black shadow-sm shadow-zinc-200/60"
          type="button"
        >
          Customize
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <article
            className="min-h-28 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-200/70"
            key={stat.label}
          >
            <p className="text-sm font-bold text-zinc-500">{stat.label}</p>
            <p className="mt-3 text-2xl font-black tracking-normal text-black">
              {stat.value}
            </p>
            <p className="mt-2 text-xs leading-5 text-zinc-500">{stat.helper}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
