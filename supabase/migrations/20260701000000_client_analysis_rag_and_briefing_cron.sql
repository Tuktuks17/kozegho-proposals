-- Phase 3 — Server-side Briefing + Client Analysis RAG (applied to yrlnvtiuonrjkvdoievj via MCP).
-- Spec: docs/estrategia-agentes-kozegho.md §4 Phase 3.

-- pgvector cosine similarity over proposal_embeddings for the Client Analysis RAG.
-- query_embedding is passed as a bracketed string ('[f1,...]') to avoid PostgREST vector binding issues.
create or replace function public.match_proposal_embeddings(
  query_embedding text,
  match_count int default 8,
  only_customer uuid default null,
  exclude_customer uuid default null
) returns table (
  proposal_id uuid,
  content text,
  metadata jsonb,
  similarity double precision
) language sql stable security definer set search_path = public as $$
  select pe.proposal_id, pe.content, pe.metadata,
         1 - (pe.embedding <=> query_embedding::vector(384)) as similarity
  from public.proposal_embeddings pe
  join public.proposals p on p.id = pe.proposal_id
  where pe.embedding is not null
    and (only_customer is null or p.customer_id = only_customer)
    and (exclude_customer is null or p.customer_id <> exclude_customer)
  order by pe.embedding <=> query_embedding::vector(384)
  limit match_count;
$$;

-- Daily Briefing cron (recorded for repo history; scheduled via cron.schedule through MCP).
-- 06:00 UTC = 07:00 Lisbon (summer/WEST). agent-briefing generates a per-profile briefing into
-- daily_briefings (managers = full portfolio, salespersons = own book).
-- select cron.schedule(
--   'agent-briefing-daily', '0 6 * * *',
--   $$ select net.http_post(
--        url     := 'https://yrlnvtiuonrjkvdoievj.supabase.co/functions/v1/agent-briefing',
--        headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'), 'Content-Type', 'application/json'),
--        body    := '{"trigger":"cron"}'::jsonb,
--        timeout_milliseconds := 150000
--      ); $$
-- );
