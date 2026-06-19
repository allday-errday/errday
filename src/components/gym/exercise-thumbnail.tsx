type ExerciseThumbnailProps = {
  imageKey?: string | null;
  name: string;
};

export function ExerciseThumbnail({ imageKey, name }: ExerciseThumbnailProps) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="grid size-12 shrink-0 place-items-center rounded-lg border border-white/10 bg-[var(--surface)] text-xs font-bold text-[var(--accent)] shadow-inner shadow-black">
      <span aria-label={imageKey ?? name}>{initials}</span>
    </div>
  );
}
