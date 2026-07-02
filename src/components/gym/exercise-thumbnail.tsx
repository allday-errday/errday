"use client";

import { useState } from "react";

type ExerciseThumbnailProps = {
  imageKey?: string | null;
  name: string;
};

export function ExerciseThumbnail({ imageKey, name }: ExerciseThumbnailProps) {
  const [imageFailed, setImageFailed] = useState(false);

  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Bundled illustration photos live in /public/exercises/<slug>.jpg
  // (free-exercise-db, public domain). Custom exercises fall back to initials.
  if (imageKey && !imageFailed) {
    return (
      <div className="size-12 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-[#ffffff]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={name}
          className="size-full object-cover object-top"
          loading="lazy"
          onError={() => setImageFailed(true)}
          src={`/exercises/${imageKey}.jpg`}
        />
      </div>
    );
  }

  return (
    <div className="grid size-12 shrink-0 place-items-center rounded-lg border border-white/10 bg-[var(--surface)] text-xs font-bold text-[var(--accent)] shadow-inner shadow-black">
      <span aria-label={imageKey ?? name}>{initials}</span>
    </div>
  );
}
