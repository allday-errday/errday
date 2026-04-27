type StatCardProps = {
  label: string;
  value: string;
  helper?: string;
};

export function StatCard({ label, value, helper }: StatCardProps) {
  return (
    <article className="rounded-lg border border-white/10 bg-[#151515] p-4 shadow-lg shadow-black/20">
      <p className="text-sm font-medium text-zinc-400">{label}</p>
      <p className="mt-3 text-2xl font-bold tracking-normal text-white">
        {value}
      </p>
      {helper ? <p className="mt-2 text-xs text-zinc-500">{helper}</p> : null}
    </article>
  );
}
