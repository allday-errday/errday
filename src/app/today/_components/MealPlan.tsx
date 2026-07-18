import Link from "next/link";
import type { MealSlot } from "@/types/database";

const meals: Array<{ label: string; slot: MealSlot }> = [
  { label: "Breakfast", slot: "breakfast" },
  { label: "Lunch", slot: "lunch" },
  { label: "Dinner", slot: "dinner" },
];

export function MealPlan({ loggedSlots }: { loggedSlots: MealSlot[] }) {
  return (
    <section className="border-t border-[var(--border)] pt-5 sm:pt-6">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {meals.map((meal) => {
          const logged = loggedSlots.includes(meal.slot);

          return (
            <Link
              className={`flex min-h-14 items-center justify-center rounded-xl border px-2 text-center text-sm font-extrabold transition ${
                logged
                  ? "border-[var(--accent)]/55 bg-[var(--accent-soft)] text-white"
                  : "border-[var(--border)] bg-[var(--surface)] text-zinc-400 hover:border-[var(--accent)]/50 hover:text-white"
              }`}
              href={`/food/search?slot=${meal.slot}`}
              key={meal.slot}
            >
              {meal.label}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
