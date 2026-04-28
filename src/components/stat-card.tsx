type StatCardProps = {
  label: string;
  value: string;
  helper?: string;
};

export function StatCard({ label, value, helper }: StatCardProps) {
  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-200/70 transition hover:border-fuchsia-200 hover:shadow-md hover:shadow-fuchsia-100/60">
      <p className="text-sm font-semibold text-zinc-500">{label}</p>
      <p className="mt-3 text-2xl font-bold tracking-normal text-zinc-900">
        {value}
      </p>
      {helper ? <p className="mt-2 text-xs text-zinc-600">{helper}</p> : null}
    </article>
  );
}
