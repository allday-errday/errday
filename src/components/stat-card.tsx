type StatCardProps = {
  label: string;
  value: string;
  helper?: string;
};

export function StatCard({ label, value, helper }: StatCardProps) {
  return (
    <article className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition hover:border-[var(--accent)]/60 hover:bg-[var(--surface-2)]">
      <p className="text-sm font-semibold text-zinc-400">{label}</p>
      <p className="mt-3 text-2xl font-bold tracking-normal text-white">
        {value}
      </p>
      {helper ? <p className="mt-2 text-xs text-zinc-500">{helper}</p> : null}
    </article>
  );
}
