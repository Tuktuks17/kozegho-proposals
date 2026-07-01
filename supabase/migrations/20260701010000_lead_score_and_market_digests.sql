-- Phase 4 — Lead Qualification + Market Intelligence (applied to yrlnvtiuonrjkvdoievj via MCP).
-- Spec: docs/estrategia-agentes-kozegho.md §4 Phase 4.

-- Lead qualification score on customers (orderable in the UI). Written by service role.
alter table public.customers add column if not exists lead_score int;
alter table public.customers add column if not exists lead_justification text;
alter table public.customers add column if not exists lead_scored_at timestamptz;
comment on column public.customers.lead_score is 'Lead Qualification Agent score 0-100 (commercial priority/potential).';

-- Market intelligence digests (rendered as cards in the Intelligence Hub).
create table if not exists public.market_digests (
  id uuid primary key default gen_random_uuid(),
  digest jsonb not null,          -- { items: [{title, summary, category, region, source?}], generatedAt }
  period text not null default 'weekly',
  created_at timestamptz not null default now()
);
alter table public.market_digests enable row level security;
drop policy if exists market_digests_read on public.market_digests;
create policy "market_digests_read" on public.market_digests
  for select using (auth.uid() is not null);   -- any authenticated user reads; writes service-role only

-- Weekly crons (recorded for repo history; scheduled via cron.schedule through MCP).
-- select cron.schedule('lead-qualification-weekly', '0 4 * * 1', $$ ... net.http_post(lead-qualification, {"trigger":"cron","limit":25}, timeout 150s) $$);
-- select cron.schedule('market-intelligence-weekly', '0 6 * * 1', $$ ... net.http_post(market-intelligence, {"trigger":"cron"}, timeout 150s) $$);   -- Mon 06:00 UTC = 07:00 Lisbon summer
