# Kozegho Proposals — Instructions for Claude Code

## Project context
B2B PWA for commercial proposal generation (Word/PDF/email) for Kozegho, a Portuguese
manufacturer of water treatment equipment. Stack: React 19 + TypeScript + Vite + Tailwind +
shadcn/ui + Supabase (Auth, Postgres, Storage, Edge Functions) + Vercel + Claude API.
Users: 2 managers + 2 salespersons. Production: kozegho-proposals.vercel.app

## Critical infrastructure rules
- Active Supabase project: `yrlnvtiuonrjkvdoievj` (eu-west-1). NEVER use `camaidyklwcgjbpvhuzv`
  (deprecated old project).
- GitHub pushes auto-deploy ONLY the frontend (Vercel). Edge Functions and SQL migrations
  must be deployed separately via Supabase MCP or CLI — never assume a push deployed them.
- After `apply_migration`, ALWAYS verify with `list_tables` (silent failures have occurred).
- Commit and push with `npm run save "message"` (runs build first; aborts on build failure).
  Never push without a passing build. `git pull` is unnecessary (single user, single machine).

## Workflow rules
- Default to Plan Mode: present the full plan and wait for approval before editing files.
- Surgical edits only: modify exactly the named files; never refactor opportunistically.
- After every change, show real evidence: `git log -1 --stat`, relevant `grep` output,
  and `npm run build` result. Self-reports without evidence are not acceptable.

## File-specific constraints
- Email bugs (sender-name encoding, € line-wrap, layout) live in `src/lib/sendEmail.ts`
  and `src/lib/emailTemplates.ts`. DO NOT TOUCH `ProposalPDF.tsx` for email issues.
- Gmail HTML constraints: no CSS `filter`; image dimensions via HTML attributes (not inline
  style); `rgba` background-color only on `<td>`; white logo for email/PDF (green background),
  colored logo for Word (white background).
- Proposal reference format `MMDD[Letter][SalesRepInitial]K/YY` uses the SECURITY DEFINER
  SQL function `get_daily_proposal_count()` — do not reimplement client-side.
- Proposal languages: PT, EN, ES, FR only. German was removed — do not reintroduce it.

## AI / Edge Functions
- All Claude API calls go through `supabase/functions/_shared/claude.ts` (callClaude).
  Never call the Anthropic API directly from a function body.
- Model routing: Haiku 4.5 (`claude-haiku-4-5-20251001`) for recurring cheap jobs;
  Sonnet 4.6 (`claude-sonnet-4-6`) default and for client-facing text; Fable 5
  (`claude-fable-5`) only for the Chief of Staff agent. Always set `max_tokens`.
- Keep Edge Function response shapes stable — the frontend depends on exact keys
  (`error`, `raw`, and each function's result schema).
- Agent functions must log every run to `agent_runs` (tokens, cost_usd, duration_ms, status).
- PWA install prompt does not appear in dev (`devOptions: { enabled: false }`) — expected,
  not a bug.
