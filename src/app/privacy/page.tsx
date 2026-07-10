import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export const metadata = {
  title: "Privacy policy",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-14">
      <BrandLogo href="/" showTagline={false} />

      <h1 className="mt-8 text-3xl font-extrabold text-white">Privacy policy</h1>
      <p className="mt-2 text-sm text-zinc-500">Last updated: July 3, 2026</p>

      <div className="mt-6 space-y-6 text-sm leading-7 text-zinc-300">
        <section>
          <h2 className="font-bold text-white">Who we are</h2>
          <p className="mt-2">
            Errday (errday.ch) is operated by Anis Tabakovic, Switzerland
            (&quot;we&quot;). This policy explains what data Errday processes
            and why, in line with the Swiss Federal Act on Data Protection
            (FADP) and, where applicable, the EU GDPR.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-white">What we store</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>
              <span className="font-semibold text-white">Account:</span> your
              email address and a hashed password.
            </li>
            <li>
              <span className="font-semibold text-white">Health data you enter:</span>{" "}
              meals, workouts, sleep, water, body weight, journal entries and
              your goals. This is sensitive personal data — you provide it
              voluntarily so Errday can do its job, and it is used for nothing
              else.
            </li>
            <li>
              <span className="font-semibold text-white">Apple Health sync (optional):</span>{" "}
              if you enable it, steps, active energy and sleep are sent from
              your device to your account using a secret key you control and
              can revoke at any time in Settings.
            </li>
            <li>
              <span className="font-semibold text-white">Technical logs:</span>{" "}
              our hosting providers keep short-lived request logs (IP address,
              timestamps) for security and operations.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-bold text-white">What we do not do</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>No advertising, no tracking pixels, no analytics cookies.</li>
            <li>No sale or sharing of your data with third parties.</li>
            <li>
              Your entries are protected by row-level security: no other user
              can ever read them.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-bold text-white">Cookies</h2>
          <p className="mt-2">
            Errday only sets cookies that are strictly necessary to keep you
            signed in. There are no marketing or analytics cookies, which is
            why there is no cookie banner.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-white">Where your data lives</h2>
          <p className="mt-2">
            Your data is stored with Supabase in the EU (Zurich region,
            eu-central-2). The website is delivered by Vercel with server
            functions in Frankfurt. Both providers act as processors under
            data processing agreements.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-white">AI coach</h2>
          <p className="mt-2">
            The optional Errday Coach runs against a self-hosted model. Your
            conversations are not used to train third-party models and are not
            shared with AI providers.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-white">Unconfirmed accounts</h2>
          <p className="mt-2">
            If you sign up and do not confirm your email address within 6
            hours, the account and all data attached to it are deleted
            automatically.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-white">Your rights</h2>
          <p className="mt-2">
            You can access, correct or delete your data at any time — most of
            it directly in the app. For a full export or account deletion,
            email{" "}
            <a className="font-semibold text-[var(--accent)]" href="mailto:hello@errday.ch">
              hello@errday.ch
            </a>{" "}
            and we will complete it within 30 days. Deleting your account
            removes all of your data permanently.
          </p>
        </section>
      </div>

      <p className="mt-10 text-sm">
        <Link className="font-semibold text-[var(--accent)]" href="/imprint">
          Legal notice
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
