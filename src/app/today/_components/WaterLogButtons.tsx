import { logWater } from "../actions";

export function WaterLogButtons() {
  return (
    <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm shadow-black/20">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-normal text-zinc-500">
            Water
          </h2>
          <p className="mt-1 text-sm text-zinc-500">Quick log hydration.</p>
        </div>
        <div className="flex gap-2">
          {[250, 500].map((amount) => (
            <form action={logWater} key={amount}>
              <input name="amount_ml" type="hidden" value={amount} />
              <button
                className="min-h-10 rounded-full bg-[var(--accent)] px-3 text-sm font-bold text-black shadow-sm shadow-[var(--accent)]/20"
                type="submit"
              >
                +{amount} ml
              </button>
            </form>
          ))}
        </div>
      </div>
    </div>
  );
}
