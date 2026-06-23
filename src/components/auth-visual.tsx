import Link from "next/link";

type AuthVisualProps = {
  mode: "login" | "signup";
};

export function AuthVisual({ mode }: AuthVisualProps) {
  return (
    <section className="brand-hero relative isolate min-h-[22rem] overflow-hidden rounded-[2rem] border border-white/10 p-7 sm:p-10 lg:min-h-[calc(100dvh-5rem)] lg:p-12">
      <div className="absolute -right-36 -top-44 -z-10 size-[38rem] rounded-full bg-[var(--accent)]/40 blur-3xl" />
      <div className="absolute -bottom-40 -left-32 -z-10 size-96 rounded-full bg-[#5136ff]/30 blur-3xl" />
      <div className="flex h-full min-h-[inherit] flex-col justify-between gap-16">
        <Link className="flex items-center gap-3" href="/today">
          <span className="relative grid size-11 place-items-center rounded-xl bg-white text-xl font-extrabold text-[#111218]">
            E
            <span className="absolute -right-1 -top-1 size-3 rounded-full bg-[var(--signal)]" />
          </span>
          <span className="text-xl font-extrabold tracking-[-0.04em] text-white">errday</span>
        </Link>

        <div className="max-w-2xl">
          <p className="eyebrow text-[#c9c3ff]">
            {mode === "login" ? "Welcome back" : "Your daily system"}
          </p>
          <p className="mt-5 text-[clamp(3rem,6vw,6.8rem)] font-extrabold leading-[0.88] tracking-[-0.075em] text-white">
            All day.<br />Errday<span className="text-[var(--signal)]">.</span>
          </p>
          <p className="mt-7 max-w-lg text-base font-semibold leading-7 text-white/60 sm:text-lg">
            Training, nutrition, sleep and reflection — one sharp view of the life you are building.
          </p>
        </div>

        <div className="grid max-w-xl grid-cols-3 gap-3 border-t border-white/10 pt-6">
          {["Train", "Fuel", "Recover"].map((item, index) => (
            <div key={item}>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/35">0{index + 1}</p>
              <p className="mt-2 text-sm font-extrabold text-white sm:text-base">{item}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
