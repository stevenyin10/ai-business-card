-- supabase/chat_settings.sql
-- Per-user chat system prompt settings

create table if not exists public.user_chat_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  system_prompt text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.user_chat_settings enable row level security;

-- Policies
drop policy if exists "read own chat settings" on public.user_chat_settings;
create policy "read own chat settings"
on public.user_chat_settings
for select
using (auth.uid() = user_id);

drop policy if exists "upsert own chat settings" on public.user_chat_settings;
create policy "upsert own chat settings"
on public.user_chat_settings
for insert
with check (auth.uid() = user_id);

drop policy if exists "update own chat settings" on public.user_chat_settings;
create policy "update own chat settings"
on public.user_chat_settings
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

drop trigger if exists trg_user_chat_settings_updated_at on public.user_chat_settings;
create trigger trg_user_chat_settings_updated_at
before update on public.user_chat_settings
for each row
execute function public.set_updated_at();
