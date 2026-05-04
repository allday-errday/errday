import { logWater } from "../actions";

export function WaterLogButtons() {
  return (
    <div className="mb-6 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-200/70">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-black uppercase tracking-normal text-zinc-500">
            Water
          </h2>
          <p className="mt-1 text-sm text-zinc-500">Quick log hydration.</p>
        </div>
        <div className="flex gap-2">
          {[250, 500].map((amount) => (
            <form action={logWater} key={amount}>
              <input name="amount_ml" type="hidden" value={amount} />
              <button
                className="min-h-10 rounded-full bg-[#FF69B4] px-3 text-sm font-black text-black shadow-sm shadow-[#FF69B4]/20"
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
