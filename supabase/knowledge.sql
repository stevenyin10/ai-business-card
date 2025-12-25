-- Enable pgvector extension to work with embeddings
create extension if not exists vector;

-- Create table to store agent's knowledge base
create table if not exists public.agent_knowledge (
  id bigserial primary key,
  user_id uuid not null,
  content text not null,
  embedding vector(1536), -- OpenAI text-embedding-3-small output dimension
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.agent_knowledge enable row level security;

-- Allow agents to manage their own knowledge
create policy "Agents can manage their own knowledge"
  on public.agent_knowledge
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Create a function to search for similar knowledge
create or replace function match_agent_knowledge (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_user_id uuid
)
returns table (
  id bigint,
  content text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    agent_knowledge.id,
    agent_knowledge.content,
    1 - (agent_knowledge.embedding <=> query_embedding) as similarity
  from agent_knowledge
  where agent_knowledge.user_id = filter_user_id
  and 1 - (agent_knowledge.embedding <=> query_embedding) > match_threshold
  order by agent_knowledge.embedding <=> query_embedding
  limit match_count;
end;
$$;
