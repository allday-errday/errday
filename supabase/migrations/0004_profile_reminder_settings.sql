alter table public.profiles
add column if not exists reminders_enabled boolean null default false,
add column if not exists meal_reminder_time time null,
add column if not exists supplement_reminder_time time null,
add column if not exists gym_reminder_time time null,
add column if not exists gym_rest_end_reminder_enabled boolean null default false,
add column if not exists sleep_reminder_time time null,
add column if not exists journal_reminder_time time null;
