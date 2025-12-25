-- Create table to control session settings (e.g. auto-reply)
-- Run this in Supabase SQL Editor.

create table if not exists public.session_controls (
  session_id text primary key,
  auto_reply_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.session_controls enable row level security;

-- Allow authenticated users (agents) to select/insert/update
create policy "Agents can manage session controls"
  on public.session_controls
  for all
  to authenticated
  using (true)
  with check (true);

-- Allow anon users (public) to read (so the API can check it, though API uses service role usually)
-- If API uses service role, we don't strictly need public read, but it doesn't hurt for debugging.
create policy "Public can read session controls"
  on public.session_controls
  for select
  to anon
  using (true);
