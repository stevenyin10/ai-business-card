-- supabase/survey_settings.sql
-- Per-user survey form settings (labels/toggles)

create table if not exists public.user_survey_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  form jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_survey_settings enable row level security;

-- Policies
drop policy if exists "read own survey settings" on public.user_survey_settings;
create policy "read own survey settings"
on public.user_survey_settings
for select
using (auth.uid() = user_id);

drop policy if exists "insert own survey settings" on public.user_survey_settings;
create policy "insert own survey settings"
on public.user_survey_settings
for insert
with check (auth.uid() = user_id);

drop policy if exists "update own survey settings" on public.user_survey_settings;
create policy "update own survey settings"
on public.user_survey_settings
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_survey_settings_updated_at on public.user_survey_settings;
create trigger trg_user_survey_settings_updated_at
before update on public.user_survey_settings
for each row
execute function public.set_updated_at();
