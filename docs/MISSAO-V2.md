MISSION BRIEF — KOZEGHO PROPOSALS V2: COMMERCIAL DEPARTMENT AUTOMATION

You are completing version 2 of Kozegho Proposals: migrating all AI functions from
Gemini to the Claude API and building the full agent team that automates the
commercial department, as specified in docs/estrategia-agentes-kozegho.md.

This brief defines HOW you work. The strategy document defines WHAT you build.
The strategy document is the canonical spec — when in doubt, it wins.

=== STEP 0 — INSTALL THIS MISSION (do this now, before anything else) ===
1. Save this entire mission brief verbatim to docs/MISSAO-V2.md so future sessions
   can re-read it.
2. Verify docs/estrategia-agentes-kozegho.md exists and read it IN FULL. If it does
   not exist, STOP and ask the user to add it. Do not proceed without it.
3. Read CLAUDE.md in full. Its rules apply to every action in this mission.
4. Create docs/PROGRESS.md from the template at the end of this brief (if it does
   not already exist).
5. Verify the environment and report findings:
   a. Supabase MCP works: list_edge_functions on project yrlnvtiuonrjkvdoievj
      (expect 6 functions). NEVER touch project camaidyklwcgjbpvhuzv.
   b. Ask the user to confirm ANTHROPIC_API_KEY is set in Supabase Edge Function
      secrets (you cannot read secret values — explicit user confirmation required).
   c. git status is clean; git log --oneline -5 shown.
6. Commit the mission files: npm run save "add v2 mission brief and progress tracker"
7. Report environment status and say: "Ready for /goal Phase 0."
   DO NOT start any implementation. Phases start ONLY when the user issues a /goal.

=== OPERATING RULES (non-negotiable, all phases) ===
R1. LIVE PRODUCTION APP. A real sales team uses this daily. Never leave it broken
    at the end of a work block. If a deploy degrades production, immediate priority
    is restoring it (rollback to previous function version or revert commit).
R2. ONE PHASE AT A TIME. Work only on the phase named in the active /goal. Never
    begin the next phase's work, even if "it would be quick".
R3. SPEC FIDELITY. Implement exactly what docs/estrategia-agentes-kozegho.md
    section 4 specifies for the active phase, including the verbatim code blocks
    (_shared/claude.ts, SQL migrations) and the model routing table in section 3.
    Do not substitute models, rename tables, or "improve" the spec.
R4. SURGICAL EDITS. Touch only files required by the active phase. All DO NOT TOUCH
    constraints in CLAUDE.md apply. No opportunistic refactors.
R5. CONTRACT FREEZE. Edge Function response shapes to the frontend are frozen:
    same keys, same structure. In Phase 0 the only frontend change allowed is the
    UI error string "Gemini returned" -> "AI returned" in useRelationshipScore.ts.
R6. ONE DEPLOY AT A TIME. Deploy one Edge Function, verify it in production
    (Supabase logs: HTTP 200, latency 1-4s) before deploying the next.
R7. EVIDENCE OR IT DIDN'T HAPPEN. Every completion claim comes with raw output:
    git log -1 --stat, grep results, npm run build output, SQL query results,
    Supabase MCP responses, function logs. After apply_migration, ALWAYS verify
    with list_tables.
R8. COMMIT DISCIPLINE. npm run save "phase N: <what>" at every stable point.
    Never push a failing build (save.sh aborts on build failure — respect it).
R9. ON FAILURE: stop, show the exact raw error, propose a fix, wait for approval.
    Never silently retry a different approach.
R10. PROGRESS TRACKING. Update docs/PROGRESS.md after every completed task
    (checkbox + date + one-line evidence reference). PROGRESS.md is the source
    of truth for resuming across sessions — but verify it against git log and
    Supabase state on every resume; reality wins over the file.
R11. SECRETS. Never print, log, or commit API keys or the service role key.
    Cron jobs read the service key from Supabase Vault, never hardcoded.
R12. GATE REPORT. A phase ends with a Gate Report (template below) presented to
    the user. The /goal condition includes this report. After it, STOP — the user
    validates in the production app and issues the next /goal when satisfied.

=== PHASE MAP (spec: docs/estrategia-agentes-kozegho.md §4) ===
Phase 0  — Migrate 4 AI Edge Functions Gemini -> Claude API via _shared/claude.ts
Phase 1  — Agent foundation: pgvector + gte-small embeddings, agent_runs,
           daily_briefings, pg_cron/pg_net pattern, manager RLS policies
Phase 1B — Maintenance: Gmail sender-name encoding + EUR line-wrap
           (src/lib/sendEmail.ts and src/lib/emailTemplates.ts ONLY)
Phase 2  — Follow-up Agent (agent-followup, daily cron, human-in-the-loop tasks)
Phase 3  — Server-side Daily Briefing (agent-briefing) + Client Analysis RAG
           (analyze-client-history)
Phase 4  — Lead Qualification Agent + Market Intelligence Agent (web_search tool)
Phase 5  — Chief of Staff (claude-fable-5, weekly digest) + agent_costs_monthly
           view + final v2 completion report

=== GATE REPORT TEMPLATE ===
## Gate Report — Phase N
**Delivered:** <bullet list of what was built/deployed>
**Evidence:**
- git log -1 --stat: <output>
- Build: <npm run build result>
- Grep checks: <commands + output>
- Supabase state: <list_tables / list_edge_functions / SQL results>
- Production verification: <function logs showing 200s + latency>
**Success criteria from strategy doc §4 Phase N:** <each criterion: PASS/FAIL + proof>
**Deviations from spec:** <none, or listed with reason>
**What the user should manually verify in the app:** <concrete click-path checklist>
**Costs this phase (/cost):** <amount>

=== docs/PROGRESS.md TEMPLATE ===
# Kozegho Proposals v2 — Progress
Última atualização: <date>
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
