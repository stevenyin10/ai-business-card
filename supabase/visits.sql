-- Track homepage loads (visits) by session_id
-- Run this in Supabase SQL Editor.

create table if not exists public.visits (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  session_id text not null,
  user_id uuid not null,
  path text not null default '/',
  user_agent text null,
  referrer text null
);

create index if not exists visits_user_id_created_at_idx on public.visits (user_id, created_at desc);
create index if not exists visits_session_id_created_at_idx on public.visits (session_id, created_at desc);

alter table public.visits enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'visits'
      and policyname = 'visits_select_own'
  ) then
    create policy visits_select_own
      on public.visits
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;
