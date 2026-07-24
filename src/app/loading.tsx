export default function Loading() {
  return (
    <div className="animate-pulse" aria-hidden="true">
      <div className="mb-6">
        <div className="h-3 w-24 rounded bg-[var(--surface-2)]" />
        <div className="mt-3 h-9 w-48 rounded-lg bg-[var(--surface-2)]" />
      </div>
      <div className="mb-5 h-40 rounded-xl border border-[var(--border)] bg-[var(--surface)]" />
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            className="h-28 rounded-xl border border-[var(--border)] bg-[var(--surface)]"
            key={i}
          />
        ))}
      </div>
    </div>
  );
}
