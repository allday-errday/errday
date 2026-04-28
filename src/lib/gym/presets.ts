export type GymPreset = {
  description: string;
  durationMinutes: number;
  key: string;
  muscles: string[];
  name: string;
  slug: string;
  exerciseSlugs: string[];
};

export const gymPresets: GymPreset[] = [
  {
    key: "U",
    slug: "upper",
    name: "Upper",
    description: "Chest, back, shoulders and arms.",
    durationMinutes: 65,
    muscles: ["Chest", "Back", "Shoulders", "Arms"],
    exerciseSlugs: [
      "bench-press",
      "lat-pulldown",
      "shoulder-press",
      "seated-cable-row",
      "lateral-raise",
      "triceps-pushdown",
      "biceps-curl",
    ],
  },
  {
    key: "L",
    slug: "lower",
    name: "Lower",
    description: "Squat, hinge, press and calves.",
    durationMinutes: 55,
    muscles: ["Legs", "Core"],
    exerciseSlugs: [
      "squat",
      "romanian-deadlift",
      "leg-press",
      "leg-curl",
      "leg-extension",
      "calf-raise",
    ],
  },
  {
    key: "P",
    slug: "push",
    name: "Push",
    description: "Chest, shoulders and triceps.",
    durationMinutes: 60,
    muscles: ["Chest", "Shoulders", "Arms"],
    exerciseSlugs: [
      "bench-press",
      "incline-dumbbell-press",
      "shoulder-press",
      "lateral-raise",
      "triceps-pushdown",
    ],
  },
  {
    key: "P",
    slug: "pull",
    name: "Pull",
    description: "Back, rear delts and biceps.",
    durationMinutes: 60,
    muscles: ["Back", "Shoulders", "Arms"],
    exerciseSlugs: [
      "pull-up",
      "lat-pulldown",
      "barbell-row",
      "seated-cable-row",
      "face-pull",
      "hammer-curl",
    ],
  },
  {
    key: "L",
    slug: "legs",
    name: "Legs",
    description: "Quads, hamstrings, glutes and calves.",
    durationMinutes: 50,
    muscles: ["Legs"],
    exerciseSlugs: [
      "leg-press",
      "leg-extension",
      "romanian-deadlift",
      "leg-curl",
      "calf-raise",
      "hip-thrust",
    ],
  },
];

export function getGymPreset(slug?: string | null) {
  if (!slug) {
    return null;
  }

  return gymPresets.find((preset) => preset.slug === slug) ?? null;
}
