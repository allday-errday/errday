type StatCardProps = {
  label: string;
  value: string;
  helper?: string;
};

export function StatCard({ label, value, helper }: StatCardProps) {
  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition duration-300 hover:-translate-y-0.5 hover:border-[var(--accent)]/40 hover:bg-[var(--surface-2)]">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">{label}</p>
      <p className="mt-4 text-3xl font-extrabold tracking-[-0.04em] text-white">
        {value}
      </p>
      {helper ? <p className="mt-2 text-xs text-zinc-500">{helper}</p> : null}
    </article>
  );
}
