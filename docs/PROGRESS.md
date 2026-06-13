# Kozegho Proposals v2 — Progress
Última atualização: 2026-06-13 (Phase 0 complete)
## Phase 0 — Gemini -> Claude API          [x] gate passed: 2026-06-13 (Gate Report presented)
- [x] _shared/claude.ts created (verbatim from spec §4: callClaude + parseJsonStrict)
- [x] generate-introduction migrated (Sonnet 4.6, max_tokens 600) + deployed (prod v8) + verified — HTTP 200, logs 4.9s/7.9s
- [x] analyze-portfolio migrated (Haiku 4.5, max_tokens 1200, temp 0.3) + deployed (prod v3) + verified — HTTP 200, logs 4.5s
- [x] generate-followup migrated (Sonnet 4.6, max_tokens 1000, temp 0.4) + deployed (prod v5) + verified — HTTP 200, logs 6.1s
- [x] analyze-relationship migrated (Sonnet 4.6, max_tokens 1200, temp 0.4, parseJsonStrict, service-role upsert intact) + deployed (prod v6) + verified — HTTP 200 (4–15s)
- [x] grep generativelanguage = 0 results (verified)
- [x] DE removed from generate-introduction Payload type (grep: no DE)
- [x] CORS restricted to https://kozegho-proposals.vercel.app on all 4 touched functions
- [x] frontend UI string "Gemini returned" -> "AI returned" (useRelationshipScore.ts:80, useDailyBriefing.ts:82, useFollowUp.ts:45) — grep "Gemini returned" = 0
- [x] committed + pushed (npm run save "phase 0: migrate all AI functions to Claude API") — git main now matches production
      NOTE: response shapes frozen (keys identical); ProposalPDF.tsx untouched; GEMINI_API_KEY kept 1 week as rollback per spec.
## Phase 1 — Foundation                     [x] gate passed: 2026-06-13 (Gate Report presented)
- [x] migration agent_foundation applied + verified via list_tables (agent_runs, proposal_embeddings, daily_briefings — all RLS on)
- [x] extensions vector, pg_cron, pg_net enabled (verified via pg_extension)
- [x] manager RLS policies via is_manager() SECURITY DEFINER live + two-role test PROVEN:
      manager sees 87 proposals + 47 customers; salesperson sees only own 2. (consolidated the pre-existing inline managers_see_all_* policies onto is_manager())
- [x] tasks.source reconciled: domain extended to {user,manual,ai_extracted,gmail_detected,agent}, default 'user', NOT NULL
- [x] embed-proposals deployed (prod v3, gte-small 384-dim, mean_pool+normalize, batched limit to avoid WORKER_RESOURCE_LIMIT) + backfill 87/87 proposals embedded (count verified)
- [x] cron pattern tested: cron.job 'embed-proposals-daily' active (0 5 * * *); test invocation via pg_net+Vault service_role_key → HTTP 200 + agent_runs trigger='cron' success row
- NOTE: spec assumed empty DB; reality had 87 proposals (stale stats showed 0). Backfill ran for real.
- NOTE: cron time is UTC (05:00 UTC ≈ 06:00 Lisbon summer); pg_cron has no per-job DST handling.
## Phase 1B — Maintenance fixes             [ ] gate passed: ____ (PENDING user Gmail confirmation)
- [x] EUR line-wrap fixed — ROOT CAUSE: pt-PT/es/fr Intl emits the thousands separator as a Unicode
      space (U+00A0/U+202F/sometimes U+0020); Gmail can drop td white-space:nowrap so the amount wraps.
      Fix: fmtMoney normalizes all whitespace to NBSP ( ) in src/utils/emailTemplates.ts. Verified: PT total "30 420,00" now uses c2a0, no breakable space.
- [x] sender-name encoding — VERIFIED ALREADY CORRECT (fixed in dad7b47, RFC 2047 B-encoding). Evidence:
      stored full_name is clean single-UTF-8; encode→decode round-trips exactly; subjects use the same
      B-encoding (with en-dash) and render fine → the From name renders fine too. No change needed; do not churn.
- [x] ProposalPDF.tsx untouched + sendEmail.ts untouched (only src/utils/emailTemplates.ts changed) — git stat proof
- [ ] AWAITING: user sends a real test email from production and confirms in writing that sender name + Total row render correctly in Gmail. (Active path is client-side sendProposalEmail + buildEmailBody.)
- NOTE: actual files are src/services/sendEmail.ts + src/utils/emailTemplates.ts (goal/CLAUDE.md say src/lib/* — path drifted; intent = the email sender + templates).
## Phase 1B note: user proceeded to /goal Phase 2 (implicit accept). € fix live; Gmail render to confirm in normal use.
## Phase 2 — Follow-up Agent                [ ] gate passed: ____ (PENDING user app validation)
- [x] agent-followup Edge Function (prod v2): D+7/D+14/D+21 tiers; queries open proposals sent >=7d, no interaction in 5d, no open agent task; drafts via callClaudeWithUsage (claude-sonnet-4-6, max_tokens 1000); creates source='agent' task with draft in metadata; SENDS NOTHING; logs each to agent_runs (model, input/output tokens, cost_usd, duration_ms, status). Batched via `limit` (default 10) to stay under edge wall-clock.
- [x] tasks.metadata jsonb migration applied + verified
- [x] _shared/claude.ts: callClaudeWithUsage + claudeCostUsd added (append-only; verbatim callClaude untouched)
- [x] cron 'agent-followup-daily' '30 6 * * 1-5' (06:30 UTC = 07:30 Lisbon summer) visible in cron.job
- [x] manual test: created 3 agent tasks (refs 0511AGK/26, 0511CMK/26, 0511FMK/26, all D+21/urgent) + 3 agent_runs success rows (SQL shown); cost ~$0.013 for 3 drafts
- [x] cron-path test via pg_net+Vault (trigger='cron') fired
- [x] frontend: 'Agent' badge on source='agent' tasks (CustomerIntelligencePage); 'Review follow-up' opens shared FollowUpModal pre-filled → useFollowUp.sendEmail (existing Gmail flow, no new pipeline); Intelligence Hub shows pending agent follow-up count
- [x] FollowUpModal extracted to shared component (src/components/intelligence/FollowUpModal.tsx); IntelligencePage uses it identically
- [x] src/types/database.ts Task.source includes 'agent' (+ 'user'); Task.metadata added; AgentFollowUpMetadata type added
- [x] npm run build passes (tsc + vite)
- NOTE: 39 eligible proposals backlog (mostly old D+21 seed data); cron processes 10/day. Team reviews/dismisses.
- NOTE: 'manager alert' (D+21) = urgent priority + visible in agent_runs (managers' RLS); tasks have no manager-see-all policy (out of scope).
## Phase 3 — Briefing + Client Analysis RAG [ ] gate passed: ____
## Phase 4 — Lead Qual + Market Intel       [ ] gate passed: ____
## Phase 5 — Chief of Staff + final report  [ ] gate passed: ____
(Expand phases 2-5 with task checkboxes from strategy doc §4 when each starts.)
