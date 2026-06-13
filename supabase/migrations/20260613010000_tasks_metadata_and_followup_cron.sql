-- Phase 2 — Follow-up Agent (applied to yrlnvtiuonrjkvdoievj via Supabase MCP 2026-06-13).
-- Spec: docs/estrategia-agentes-kozegho.md §4 Phase 2.

-- agent-followup creates source='agent' tasks carrying the AI-drafted follow-up email + context.
alter table public.tasks add column if not exists metadata jsonb;
comment on column public.tasks.metadata is 'Agent-created tasks store the follow-up draft and context here: {proposal_id, reference, draft:{subject,body}, tier, days_open, customer_name, customer_email}';

-- Daily schedule (recorded for repo history; scheduled via cron.schedule through MCP).
-- 06:30 UTC = 07:30 Lisbon (summer/WEST). pg_net timeout raised to 150s because each Sonnet
-- draft takes ~8s and the default 5s timeout could not capture the response. limit 8 keeps the
-- run (~72s) under the edge-function wall-clock.
-- select cron.schedule(
--   'agent-followup-daily', '30 6 * * 1-5',
--   $$ select net.http_post(
--        url     := 'https://yrlnvtiuonrjkvdoievj.supabase.co/functions/v1/agent-followup',
--        headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'), 'Content-Type', 'application/json'),
--        body    := '{"trigger":"cron","limit":8}'::jsonb,
--        timeout_milliseconds := 150000
--      ); $$
-- );
