import Link from "next/link";

const muscles = ["All", "Chest", "Back", "Shoulders", "Arms", "Legs", "Core"];

type MuscleFilterChipsProps = {
  basePath: string;
  current?: string;
  query?: string;
};

export function MuscleFilterChips({
  basePath,
  current = "All",
  query = "",
}: MuscleFilterChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {muscles.map((muscle) => {
        const params = new URLSearchParams();
        if (muscle !== "All") {
          params.set("muscle", muscle);
        }
        if (query) {
          params.set("q", query);
        }
        const href = params.toString() ? `${basePath}?${params}` : basePath;
        const active = current === muscle || (!current && muscle === "All");

        return (
          <Link
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
              active
                ? "bg-[var(--accent)] text-[var(--on-accent)]"
                : "border border-white/10 bg-[var(--surface)] text-zinc-300"
            }`}
            href={href}
            key={muscle}
          >
            {muscle}
          </Link>
        );
      })}
    </div>
  );
}
