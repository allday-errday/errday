import { CalendarDays, ChevronRight, Moon, NotebookPen } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";

const destinations = [
  { href: "/sleep", icon: Moon, label: "Sleep" },
  { href: "/journal", icon: NotebookPen, label: "Journal" },
  { href: "/calendar", icon: CalendarDays, label: "Calendar" },
];

export default async function PlanPage() {
  await requireUser();

  return (
    <div className="max-w-2xl">
      <PageHeader title="Plan" />
      <nav aria-label="Plan tools" className="border-y border-[var(--border)]">
        {destinations.map((destination) => {
          const Icon = destination.icon;

          return (
            <Link
              className="flex min-h-20 items-center gap-4 border-b border-[var(--border)] last:border-b-0"
              href={destination.href}
              key={destination.href}
            >
              <span className="grid size-10 place-items-center rounded-lg bg-[var(--surface-2)] text-[var(--accent)]">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <span className="flex-1 text-base font-semibold text-white">{destination.label}</span>
              <ChevronRight aria-hidden="true" className="size-5 text-zinc-500" />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
