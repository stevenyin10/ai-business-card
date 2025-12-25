-- Create a dedicated survey table storing flexible JSON payload
-- Run this in Supabase SQL Editor.

create table if not exists public.survey (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  session_id text not null,
  user_id uuid not null,
  payload jsonb not null,
  schema_version int not null default 1
);

create index if not exists survey_session_id_idx on public.survey (session_id);
create index if not exists survey_user_id_created_at_idx on public.survey (user_id, created_at desc);

-- RLS: allow logged-in users to read their own surveys
alter table public.survey enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'survey'
      and policyname = 'survey_select_own'
  ) then
    create policy survey_select_own
      on public.survey
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

-- Optional: allow client inserts if you later decide to accept survey submissions
-- from the browser directly (not needed when using service role key).
--
-- do $$
-- begin
--   if not exists (
--     select 1
--     from pg_policies
--     where schemaname = 'public'
--       and tablename = 'survey'
--       and policyname = 'survey_insert_own'
--   ) then
--     create policy survey_insert_own
--       on public.survey
--       for insert
--       to authenticated
--       with check (auth.uid() = user_id);
--   end if;
-- end $$;
