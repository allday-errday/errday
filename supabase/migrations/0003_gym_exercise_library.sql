create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null,
  primary_muscle text not null,
  secondary_muscles text[] not null default '{}',
  equipment text not null default 'bodyweight',
  category text not null default 'strength',
  instructions text null,
  image_key text null,
  is_custom boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index exercises_global_slug_key
on public.exercises (slug)
where user_id is null;

create unique index exercises_user_slug_key
on public.exercises (user_id, slug)
where user_id is not null;

create table public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text null,
  created_at timestamptz not null default now()
);

create table public.workout_template_exercises (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.workout_templates(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  position integer not null default 0,
  target_sets integer not null default 3,
  target_reps text null,
  note text null,
  created_at timestamptz not null default now()
);

create table public.active_workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_id uuid null references public.workouts(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz null,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  position integer not null default 0,
  target_sets integer not null default 4,
  target_reps text null,
  note text null,
  created_at timestamptz not null default now(),
  unique (workout_id, exercise_id)
);

alter table public.workout_sets
add column if not exists exercise_id uuid null references public.exercises(id) on delete set null;

alter table public.exercises enable row level security;
alter table public.workout_templates enable row level security;
alter table public.workout_template_exercises enable row level security;
alter table public.active_workout_sessions enable row level security;
alter table public.workout_exercises enable row level security;

create policy "Exercises are selectable by authenticated users"
on public.exercises for select
to authenticated
using (user_id is null or user_id = auth.uid());

create policy "Custom exercises are insertable by owner"
on public.exercises for insert
to authenticated
with check (user_id = auth.uid() and is_custom = true);

create policy "Custom exercises are updateable by owner"
on public.exercises for update
to authenticated
using (user_id = auth.uid() and is_custom = true)
with check (user_id = auth.uid() and is_custom = true);

create policy "Custom exercises are deletable by owner"
on public.exercises for delete
to authenticated
using (user_id = auth.uid() and is_custom = true);

create policy "Workout templates are selectable by owner"
on public.workout_templates for select
to authenticated
using (user_id = auth.uid());

create policy "Workout templates are insertable by owner"
on public.workout_templates for insert
to authenticated
with check (user_id = auth.uid());

create policy "Workout templates are updateable by owner"
on public.workout_templates for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Workout templates are deletable by owner"
on public.workout_templates for delete
to authenticated
using (user_id = auth.uid());

create policy "Workout template exercises are selectable by template owner"
on public.workout_template_exercises for select
to authenticated
using (
  exists (
    select 1 from public.workout_templates
    where workout_templates.id = workout_template_exercises.template_id
    and workout_templates.user_id = auth.uid()
  )
);

create policy "Workout template exercises are insertable by template owner"
on public.workout_template_exercises for insert
to authenticated
with check (
  exists (
    select 1 from public.workout_templates
    where workout_templates.id = workout_template_exercises.template_id
    and workout_templates.user_id = auth.uid()
  )
);

create policy "Workout template exercises are updateable by template owner"
on public.workout_template_exercises for update
to authenticated
using (
  exists (
    select 1 from public.workout_templates
    where workout_templates.id = workout_template_exercises.template_id
    and workout_templates.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.workout_templates
    where workout_templates.id = workout_template_exercises.template_id
    and workout_templates.user_id = auth.uid()
  )
);

create policy "Workout template exercises are deletable by template owner"
on public.workout_template_exercises for delete
to authenticated
using (
  exists (
    select 1 from public.workout_templates
    where workout_templates.id = workout_template_exercises.template_id
    and workout_templates.user_id = auth.uid()
  )
);

create policy "Active workout sessions are selectable by owner"
on public.active_workout_sessions for select
to authenticated
using (user_id = auth.uid());

create policy "Active workout sessions are insertable by owner"
on public.active_workout_sessions for insert
to authenticated
with check (user_id = auth.uid());

create policy "Active workout sessions are updateable by owner"
on public.active_workout_sessions for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Active workout sessions are deletable by owner"
on public.active_workout_sessions for delete
to authenticated
using (user_id = auth.uid());

create policy "Workout exercises are selectable by owner"
on public.workout_exercises for select
to authenticated
using (user_id = auth.uid());

create policy "Workout exercises are insertable by owner"
on public.workout_exercises for insert
to authenticated
with check (user_id = auth.uid());

create policy "Workout exercises are updateable by owner"
on public.workout_exercises for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Workout exercises are deletable by owner"
on public.workout_exercises for delete
to authenticated
using (user_id = auth.uid());

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.exercises to authenticated;
grant select, insert, update, delete on public.workout_templates to authenticated;
grant select, insert, update, delete on public.workout_template_exercises to authenticated;
grant select, insert, update, delete on public.active_workout_sessions to authenticated;
grant select, insert, update, delete on public.workout_exercises to authenticated;
grant select, insert, update, delete on public.workout_sets to authenticated;

insert into public.exercises
  (user_id, name, slug, primary_muscle, secondary_muscles, equipment, category, instructions, image_key, is_custom)
values
  (null, 'Bench Press', 'bench-press', 'Chest', array['Triceps', 'Shoulders'], 'barbell', 'strength', 'Lie on the bench, lower the bar under control, and press it back up with a stable upper back.', 'bench-press', false),
  (null, 'Incline Bench Press', 'incline-bench-press', 'Chest', array['Triceps', 'Shoulders'], 'barbell', 'strength', 'Set the bench on an incline and press the bar while keeping elbows controlled.', 'incline-bench-press', false),
  (null, 'Dumbbell Bench Press', 'dumbbell-bench-press', 'Chest', array['Triceps', 'Shoulders'], 'dumbbell', 'strength', 'Press dumbbells from chest level while keeping wrists stacked and shoulder blades set.', 'dumbbell-bench-press', false),
  (null, 'Incline Dumbbell Press', 'incline-dumbbell-press', 'Chest', array['Triceps', 'Shoulders'], 'dumbbell', 'strength', 'Press dumbbells on an incline bench with a controlled lower and strong lockout.', 'incline-dumbbell-press', false),
  (null, 'Chest Press Machine', 'chest-press-machine', 'Chest', array['Triceps', 'Shoulders'], 'machine', 'strength', 'Adjust the seat, press handles forward, and return with control.', 'chest-press-machine', false),
  (null, 'Cable Fly', 'cable-fly', 'Chest', array['Shoulders'], 'cable', 'strength', 'Bring cable handles together in an arc while keeping a soft bend in the elbows.', 'cable-fly', false),
  (null, 'Push-Up', 'push-up', 'Chest', array['Triceps', 'Shoulders', 'Core'], 'bodyweight', 'strength', 'Keep a straight body line, lower to the floor, and press back up.', 'push-up', false),
  (null, 'Pull-Up', 'pull-up', 'Back', array['Biceps'], 'bodyweight', 'strength', 'Pull your chest toward the bar, then lower under control.', 'pull-up', false),
  (null, 'Lat Pulldown', 'lat-pulldown', 'Back', array['Biceps'], 'cable', 'strength', 'Pull the bar toward the upper chest while driving elbows down.', 'lat-pulldown', false),
  (null, 'Barbell Row', 'barbell-row', 'Back', array['Biceps', 'Rear Delts'], 'barbell', 'strength', 'Hinge at the hips and row the bar toward your torso.', 'barbell-row', false),
  (null, 'Seated Cable Row', 'seated-cable-row', 'Back', array['Biceps', 'Rear Delts'], 'cable', 'strength', 'Row the handle toward your torso while keeping the chest tall.', 'seated-cable-row', false),
  (null, 'Dumbbell Row', 'dumbbell-row', 'Back', array['Biceps', 'Rear Delts'], 'dumbbell', 'strength', 'Support your body and row the dumbbell toward your hip.', 'dumbbell-row', false),
  (null, 'Deadlift', 'deadlift', 'Back', array['Hamstrings', 'Glutes', 'Core'], 'barbell', 'strength', 'Brace, push through the floor, and stand tall with the bar close.', 'deadlift', false),
  (null, 'Shoulder Press', 'shoulder-press', 'Shoulders', array['Triceps'], 'barbell', 'strength', 'Press the bar overhead while keeping ribs down and core braced.', 'shoulder-press', false),
  (null, 'Dumbbell Shoulder Press', 'dumbbell-shoulder-press', 'Shoulders', array['Triceps'], 'dumbbell', 'strength', 'Press dumbbells overhead from shoulder height with control.', 'dumbbell-shoulder-press', false),
  (null, 'Lateral Raise', 'lateral-raise', 'Shoulders', array[]::text[], 'dumbbell', 'strength', 'Raise dumbbells out to the sides to shoulder height with soft elbows.', 'lateral-raise', false),
  (null, 'Rear Delt Fly', 'rear-delt-fly', 'Shoulders', array['Upper Back'], 'dumbbell', 'strength', 'Hinge forward and raise weights out wide to target rear delts.', 'rear-delt-fly', false),
  (null, 'Face Pull', 'face-pull', 'Shoulders', array['Upper Back'], 'cable', 'strength', 'Pull the rope toward your face with elbows high and shoulder blades moving.', 'face-pull', false),
  (null, 'Biceps Curl', 'biceps-curl', 'Arms', array['Biceps'], 'dumbbell', 'strength', 'Curl the weight up without swinging, then lower fully.', 'biceps-curl', false),
  (null, 'Hammer Curl', 'hammer-curl', 'Arms', array['Biceps', 'Forearms'], 'dumbbell', 'strength', 'Curl with neutral wrists and controlled elbows.', 'hammer-curl', false),
  (null, 'Triceps Pushdown', 'triceps-pushdown', 'Arms', array['Triceps'], 'cable', 'strength', 'Push the cable down until elbows are extended, then return with control.', 'triceps-pushdown', false),
  (null, 'Overhead Triceps Extension', 'overhead-triceps-extension', 'Arms', array['Triceps'], 'dumbbell', 'strength', 'Lower the weight behind your head and extend elbows overhead.', 'overhead-triceps-extension', false),
  (null, 'Skull Crusher', 'skull-crusher', 'Arms', array['Triceps'], 'barbell', 'strength', 'Lower the bar toward your forehead and extend elbows without flaring.', 'skull-crusher', false),
  (null, 'Squat', 'squat', 'Legs', array['Glutes', 'Core'], 'barbell', 'strength', 'Brace, sit between your hips, and drive back up through the floor.', 'squat', false),
  (null, 'Leg Press', 'leg-press', 'Legs', array['Glutes'], 'machine', 'strength', 'Lower the sled with control and press through the platform.', 'leg-press', false),
  (null, 'Romanian Deadlift', 'romanian-deadlift', 'Legs', array['Hamstrings', 'Glutes'], 'barbell', 'strength', 'Hinge at the hips, keep the bar close, and feel the hamstrings load.', 'romanian-deadlift', false),
  (null, 'Leg Curl', 'leg-curl', 'Legs', array['Hamstrings'], 'machine', 'strength', 'Curl the pad toward you and return slowly.', 'leg-curl', false),
  (null, 'Leg Extension', 'leg-extension', 'Legs', array['Quads'], 'machine', 'strength', 'Extend knees to lift the pad, then lower with control.', 'leg-extension', false),
  (null, 'Calf Raise', 'calf-raise', 'Legs', array['Calves'], 'machine', 'strength', 'Rise onto the balls of your feet and lower through a full range.', 'calf-raise', false),
  (null, 'Bulgarian Split Squat', 'bulgarian-split-squat', 'Legs', array['Glutes', 'Quads'], 'dumbbell', 'strength', 'Place one foot behind you and squat the front leg with control.', 'bulgarian-split-squat', false),
  (null, 'Hip Thrust', 'hip-thrust', 'Legs', array['Glutes', 'Hamstrings'], 'barbell', 'strength', 'Drive hips up from a bench setup and squeeze glutes at the top.', 'hip-thrust', false),
  (null, 'Plank', 'plank', 'Core', array['Abs'], 'bodyweight', 'strength', 'Hold a straight body line while bracing your core.', 'plank', false),
  (null, 'Hanging Leg Raise', 'hanging-leg-raise', 'Core', array['Hip Flexors'], 'bodyweight', 'strength', 'Hang from a bar and raise legs with controlled core tension.', 'hanging-leg-raise', false),
  (null, 'Cable Crunch', 'cable-crunch', 'Core', array['Abs'], 'cable', 'strength', 'Crunch down against the cable while keeping hips steady.', 'cable-crunch', false),
  (null, 'Ab Wheel Rollout', 'ab-wheel-rollout', 'Core', array['Abs', 'Shoulders'], 'bodyweight', 'strength', 'Roll forward under control and pull back using your core.', 'ab-wheel-rollout', false)
on conflict do nothing;
