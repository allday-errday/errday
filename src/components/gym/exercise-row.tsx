import { ExerciseThumbnail } from "@/components/gym/exercise-thumbnail";

type ExerciseRowProps = {
  equipment?: string | null;
  href?: string;
  imageKey?: string | null;
  name: string;
  primaryMuscle?: string | null;
  progressText?: string;
};

export function ExerciseRow({
  equipment,
  href,
  imageKey,
  name,
  primaryMuscle,
  progressText,
}: ExerciseRowProps) {
  const content = (
    <>
      <ExerciseThumbnail imageKey={imageKey} name={name} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-white">{name}</p>
        <p className="mt-1 truncate text-xs text-zinc-500">
          {progressText ?? [primaryMuscle, equipment].filter(Boolean).join(" / ")}
        </p>
      </div>
      <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
        <svg aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
          <path d="M12 5v14" /><path d="M5 12h14" />
        </svg>
      </div>
    </>
  );

  const className =
    "flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-[var(--surface)] p-3 text-left shadow-lg shadow-black/20 transition hover:border-white/20 hover:bg-[var(--surface)]";

  if (href) {
    return (
      <a className={className} href={href}>
        {content}
      </a>
    );
  }

  return <div className={className}>{content}</div>;
}
