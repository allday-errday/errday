import { logWater } from "../actions";

export function WaterLogButtons() {
  return (
    <section className="surface-panel relative overflow-hidden p-6">
      <div className="absolute -right-10 -top-12 size-40 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Hydration</p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.04em] text-white">
              Top up your flow.
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">One click. Logged instantly.</p>
          </div>
          <span className="grid size-12 place-items-center rounded-2xl bg-cyan-300/10 text-cyan-200">
            <svg aria-hidden="true" className="size-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 3s6 6.1 6 11a6 6 0 0 1-12 0c0-4.9 6-11 6-11Z" />
            </svg>
          </span>
        </div>
        <div className="mt-7 grid grid-cols-2 gap-3">
          {[250, 500].map((amount) => (
            <form action={logWater} key={amount}>
              <input name="amount_ml" type="hidden" value={amount} />
              <button
                className="min-h-12 w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:border-cyan-200/40 hover:bg-cyan-200 hover:text-[#0a1012]"
                type="submit"
              >
                +{amount} ml
              </button>
            </form>
          ))}
        </div>
      </div>
    </section>
  );
}
