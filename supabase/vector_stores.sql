-- Per-user OpenAI Vector Store mapping

create table if not exists public.user_vector_stores (
  user_id uuid primary key,
  vector_store_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_vector_stores_updated_at on public.user_vector_stores;
create trigger trg_user_vector_stores_updated_at
before update on public.user_vector_stores
for each row
execute function public.set_updated_at();

alter table public.user_vector_stores enable row level security;

-- Optional: allow authenticated users to read/write their own mapping
drop policy if exists "Users can read own vector store" on public.user_vector_stores;
create policy "Users can read own vector store"
  on public.user_vector_stores
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can upsert own vector store" on public.user_vector_stores;
create policy "Users can upsert own vector store"
  on public.user_vector_stores
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own vector store" on public.user_vector_stores;
create policy "Users can update own vector store"
  on public.user_vector_stores
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
