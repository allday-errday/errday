import Link from "next/link";
import type { MealSlot } from "@/types/database";

const meals: Array<{ label: string; slot: MealSlot }> = [
  { label: "Breakfast", slot: "breakfast" },
  { label: "Lunch", slot: "lunch" },
  { label: "Dinner", slot: "dinner" },
];

export function MealPlan({ loggedSlots }: { loggedSlots: MealSlot[] }) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-bold text-white">Meals</h2>
      <div className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
        {meals.map((meal) => {
          const logged = loggedSlots.includes(meal.slot);

          return (
            <Link
              className={`flex min-h-14 items-center justify-between px-1 text-sm font-bold transition ${
                logged
                  ? "text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
              href={`/food/search?slot=${meal.slot}`}
              key={meal.slot}
            >
              <span>{meal.label}</span>
              <span className="text-lg font-normal text-[var(--accent)]">{logged ? "✓" : "+"}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
