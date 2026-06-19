do $$
begin
  if to_regclass('public.workout_templates') is null then
    raise exception 'Missing public.workout_templates. Apply 0003_gym_exercise_library.sql and 0004_food_workout_tracking.sql before 0007_workout_programs.sql.';
  end if;
end;
$$;

create table if not exists public.workout_programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text null,
  image_url text null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A routine (workout_template) can belong to a program and has an order within it.
alter table public.workout_templates
  add column if not exists program_id uuid null references public.workout_programs(id) on delete cascade,
  add column if not exists position integer not null default 0;

create index if not exists workout_templates_program_id_idx
  on public.workout_templates (program_id);

alter table public.workout_programs enable row level security;

create policy "Workout programs are selectable by owner"
on public.workout_programs for select
to authenticated
using (user_id = auth.uid());

create policy "Workout programs are insertable by owner"
on public.workout_programs for insert
to authenticated
with check (user_id = auth.uid());

create policy "Workout programs are updateable by owner"
on public.workout_programs for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Workout programs are deletable by owner"
on public.workout_programs for delete
to authenticated
using (user_id = auth.uid());

grant select, insert, update, delete on public.workout_programs to authenticated;

create trigger set_workout_programs_updated_at
before update on public.workout_programs
for each row execute function public.set_updated_at();
