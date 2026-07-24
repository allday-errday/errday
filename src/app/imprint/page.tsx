import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export const metadata = {
  title: "Legal notice",
};

export default function ImprintPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-14">
      <BrandLogo href="/" showTagline={false} />

      <h1 className="mt-8 text-3xl font-bold text-white">
        Legal notice <span className="text-zinc-500">(Impressum)</span>
      </h1>

      <div className="mt-6 space-y-6 text-sm leading-7 text-zinc-300">
        <section>
          <h2 className="font-bold text-white">Operator</h2>
          <p className="mt-2">
            Anis Tabakovic
            <br />
            Switzerland
          </p>
        </section>

        <section>
          <h2 className="font-bold text-white">Contact</h2>
          <p className="mt-2">
            Errday is a free, privately operated service. The fastest way to
            reach the operator is by email:
            <br />
            <a
              className="font-semibold text-[var(--accent)]"
              href="mailto:hello@errday.ch"
            >
              hello@errday.ch
            </a>
          </p>
        </section>

        <section>
          <h2 className="font-bold text-white">Disclaimer</h2>
          <p className="mt-2">
            Errday is a personal health tracking tool. It does not provide
            medical advice, diagnosis or treatment. Calorie, macro and
            recovery figures are estimates and no substitute for advice from
            qualified professionals. Use of the service is at your own risk.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-white">Data sources</h2>
          <p className="mt-2">
            Food data: Swiss Food Composition Database (naehrwertdaten.ch,
            FSVO) and Open Food Facts (ODbL). Exercise illustrations:
            free-exercise-db (public domain).
          </p>
        </section>

        <section>
          <h2 className="font-bold text-white">Applicable law</h2>
          <p className="mt-2">
            Swiss law applies. Place of jurisdiction is Switzerland.
          </p>
        </section>
      </div>

      <p className="mt-10 text-sm">
        <Link className="font-semibold text-[var(--accent)]" href="/privacy">
          Privacy policy
        </Link>
        <span className="mx-2 text-zinc-600">·</span>
        <Link className="font-semibold text-[var(--accent)]" href="/terms">
          Terms of Use
        </Link>
        <span className="mx-2 text-zinc-600">·</span>
        <Link className="font-semibold text-[var(--accent)]" href="/login">
          Back to Errday
        </Link>
      </p>
    </div>
  );
}
