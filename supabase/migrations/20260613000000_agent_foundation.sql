-- Phase 1 — Agent foundation (applied to yrlnvtiuonrjkvdoievj via Supabase MCP 2026-06-13).
-- Spec: docs/estrategia-agentes-kozegho.md §4 Phase 1.
-- Reconciliations vs spec (production reality wins):
--   * tasks.source already existed (default 'manual', domain manual/ai_extracted/gmail_detected).
--     Extended the domain to add 'user' and 'agent'; default set to 'user' per spec. Existing rows kept.
--   * Manager RLS already existed as inline EXISTS(...) policies (managers_see_all_proposals/customers).
--     Consolidated onto the is_manager() SECURITY DEFINER helper the spec specifies.
--     relationship_scores.managers_see_all_scores left as-is (out of this phase's scope).

-- ========== Extensions ==========
create extension if not exists vector;
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ========== agent_runs: logging of all agent executions (audit + costs) ==========
create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent_name text not null,
  trigger_type text not null,
  input jsonb,
  output jsonb,
  status text not null default 'running',
  error text,
  model text,
  input_tokens int,
  output_tokens int,
  cost_usd numeric(10,5),
  duration_ms int,
  feedback smallint,
  created_at timestamptz not null default now()
);
alter table public.agent_runs enable row level security;

-- ========== proposal_embeddings: vector memory (gte-small = 384 dims) ==========
create table if not exists public.proposal_embeddings (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  content text not null,
  embedding vector(384),
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index if not exists proposal_embeddings_embedding_hnsw
  on public.proposal_embeddings using hnsw (embedding vector_cosine_ops);
alter table public.proposal_embeddings enable row level security;

-- ========== daily_briefings: server-side generated briefings ==========
create table if not exists public.daily_briefings (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id),
  briefing jsonb not null,
  briefing_date date not null,
  created_at timestamptz not null default now(),
  unique (profile_id, briefing_date)
);
alter table public.daily_briefings enable row level security;
drop policy if exists "briefings_own" on public.daily_briefings;
create policy "briefings_own" on public.daily_briefings
  for select using (auth.uid() = profile_id);

-- ========== tasks.source reconciliation (existing taxonomy extended with 'user'|'agent') ==========
update public.tasks set source = 'user' where source is null;
alter table public.tasks drop constraint if exists tasks_source_check;
alter table public.tasks add constraint tasks_source_check
  check (source = any (array['user','manual','ai_extracted','gmail_detected','agent']));
alter table public.tasks alter column source set default 'user';
alter table public.tasks alter column source set not null;

-- ========== is_manager() SECURITY DEFINER + manager SELECT policies ==========
create or replace function public.is_manager()
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'manager');
$$;

drop policy if exists managers_see_all_proposals on public.proposals;
drop policy if exists proposals_manager_select on public.proposals;
create policy "proposals_manager_select" on public.proposals
  for select using (public.is_manager());

drop policy if exists managers_see_all_customers on public.customers;
drop policy if exists customers_manager_select on public.customers;
create policy "customers_manager_select" on public.customers
  for select using (public.is_manager());

drop policy if exists agent_runs_manager_select on public.agent_runs;
create policy "agent_runs_manager_select" on public.agent_runs
  for select using (public.is_manager());

-- ========== Scheduling pattern: pg_cron -> pg_net -> Edge Function (service key from Vault) ==========
-- Requires the service role key stored in Vault under name 'service_role_key'.
-- (Run separately, not re-applied idempotently here; recorded for repo history.)
-- select cron.schedule(
--   'embed-proposals-daily', '0 5 * * *',   -- 05:00 UTC (~06:00 Lisbon, summer)
--   $$ select net.http_post(
--        url     := 'https://yrlnvtiuonrjkvdoievj.supabase.co/functions/v1/embed-proposals',
--        headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'), 'Content-Type', 'application/json'),
--        body    := '{"trigger":"cron"}'::jsonb
--      ); $$
-- );
