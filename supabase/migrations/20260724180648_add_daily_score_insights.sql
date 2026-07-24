alter table public.daily_profiles
  add column if not exists daily_score_insights text[] not null default array['calories', 'steps', 'sleep'];

alter table public.daily_profiles
  drop constraint if exists daily_profiles_daily_score_insights_check;

alter table public.daily_profiles
  add constraint daily_profiles_daily_score_insights_check
  check (
    cardinality(daily_score_insights) = 3
    and daily_score_insights <@ array['calories', 'protein', 'carbs', 'steps', 'water', 'sleep']::text[]
  );
