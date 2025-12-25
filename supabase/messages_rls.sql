-- Allow authenticated users (agents) to insert messages
-- Run this in Supabase SQL Editor.

-- 1. Enable RLS on messages if not already enabled (it likely is)
alter table public.messages enable row level security;

-- 2. Create policy to allow INSERT if the user_id matches the authenticated user
-- This allows the agent to insert messages where they are the owner.
create policy "Users can insert their own messages"
on public.messages
for insert
to authenticated
with check (auth.uid() = user_id);

-- 3. Ensure users can also SELECT their own messages (if not already set)
-- create policy "Users can view their own messages"
-- on public.messages
-- for select
-- to authenticated
-- using (auth.uid() = user_id);
