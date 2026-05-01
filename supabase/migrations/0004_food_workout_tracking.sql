create table public.food_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete cascade,
  name text not null,
  brand text null,
  calories_per_serving integer not null check (calories_per_serving >= 0),
  protein_g numeric not null default 0 check (protein_g >= 0),
  carbs_g numeric not null default 0 check (carbs_g >= 0),
  fat_g numeric not null default 0 check (fat_g >= 0),
  serving_label text not null default '1 serving',
  image_url text null,
  created_at timestamptz not null default now()
);

create table public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  food_item_id uuid not null references public.food_items(id) on delete restrict,
  logged_at timestamptz not null default now(),
  servings numeric not null default 1 check (servings > 0),
  calories integer not null default 0 check (calories >= 0),
  protein_g numeric not null default 0 check (protein_g >= 0),
  carbs_g numeric not null default 0 check (carbs_g >= 0),
  fat_g numeric not null default 0 check (fat_g >= 0),
  created_at timestamptz not null default now()
);

alter table public.workout_templates
  alter column user_id drop not null,
  add column if not exists category text not null default 'strength',
  add column if not exists image_url text null,
  add column if not exists estimated_minutes integer not null default 45 check (estimated_minutes > 0),
  add column if not exists estimated_calories integer null check (estimated_calories >= 0);

create table public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_template_id uuid null references public.workout_templates(id) on delete set null,
  name text not null,
  category text not null default 'strength',
  duration_minutes integer not null default 0 check (duration_minutes >= 0),
  calories_burned integer not null default 0 check (calories_burned >= 0),
  logged_at timestamptz not null default now(),
  notes text null,
  created_at timestamptz not null default now()
);

create table public.nutrition_targets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  sex text null check (sex in ('male', 'female')),
  birthdate date null,
  height_cm numeric null check (height_cm > 0),
  weight_kg numeric null check (weight_kg > 0),
  activity_level text null check (activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active', 'athlete')),
  goal text null check (goal in ('lose', 'maintain', 'gain')),
  daily_calorie_target integer null check (daily_calorie_target > 0),
  daily_protein_target_g integer null check (daily_protein_target_g > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.food_items enable row level security;
alter table public.food_logs enable row level security;
alter table public.workout_logs enable row level security;
alter table public.nutrition_targets enable row level security;

create policy "Food items are selectable by owner or global"
on public.food_items for select
to authenticated
using (user_id is null or user_id = auth.uid());

create policy "Food items are insertable by owner"
on public.food_items for insert
to authenticated
with check (user_id = auth.uid());

create policy "Food items are updateable by owner"
on public.food_items for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Food items are deletable by owner"
on public.food_items for delete
to authenticated
using (user_id = auth.uid());

create policy "Food logs are selectable by owner"
on public.food_logs for select
to authenticated
using (user_id = auth.uid());

create policy "Food logs are insertable by owner"
on public.food_logs for insert
to authenticated
with check (user_id = auth.uid());

create policy "Food logs are updateable by owner"
on public.food_logs for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Food logs are deletable by owner"
on public.food_logs for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "Workout templates are selectable by owner" on public.workout_templates;
drop policy if exists "Workout templates are insertable by owner" on public.workout_templates;
drop policy if exists "Workout templates are updateable by owner" on public.workout_templates;
drop policy if exists "Workout templates are deletable by owner" on public.workout_templates;

create policy "Workout templates are selectable by owner or global"
on public.workout_templates for select
to authenticated
using (user_id is null or user_id = auth.uid());

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

create policy "Workout logs are selectable by owner"
on public.workout_logs for select
to authenticated
using (user_id = auth.uid());

create policy "Workout logs are insertable by owner"
on public.workout_logs for insert
to authenticated
with check (user_id = auth.uid());

create policy "Workout logs are updateable by owner"
on public.workout_logs for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Workout logs are deletable by owner"
on public.workout_logs for delete
to authenticated
using (user_id = auth.uid());

create policy "Nutrition targets are selectable by owner"
on public.nutrition_targets for select
to authenticated
using (user_id = auth.uid());

create policy "Nutrition targets are insertable by owner"
on public.nutrition_targets for insert
to authenticated
with check (user_id = auth.uid());

create policy "Nutrition targets are updateable by owner"
on public.nutrition_targets for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

grant select, insert, update, delete on public.food_items to authenticated;
grant select, insert, update, delete on public.food_logs to authenticated;
grant select, insert, update, delete on public.workout_templates to authenticated;
grant select, insert, update, delete on public.workout_logs to authenticated;
grant select, insert, update on public.nutrition_targets to authenticated;

create trigger set_nutrition_targets_updated_at
before update on public.nutrition_targets
for each row execute function public.set_updated_at();

insert into public.food_items
  (user_id, name, brand, calories_per_serving, protein_g, carbs_g, fat_g, serving_label, image_url)
values
  (null, 'Greek Yogurt Bowl', 'Errday Base', 220, 24, 18, 4, '1 bowl', 'https://placehold.co/400x300/0b0b10/d946ef?text=Yogurt'),
  (null, 'Chicken Rice Bowl', 'Errday Base', 640, 48, 72, 14, '1 bowl', 'https://placehold.co/400x300/0b0b10/d946ef?text=Chicken+Rice'),
  (null, 'Protein Shake', 'Errday Base', 180, 32, 6, 3, '1 shake', 'https://placehold.co/400x300/0b0b10/d946ef?text=Shake'),
  (null, 'Oats with Banana', 'Errday Base', 410, 16, 70, 9, '1 bowl', 'https://placehold.co/400x300/0b0b10/d946ef?text=Oats'),
  (null, 'Salmon Plate', 'Errday Base', 590, 42, 38, 28, '1 plate', 'https://placehold.co/400x300/0b0b10/d946ef?text=Salmon'),
  (null, 'Eggs and Toast', 'Errday Base', 460, 26, 36, 24, '1 plate', 'https://placehold.co/400x300/0b0b10/d946ef?text=Eggs'),
  (null, 'Tuna Wrap', 'Errday Base', 390, 34, 42, 10, '1 wrap', 'https://placehold.co/400x300/0b0b10/d946ef?text=Tuna+Wrap'),
  (null, 'Lean Beef Pasta', 'Errday Base', 720, 52, 82, 18, '1 bowl', 'https://placehold.co/400x300/0b0b10/d946ef?text=Beef+Pasta'),
  (null, 'Cottage Cheese', 'Errday Base', 160, 26, 8, 3, '200 g', 'https://placehold.co/400x300/0b0b10/d946ef?text=Cottage'),
  (null, 'Avocado Toast', 'Errday Base', 340, 11, 36, 18, '2 slices', 'https://placehold.co/400x300/0b0b10/d946ef?text=Avocado')
on conflict do nothing;

insert into public.workout_templates
  (user_id, name, category, description, image_url, estimated_minutes, estimated_calories)
values
  (null, 'Push Day', 'push', 'Chest, shoulders and triceps strength session.', 'https://placehold.co/400x300/0b0b10/d946ef?text=Push', 60, 420),
  (null, 'Pull Day', 'pull', 'Back, rear delts and biceps.', 'https://placehold.co/400x300/0b0b10/d946ef?text=Pull', 60, 430),
  (null, 'Leg Day', 'legs', 'Quads, hamstrings, glutes and calves.', 'https://placehold.co/400x300/0b0b10/d946ef?text=Legs', 55, 500),
  (null, 'Upper Body', 'upper', 'Balanced upper-body hypertrophy.', 'https://placehold.co/400x300/0b0b10/d946ef?text=Upper', 65, 460),
  (null, 'Lower Body', 'lower', 'Squat and hinge focused lower session.', 'https://placehold.co/400x300/0b0b10/d946ef?text=Lower', 55, 480),
  (null, 'Full Body', 'full_body', 'Efficient all-round strength day.', 'https://placehold.co/400x300/0b0b10/d946ef?text=Full+Body', 50, 440),
  (null, 'Core Circuit', 'core', 'Abs, bracing and trunk control.', 'https://placehold.co/400x300/0b0b10/d946ef?text=Core', 25, 180),
  (null, 'Zone 2 Cardio', 'cardio', 'Low-intensity steady cardio.', 'https://placehold.co/400x300/0b0b10/d946ef?text=Cardio', 40, 320),
  (null, 'HIIT Conditioning', 'conditioning', 'Short, hard conditioning intervals.', 'https://placehold.co/400x300/0b0b10/d946ef?text=HIIT', 25, 300),
  (null, 'Mobility Reset', 'mobility', 'Light mobility and recovery work.', 'https://placehold.co/400x300/0b0b10/d946ef?text=Mobility', 20, 90)
on conflict do nothing;
