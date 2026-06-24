import { BrandLogo, ErrdayMark } from "@/components/brand-logo";

type AuthVisualProps = {
  mode: "login" | "signup";
};

export function AuthVisual({ mode }: AuthVisualProps) {
  return (
    <section className="brand-hero relative isolate min-h-[17rem] overflow-hidden rounded-[1.5rem] border border-white/10 p-6 sm:min-h-[22rem] sm:rounded-[2rem] sm:p-10 lg:min-h-[calc(100dvh-5rem)] lg:p-12">
      <div className="absolute -right-28 -top-36 -z-10 size-[30rem] rounded-full bg-[var(--accent)]/35 blur-2xl" />
      <div className="absolute -bottom-32 -left-24 -z-10 size-80 rounded-full bg-[#6f64e0]/25 blur-2xl" />

      <div className="flex h-full min-h-[inherit] flex-col justify-between gap-10 sm:gap-16">
        <BrandLogo
          href="/today"
          markClassName="size-10 sm:size-12"
          showTagline={false}
          wordmarkClassName="text-xl sm:text-2xl"
        />

        <div className="max-w-2xl">
          <p className="eyebrow text-[#c9c3ff]">
            {mode === "login" ? "Welcome back" : "Your daily system"}
          </p>
          <div className="errday-mark-glow mt-5 w-fit sm:mt-8">
            <ErrdayMark className="size-20 sm:size-36" dot="light" title="Errday flow ring" />
          </div>
          <p className="mt-4 text-5xl font-extrabold leading-none text-white sm:mt-5 sm:text-6xl lg:text-7xl">
            All day.<br />Errday<span className="text-[var(--accent)]">.</span>
          </p>
          <p className="mt-5 max-w-lg text-sm font-semibold leading-6 text-white/60 sm:mt-7 sm:text-lg sm:leading-7">
            Training, nutrition, sleep and reflection — one sharp view of the life you are building.
          </p>
        </div>

        <div className="grid max-w-xl grid-cols-4 gap-2 border-t border-white/10 pt-5 sm:gap-3 sm:pt-6">
          {["Train", "Eat", "Sleep", "Reflect"].map((item, index) => (
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
