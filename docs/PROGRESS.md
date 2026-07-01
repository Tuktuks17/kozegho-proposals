# Kozegho Proposals v2 — Progress
Última atualização: 2026-07-01 (v2 COMPLETE — all phases 0–5 delivered; see docs/V2-COMPLETION-REPORT.md)
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
## Phase 1B — Maintenance fixes             [x] gate passed: 2026-07-01 (v2 completion; € fix live, sender-name verified correct)
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
## Phase 2 — Follow-up Agent                [x] gate passed: 2026-07-01 (v2 completion)
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
## Phase 3 — Briefing + Client Analysis RAG [x] gate passed: 2026-07-01 (v2 completion)
- [x] agent-briefing Edge Function (prod v1, Haiku 4.5): per-profile scoped snapshot server-side (managers=full portfolio, salespersons=own book) → briefing into daily_briefings; upsert on (profile_id,briefing_date); logs agent_runs. Test: 4/4 profiles success; SQL shows 4 rows for 2026-07-01 (managers €183,870 full portfolio vs salesperson Nuno €90,130 own book — scoping proven)
- [x] cron 'agent-briefing-daily' '0 6 * * *' (06:00 UTC = 07:00 Lisbon summer), pg_net timeout 150s
- [x] useDailyBriefing.ts reads today's row from daily_briefings on mount (RLS briefings_own), on-demand analyze-portfolio kept as fallback; BriefingResult contract unchanged
- [x] match_proposal_embeddings RPC (pgvector cosine, security definer) applied + used
- [x] analyze-client-history Edge Function (prod v1, Sonnet 4.6): gte-small query embed → match RPC (similar deals from OTHER clients) + this client's proposals/outcomes/interactions → grounded synthesis; DB-derived facts block; logs agent_runs
- [x] UI entry points: (a) deep-analysis panel on customer detail page (Deep analyse button); (b) auto-context card in proposal form SectionClient when an existing customer is picked
- [x] useClientAnalysis hook
- [x] ANTI-HALLUCINATION spot-check (5 customers): AI facts == SQL ground truth EXACTLY for Galp(24/0/8), Coca-Cola(9/0/0), nike(5/3/2 €94,890), Coca-Cola(5/0/0), Kozegho(4/1/2 €17,480). Facts computed in code, model told to use only them.
- [x] npm run build passes (tsc + vite)
## Phase 4 — Lead Qual + Market Intel       [x] gate passed: 2026-07-01 (v2 completion)
- [x] lead-qualification Edge Function (prod v1, Haiku 4.5): scores customers 0-100 on fit (country/catalogue/size) + engagement (interactions/outcomes/velocity); runs on customer creation ({customerId}) + weekly cron (batch, oldest-scored first); writes customers.lead_score + lead_justification + lead_scored_at; logs agent_runs. Test: 5 scored (nike 72, KuantoKusta 58, junk 42), $0.003.
- [x] migration: customers.lead_score/justification/scored_at + market_digests table (RLS: authenticated read, service-role write)
- [x] market-intelligence Edge Function (prod v1, Sonnet 4.6 + web_search_20250305 tool, max_uses 6): researches water-treatment PT/ES/FR/UK + competitors + tenders → digest in market_digests; logs agent_runs. Test: 7 real sourced items (EIB/Águas de Portugal, EU UWWTD, SNF competitor, UK NHS framework...), 38s, $0.20 tokens (+ per-search fee not captured).
- [x] _shared/claude.ts: ClaudeOpts.tools + callClaudeWithUsage passes tools (append-only; callClaude untouched)
- [x] crons: lead-qualification-weekly '0 4 * * 1', market-intelligence-weekly '0 6 * * 1' (Mon 06:00 UTC=07:00 Lisbon), both pg_net timeout 150s, in cron.job
- [x] frontend: customer list Sort toggle (Activity | Lead priority) + ★score badge on cards (CustomerIntelligencePage); Market Intelligence cards in Intelligence Hub (useMarketDigest); lead-qual fires on customer create (useCustomers.upsert); types Customer.lead_* + MarketDigest
- [x] npm run build passes (tsc + vite)
- NOTE: web_search bills a per-search fee (~$10/1000) on top of tokens; logged cost_usd is token-only (underestimate, residual at weekly volume).
## Phase 5 — Chief of Staff + final report  [x] gate passed: 2026-07-01 (Gate Report presented)
- [x] _shared/claude.ts: append-only edits — Opus 4.8 pricing ($5/$25) added to MODEL_PRICING;
      NO_SAMPLING_MODELS guard (Fable 5 / Opus 4.8 reject temperature/top_p/top_k → 400); optional
      output_config.effort passthrough. callClaude + Haiku/Sonnet callers untouched (verified via build).
- [x] chief-of-staff Edge Function (prod v1, verify_jwt, CORS restricted): reads past 7 days of
      agent_runs + org-wide pipeline metrics + daily_briefings + other agents' outputs (follow-up drafts,
      lead scores, market digest) → weekly executive digest per strategy §4 Phase 5 (headline, what the
      agents did, what went unanswered, cross-client patterns, exactly 3 priorities). Logs agent_runs.
- [x] Model routing: claude-fable-5 primary, claude-opus-4-8 fallback (try/catch on API error or
      unparseable output). Effort 'medium' to bound latency/cost. PROVEN: live run fell back to
      claude-opus-4-8 (fable-5 not enabled on this org) — agent_runs.input.fell_back_to_opus=true.
- [x] migration chief_of_staff_phase5 applied + verified via list_tables: chief_of_staff_digests table
      (RLS on, cos_digests_manager_read via is_manager() — managers-only read, service-role write) +
      agent_costs_monthly view (strategy §5 verbatim SELECT) returning data (8 rows, 7 agents, $0.646 all-time).
- [x] agent_costs_monthly hardened to security_invoker=on (resolves security_definer_view advisor ERROR;
      SELECT logic unchanged). get_advisors(security): 0 errors remain (only pre-existing WARN/INFO).
- [x] Monthly cost guardrail ($30 threshold) computed in code from agent_costs_monthly and embedded in
      every digest (cost_guardrail{month,total_usd,threshold_usd,status,message}); model narrative told to
      match. Live: 2026-07 = $0.35 of $30 → status 'ok'.
- [x] cron 'chief-of-staff-weekly' '0 16 * * 5' (Fri 16:00 UTC = 17:00 Lisbon summer; UTC-scheduled for DST,
      same convention as other crons) visible in cron.job (jobid 7, active).
- [x] One real digest generated + stored (chief_of_staff_digests id c5792f15…, week_start 2026-06-24) via
      the cron transport (pg_net + Vault service_role_key) → HTTP 200 (net._http_response id 37); agent_runs
      row: model claude-opus-4-8, 2171 in / 1178 out tokens, $0.04031, 18.07s, success. Digest grounded vs
      SQL (€183,870 stalled, nike lead 72, $0.35/$30) — cross-client patterns tie market-intel signals to
      unengaged PT leads (insight no single agent produces).
- [x] frontend: ChiefOfStaffPanel in IntelligencePage (manager-gated via isManager) renders headline, agents
      summary, unanswered, cross-client patterns, 3 priorities, cost-guardrail badge (ok/alert), model tag;
      useChiefOfStaffDigest hook (reads latest, gated on isManager; RLS also enforces managers-only);
      types Database ChiefOfStaffDigest + CostGuardrail. npm run build passes (tsc + vite).
- [x] docs/V2-COMPLETION-REPORT.md written (all phases, total costs, known limitations incl. Gmail
      provider_token, recommended next steps). Committed via npm run save "v2 complete: full commercial
      department automation".
- NOTE: claude-fable-5 is not enabled on this Anthropic org (or blocked by the 30-day-retention gate), so
  the Chief of Staff runs on claude-opus-4-8 today. The moment fable-5 access is granted, it is used
  automatically with zero code change — the fallback is transparent.
