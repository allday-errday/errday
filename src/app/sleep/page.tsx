import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { getDailyProfile } from "@/lib/db/daily-flow";
import { safeRead } from "@/lib/db/safe-read";
import { listSleepLogs } from "@/lib/db/sleep";
import { SleepForm } from "./sleep-form";
import { SleepSession } from "./sleep-session";

export default async function SleepPage() {
  const { supabase, user } = await requireUser();
  const [logs, dailyProfile] = await Promise.all([
    safeRead(listSleepLogs(supabase, user.id), [], "sleep logs"),
    safeRead(getDailyProfile(supabase, user.id), null, "daily profile"),
  ]);
  const goalHours = dailyProfile ? Number(dailyProfile.sleep_goal_hours) : 8;
  const suggestedBedtime = dailyProfile?.suggested_bedtime ?? null;

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-white sm:text-4xl">
          Sleep
        </h1>
      </header>

      <SleepSession goalHours={goalHours} suggestedBedtime={suggestedBedtime} />

      <details className="group mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-white">
          Log a night manually
          <span className="text-zinc-500 transition group-open:rotate-180">
            <svg aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
        </summary>
        <div className="mt-4">
          <SleepForm />
        </div>
      </details>

      <section className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-lg font-semibold text-white">Last 7 nights</h2>
        {logs.length === 0 ? (
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            No sleep tracked yet.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {logs.map((log) => {
              const hours = Number(log.sleep_hours);
              const pct = Math.max(6, Math.min(100, (hours / goalHours) * 100));
              return (
                <div
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/70 p-4"
                  key={log.id}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">
                      {formatDate(log.date)}
                    </p>
                    <p className="text-sm font-bold text-[var(--accent)]">
                      {hours}h
                    </p>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--surface-3)]">
                    <div
                      className="h-full rounded-full bg-[var(--accent)]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {log.bedtime || log.wake_time ? (
                    <p className="mt-2 text-xs text-zinc-500">
                      {log.bedtime?.slice(0, 5) ?? "--:--"} →{" "}
                      {log.wake_time?.slice(0, 5) ?? "--:--"}
                      {log.quality ? ` · quality ${log.quality}/5` : ""}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
