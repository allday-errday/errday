"use client";

import { Droplets, GlassWater } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "@/components/toaster";
import { logWater } from "../actions";

const initialWaterLogState = { completedAt: null, error: null };

export function WaterLogButtons() {
  const [state, formAction, isPending] = useActionState(
    logWater,
    initialWaterLogState,
  );
  const [cooldownTick, setCooldownTick] = useState(0);
  const lockRef = useRef(false);
  const cooldownTimer = useRef<number | null>(null);
  const isCoolingDown =
    state.completedAt !== null && cooldownTick < state.completedAt + 3_000;
  const isLocked = isPending || isCoolingDown;

  useEffect(() => {
    if (state.completedAt === null) return;

    toast("Water logged");
    cooldownTimer.current = window.setTimeout(() => {
      lockRef.current = false;
      setCooldownTick(Date.now());
    }, 3_000);
  }, [state.completedAt]);

  useEffect(() => {
    if (!state.error) return;
    lockRef.current = false;
    toast(state.error);
  }, [state.error]);

  useEffect(
    () => () => {
      if (cooldownTimer.current !== null) {
        window.clearTimeout(cooldownTimer.current);
      }
    },
    [],
  );

  return (
    <section className="apple-group p-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-cyan-300/10 text-cyan-200">
            <Droplets aria-hidden="true" className="size-4" />
          </span>
          <h2 className="text-base font-bold text-white">Water</h2>
        </div>
        <form
          action={formAction}
          className="flex items-center gap-1.5 text-sm font-semibold"
          onSubmit={(event) => {
            if (lockRef.current || isPending) {
              event.preventDefault();
              return;
            }
            lockRef.current = true;
          }}
        >
          {[250, 500].map((amount) => (
            <button
              className="flex min-h-9 items-center gap-1.5 rounded-lg bg-[var(--surface-2)] px-2.5 text-sm font-semibold text-zinc-200 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
              disabled={isLocked}
              key={amount}
              name="amount_ml"
              type="submit"
              value={amount}
            >
              <GlassWater aria-hidden="true" className={amount === 500 ? "size-4" : "size-3.5"} />
              {amount} ml
            </button>
          ))}
        </form>
      </div>
    </section>
  );
}
