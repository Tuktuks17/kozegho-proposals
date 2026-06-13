# Kozegho Proposals v2 — Progress
Última atualização: 2026-06-13
## Phase 0 — Gemini -> Claude API          [ ] gate passed: ____
- [ ] _shared/claude.ts created
- [ ] generate-introduction migrated + deployed + verified in prod
- [ ] analyze-portfolio migrated + deployed + verified in prod
- [ ] generate-followup migrated + deployed + verified in prod
- [ ] analyze-relationship migrated + deployed + verified in prod
- [ ] grep generativelanguage = 0 results
- [ ] DE removed from generate-introduction Payload type
- [ ] CORS restricted to https://kozegho-proposals.vercel.app on touched functions
- [ ] committed + pushed (npm run save)
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
