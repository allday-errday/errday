import { logWater } from "../actions";

export function WaterLogButtons() {
  return (
    <section className="apple-group p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-cyan-300/10 text-cyan-200">
            <svg aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 3s6 6.1 6 11a6 6 0 0 1-12 0c0-4.9 6-11 6-11Z" />
            </svg>
          </span>
          <h2 className="text-lg font-bold text-white">Water</h2>
        </div>
        <div className="flex items-center divide-x divide-[var(--border)] text-sm font-semibold">
          {[250, 500].map((amount) => (
            <form action={logWater} className="first:pr-3 last:pl-3" key={amount}>
              <input name="amount_ml" type="hidden" value={amount} />
              <button className="min-h-10 text-[var(--accent-strong)] transition hover:text-white" type="submit">
                +{amount} ml
              </button>
            </form>
          ))}
        </div>
      </div>
    </section>
  );
}
