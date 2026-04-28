import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { listSleepLogs } from "@/lib/db/sleep";
import { SleepForm } from "./sleep-form";

export default async function SleepPage() {
  const { supabase, user } = await requireUser();
  const logs = await listSleepLogs(supabase, user.id);

  return (
    <div>
      <PageHeader
        subtitle="Track sleep duration, quality and recovery."
        title="Sleep"
      />

      <section className="mb-5 rounded-lg border border-white/10 bg-[#151515] p-5">
        <h2 className="mb-4 text-lg font-semibold text-white">Sleep Log</h2>
        <SleepForm />
      </section>

      <section className="rounded-lg border border-white/10 bg-[#151515] p-5">
        <h2 className="text-lg font-semibold text-white">Latest Sleep</h2>
        {logs.length === 0 ? (
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            No sleep logs yet. Add last night above.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {logs.map((log) => (
              <article className="rounded-lg bg-black/20 p-4" key={log.id}>
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-white">{formatDate(log.date)}</p>
                  <p className="font-bold text-[#d946ef]">
                    {Number(log.sleep_hours)}h
                  </p>
                </div>
                <p className="mt-2 text-sm text-zinc-400">
                  Quality {log.quality ?? "-"} / 5
                  {log.bedtime || log.wake_time
                    ? ` · ${log.bedtime ?? "--:--"} to ${log.wake_time ?? "--:--"}`
                    : ""}
                </p>
                {log.note ? (
                  <p className="mt-2 text-sm leading-6 text-zinc-500">
                    {log.note}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
