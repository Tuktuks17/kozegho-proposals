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
## Phase 1 — Foundation                     [ ] gate passed: ____
- [ ] migration agent_foundation applied + verified via list_tables
- [ ] extensions vector, pg_cron, pg_net enabled
- [ ] manager RLS policies (is_manager) live + tested with both roles
- [ ] embed-proposals deployed + backfill count > 0
- [ ] cron pattern tested (cron.job visible + 1 successful run)
## Phase 1B — Maintenance fixes             [ ] gate passed: ____
- [ ] sender-name encoding fixed (sendEmail.ts / emailTemplates.ts only)
- [ ] EUR line-wrap fixed
- [ ] ProposalPDF.tsx untouched (git log --stat proof)
## Phase 2 — Follow-up Agent                [ ] gate passed: ____
## Phase 3 — Briefing + Client Analysis RAG [ ] gate passed: ____
## Phase 4 — Lead Qual + Market Intel       [ ] gate passed: ____
## Phase 5 — Chief of Staff + final report  [ ] gate passed: ____
(Expand phases 2-5 with task checkboxes from strategy doc §4 when each starts.)
