# Kozegho Proposals — v2 Completion Report

**Date:** 2026-07-01 · **Status:** ✅ COMPLETE (phases 0–5) · **Spec:** `docs/estrategia-agentes-kozegho.md` · **Mission:** `docs/MISSAO-V2.md`
**Supabase:** `yrlnvtiuonrjkvdoievj` (eu-west-1) · **Production:** kozegho-proposals.vercel.app

Version 2 migrated every AI function from Gemini to the Claude API and built the full agent team that
automates the Kozegho commercial department — six autonomous agents on the existing stack (Edge Functions
+ pg_cron/pg_net + pgvector), human-in-the-loop by default, with cost logging from day 1. The structural
cause of the recurring 502s (exhausted Gemini free quota) is gone.

---

## 1. What was delivered, phase by phase

### Phase 0 — Gemini → Claude API (done 2026-06-13)
The 4 AI Edge Functions migrated to the Claude API through a single shared helper
`supabase/functions/_shared/claude.ts` (`callClaude` + `parseJsonStrict`), response contracts to the
frontend frozen (identical keys):
- `generate-introduction` (Sonnet 4.6, max_tokens 600) — client-facing intro; German residue removed.
- `analyze-portfolio` (Haiku 4.5, 1200) — daily briefing JSON.
- `generate-followup` (Sonnet 4.6, 1000) — follow-up email drafts.
- `analyze-relationship` (Sonnet 4.6, 1200, strict JSON + service-role upsert).
CORS restricted to the production origin on all four; `grep generativelanguage` = 0. Only frontend change
was the UI error string "Gemini returned" → "AI returned".

### Phase 1 — Agent foundation (done 2026-06-13)
Migration `agent_foundation`: `agent_runs` (audit + costs), `proposal_embeddings` (pgvector, gte-small
384-dim), `daily_briefings`; extensions `vector` / `pg_cron` / `pg_net`; manager RLS via `is_manager()`
SECURITY DEFINER (two-role test proven). `embed-proposals` Edge Function (gte-small, zero external API)
backfilled all proposals. pg_cron → pg_net → Edge Function pattern established (service key from Vault,
never hardcoded).

### Phase 1B — Maintenance (done)
EUR line-wrap fixed in `src/utils/emailTemplates.ts` (normalize thousands separators to NBSP so Gmail
can't break the total). Sender-name RFC 2047 B-encoding verified already correct. `ProposalPDF.tsx` and
`sendEmail.ts` untouched.

### Phase 2 — Follow-up Agent (done)
`agent-followup` (daily cron, Sonnet 4.6): finds open proposals sent ≥7 days ago with no recent
interaction, drafts D+7 / D+14 / D+21 follow-ups, creates `source='agent'` tasks with the draft in
`metadata`, **sends nothing** (strict human-in-the-loop). UI: "Agent" badge + pending count; "Review
follow-up" opens the shared `FollowUpModal` on the existing Gmail flow.

### Phase 3 — Server-side Briefing + Client Analysis RAG (done)
`agent-briefing` (daily cron, Haiku 4.5): per-profile scoped snapshot (managers = full portfolio,
salespersons = own book) → `daily_briefings`; app reads instantly. `analyze-client-history` (Sonnet 4.6 +
pgvector): query embedding → `match_proposal_embeddings` RPC (similar deals) + this client's
history → grounded synthesis. Anti-hallucination spot-check (5 clients): AI facts == SQL ground truth.

### Phase 4 — Lead Qualification + Market Intelligence (done)
`lead-qualification` (Haiku 4.5): scores customers 0–100 on fit + engagement on create and weekly; writes
`customers.lead_score/justification/scored_at`; UI sort + ★ badge. `market-intelligence` (Sonnet 4.6 +
`web_search` server tool, weekly): researches water-treatment PT/ES/FR/UK + competitors + tenders →
`market_digests` → Intelligence Hub cards.

### Phase 5 — Chief of Staff + cost view (done 2026-07-01)
`chief-of-staff` (weekly cron Fri 17:00 Lisbon, **claude-fable-5 primary / claude-opus-4-8 fallback**):
the meta-agent reads the past 7 days of `agent_runs` + org-wide pipeline metrics + `daily_briefings` +
the other agents' outputs (follow-up drafts, lead scores, market digest) and produces the managers'
weekly executive digest — what the agents did, what went unanswered, cross-client patterns no single
agent sees, and exactly three priorities for next week. Stored in `chief_of_staff_digests` (managers-only
RLS), rendered as a manager-gated panel in the Intelligence page. `agent_costs_monthly` view (strategy §5)
added. A **$30/month cost guardrail** is computed in code from that view and embedded in every digest.

**Model routing note:** `claude-fable-5` is not currently enabled on this Anthropic org (or is blocked by
its 30-day-retention gate), so the live digest ran on `claude-opus-4-8` via the transparent fallback
(`agent_runs.input.fell_back_to_opus = true`). No code change is needed once Fable 5 access is granted.

---

## 2. The agent team (live)

| Agent Edge Function | Model | Schedule (UTC) | Writes |
|---|---|---|---|
| `embed-proposals` | gte-small (free) | `0 5 * * *` | `proposal_embeddings` |
| `agent-followup` | Sonnet 4.6 | `30 6 * * 1-5` | `tasks` (source=agent) |
| `agent-briefing` | Haiku 4.5 | `0 6 * * *` | `daily_briefings` |
| `lead-qualification` | Haiku 4.5 | `0 4 * * 1` + on create | `customers.lead_*` |
| `market-intelligence` | Sonnet 4.6 + web_search | `0 6 * * 1` | `market_digests` |
| `chief-of-staff` | Fable 5 → Opus 4.8 | `0 16 * * 5` | `chief_of_staff_digests` |

All log every run to `agent_runs` (model, input/output tokens, cost_usd, duration_ms, status). Cron times
are scheduled in UTC assuming Lisbon summer (WEST, UTC+1); pg_cron has no per-job DST handling.

---

## 3. Total costs to date (from `agent_costs_monthly`)

All-time Claude spend across every agent run: **$0.65** (view returns 8 agent×month rows, 7 agents).

| Month | Spend |
|---|---|
| 2026-06 | $0.257 (follow-up backlog; embeddings free) |
| 2026-07 | $0.389 (client-analysis $0.134, market-intel $0.197, chief-of-staff $0.040, briefing $0.014, lead-qual $0.003) |

Well inside the $30/month guardrail — an order of magnitude below the €5–15/month the strategy doc
estimated. The Gemini quota cliff is replaced by predictable prepaid usage.

---

## 4. Known limitations

1. **Gmail server-side send (deferred).** The Gmail `provider_token` lives in the user's browser session
   (Finding 1 of the original audit), so no agent can send email or email a briefing/digest server-side.
   Every agent is human-in-the-loop by design; the follow-up drafts and digests are reviewed and sent
   from the existing client-side Gmail flow. Server-side send needs a stored OAuth refresh token.
2. **Fable 5 not enabled on this org.** The Chief of Staff runs on Opus 4.8 via the transparent fallback
   until Fable 5 API access (and the 30-day-retention requirement) is granted. Quality is excellent on
   Opus 4.8; Fable 5 would add deeper multi-source reasoning at ~2× the token price for one run/week.
3. **web_search per-search fee not captured.** `market-intelligence` logs token cost only; the web-search
   tool bills a small per-search fee (~$10/1000) on top. Residual at weekly volume, but the logged
   `cost_usd` is a slight underestimate for that one agent.
4. **pg_cron DST.** All crons are scheduled in UTC for Lisbon summer. At the autumn DST change they will
   fire one hour later in local time until manually shifted (e.g. Chief of Staff `0 16` → `0 17`).
5. **Pre-existing Supabase advisor WARN/INFO** remain (extensions in `public`, mutable function
   search_path on legacy functions, `proposal_embeddings` RLS-enabled-no-policy which is intentional —
   service-role-only, no read path). None introduced by v2; the one ERROR v2 raised (SECURITY DEFINER
   view) was resolved with `security_invoker=on`.
6. **Frontend bundle > 500 kB** (single chunk, gzip 770 kB). Pre-existing; not a correctness issue.

---

## 5. Recommended next steps

1. **Server-side Gmail** (stored OAuth refresh token) → email the daily briefing and the weekly Chief of
   Staff digest to managers, and unlock opt-in auto-send per follow-up tier once `agent_runs` shows a
   clean approved-draft track record.
2. **Feedback loop.** Wire the 👍/👎 `feedback` column (already on `agent_runs`) to the agent output cards;
   fortnightly prompt review against the 👎 — the cheapest quality-improvement cycle available.
3. **Enable Fable 5** on the Anthropic org (+ confirm 30-day retention) — the Chief of Staff upgrades
   automatically, no deploy.
4. **DST helper** for pg_cron (a tiny scheduled job that rewrites cron expressions at the two yearly
   changeovers), or move to a scheduler with native timezone support.
5. **Advisor hygiene:** move `vector` / `pg_net` / `pg_trgm` out of `public`, set `search_path` on legacy
   SECURITY DEFINER functions, enable leaked-password protection.
6. **Code-split the frontend bundle** (dynamic imports / manualChunks) to cut first-load size.
7. **In-app "Ask the agent" chat** over the whole commercial base, reusing the Phase 3 RAG (the strategy
   doc's post-roadmap extension).

---

*v2 delivered on the existing stack, no new orchestration services, human-in-the-loop by default, costs
auditable from day 1 — exactly as `docs/estrategia-agentes-kozegho.md` specified.*
