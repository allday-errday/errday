import { logWater } from "../actions";

export function WaterLogButtons() {
  return (
    <section className="surface-panel rounded-xl p-5">
      <div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-white">Water</h2>
            <p className="mt-1 text-sm text-zinc-500">Add a glass</p>
          </div>
          <span className="grid size-10 place-items-center rounded-lg bg-cyan-300/10 text-cyan-200">
            <svg aria-hidden="true" className="size-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 3s6 6.1 6 11a6 6 0 0 1-12 0c0-4.9 6-11 6-11Z" />
            </svg>
          </span>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
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
