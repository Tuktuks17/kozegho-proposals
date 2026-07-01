import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { callClaudeWithUsage, claudeCostUsd } from '../_shared/claude.ts'

// Chief of Staff (Phase 5). Weekly cron, Friday 17:00 Lisbon (16:00 UTC in summer). The meta-agent:
// reads the past week of agent_runs + pipeline metrics + daily briefings + the other agents' outputs,
// and produces the weekly executive digest for managers (what the agents did, what went unanswered,
// cross-client patterns no single agent sees, three priorities for next week). Uses claude-fable-5 if
// available, otherwise claude-opus-4-8 (fallback). Includes a monthly cost guardrail alert ($30 threshold)
// derived from the agent_costs_monthly view. Stores the digest in chief_of_staff_digests. Logs agent_runs.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const REST = `${SUPABASE_URL}/rest/v1`
const FABLE = 'claude-fable-5'
const OPUS = 'claude-opus-4-8'
const COST_THRESHOLD_USD = 30
const DAY_MS = 24 * 60 * 60 * 1000

const sbHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
}
const CORS = {
  'Access-Control-Allow-Origin': 'https://kozegho-proposals.vercel.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type Run = { agent_name: string; status: string; cost_usd: number | null; error: string | null; output: Record<string, unknown> | null; created_at: string }
type Proposal = { customer_id: string; total: number | null; outcome: string | null; reference: string; subject: string; created_at: string }
type Customer = { id: string; company: string; lead_score: number | null; lead_justification: string | null }
type Inter = { customer_id: string; occurred_at: string }
type Task = { title: string; priority: string; status: string; metadata: Record<string, unknown> | null; created_at: string }
type Briefing = { briefing: Record<string, unknown>; briefing_date: string }
type CostRow = { month: string; total_usd: number | null }

const num = (v: unknown) => Number(v ?? 0)
const daysSince = (iso: string, now: number) => Math.floor((now - new Date(iso).getTime()) / DAY_MS)

async function logRun(row: Record<string, unknown>): Promise<void> {
  await fetch(`${REST}/agent_runs`, { method: 'POST', headers: { ...sbHeaders, Prefer: 'return=minimal' }, body: JSON.stringify(row) }).catch(() => {})
}

async function get<T>(path: string): Promise<T[]> {
  const r = await fetch(`${REST}/${path}`, { headers: sbHeaders })
  if (!r.ok) return []
  return await r.json()
}

function buildPrompt(facts: string): string {
  return `You are the Chief of Staff for Kozegho, a Portuguese manufacturer of water treatment and industrial process equipment. You advise the two managers of the commercial department. Once a week you review everything the AI agent team and the pipeline did, and write a concise executive digest.

You reason across multiple sources to surface things no single agent sees. Base EVERY statement strictly on the facts below — do not invent clients, values, or events. Be specific: name companies and cite numbers.

=== FACTS (past 7 days, whole commercial department) ===
${facts}

Write the weekly executive digest with these parts:
1. headline — one sentence capturing the state of the commercial week.
2. agents_summary — 2 to 4 sentences on what the agent team actually did this week (concrete counts, clients, values).
3. unanswered — what slipped through or still needs a human: open proposals with no follow-up, cold clients, agent drafts awaiting review, errors. Specific items.
4. cross_client_patterns — patterns spanning MULTIPLE clients or agents that an individual agent would miss (e.g. a sector-wide signal, a recurring rejection reason, a pricing pattern).
5. priorities — EXACTLY three priorities for next week, most important first, each actionable and specific.

Respond with ONLY a single-line JSON object. No markdown, no code fences. It must start with { and end with }.
{"headline":"...","agents_summary":"...","unanswered":["..."],"cross_client_patterns":["..."],"priorities":["...","...","..."]}`
}

// One Claude attempt at the given model. Throws on API error or unparseable output.
async function generate(model: string, prompt: string, effort: string) {
  const res = await callClaudeWithUsage({ prompt, model, maxTokens: 6000, effort })
  const first = res.text.indexOf('{')
  const last = res.text.lastIndexOf('}')
  if (first === -1 || last === -1) throw new Error(`no JSON in ${model} response: ${res.text.slice(0, 200)}`)
  const parsed = JSON.parse(res.text.slice(first, last + 1)) as Record<string, unknown>
  if (!parsed.headline || !Array.isArray(parsed.priorities)) throw new Error(`${model} digest missing headline/priorities`)
  return { parsed, res }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const startedAt = Date.now()
  let trigger = 'cron'
  try {
    const body = await req.json().catch(() => ({}))
    trigger = body?.trigger ?? 'cron'
  } catch { /* default */ }

  try {
    const now = Date.now()
    const weekAgoIso = new Date(now - 7 * DAY_MS).toISOString()
    const fourWeeksAgoIso = new Date(now - 28 * DAY_MS).toISOString()
    const monthPrefix = new Date(now).toISOString().slice(0, 7) // YYYY-MM
    const weekStart = new Date(now - 7 * DAY_MS).toISOString().slice(0, 10)

    const [runs, proposals, customers, interactions, agentTasks, briefings, digests, costRows] = await Promise.all([
      get<Run>(`agent_runs?created_at=gte.${weekAgoIso}&select=agent_name,status,cost_usd,error,output,created_at&order=created_at.desc&limit=500`),
      get<Proposal>(`proposals?select=customer_id,total,outcome,reference,subject,created_at`),
      get<Customer>(`customers?select=id,company,lead_score,lead_justification`),
      get<Inter>(`interactions?occurred_at=gte.${fourWeeksAgoIso}&select=customer_id,occurred_at`),
      get<Task>(`tasks?source=eq.agent&created_at=gte.${weekAgoIso}&select=title,priority,status,metadata,created_at&order=created_at.desc&limit=50`),
      get<Briefing>(`daily_briefings?select=briefing,briefing_date&order=created_at.desc&limit=6`),
      get<{ digest: Record<string, unknown> }>(`market_digests?select=digest&order=created_at.desc&limit=1`),
      get<CostRow>(`agent_costs_monthly?select=month,total_usd`),
    ])

    // ── Pipeline metrics (org-wide) ──────────────────────────────────────────
    const customerMap = new Map(customers.map((c) => [c.id, c]))
    let totalPipeline = 0, totalRevenue = 0, accepted = 0, rejected = 0, open = 0
    for (const p of proposals) {
      if (p.outcome === 'accepted') { totalRevenue += num(p.total); accepted++ }
      else if (p.outcome === 'rejected') { rejected++ }
      else { totalPipeline += num(p.total); open++ }
    }
    const decided = accepted + rejected
    const conversion = decided > 0 ? Math.round((accepted / decided) * 100) : 0

    // Open proposals with no follow-up interaction, oldest first
    const attention = proposals
      .filter((p) => (!p.outcome || p.outcome === 'open') && customerMap.has(p.customer_id))
      .map((p) => ({ p, days: daysSince(p.created_at, now) }))
      .filter((x) => x.days >= 7)
      .sort((a, b) => b.days - a.days).slice(0, 8)

    // Cold clients (no proposal/interaction in 21+ days)
    const lastActivity = new Map<string, string>()
    for (const p of proposals) { const e = lastActivity.get(p.customer_id); if (!e || p.created_at > e) lastActivity.set(p.customer_id, p.created_at) }
    for (const i of interactions) { const e = lastActivity.get(i.customer_id); if (!e || i.occurred_at > e) lastActivity.set(i.customer_id, i.occurred_at) }
    const cold = customers
      .map((c) => { const last = lastActivity.get(c.id); if (!last) return null; const d = daysSince(last, now); return d >= 21 ? { c, d } : null })
      .filter((x): x is { c: Customer; d: number } => x !== null)
      .sort((a, b) => b.d - a.d).slice(0, 6)

    // ── Agent activity aggregation ───────────────────────────────────────────
    const byAgent = new Map<string, { runs: number; ok: number; err: number; cost: number; errors: string[] }>()
    for (const r of runs) {
      const a = byAgent.get(r.agent_name) ?? { runs: 0, ok: 0, err: 0, cost: 0, errors: [] }
      a.runs++; a.cost += num(r.cost_usd)
      if (r.status === 'success') a.ok++
      else if (r.status === 'error') { a.err++; if (r.error && a.errors.length < 3) a.errors.push(r.error.slice(0, 140)) }
      byAgent.set(r.agent_name, a)
    }

    // Agent follow-up drafts awaiting human review
    const pendingDrafts = agentTasks.filter((t) => t.status === 'open')

    // Top leads by score
    const topLeads = customers.filter((c) => c.lead_score != null).sort((a, b) => num(b.lead_score) - num(a.lead_score)).slice(0, 5)

    // Latest market intelligence items
    const marketItems = (digests[0]?.digest?.items as Array<{ title: string; category?: string; region?: string }> | undefined) ?? []

    // ── Cost guardrail (agent_costs_monthly, current month vs $30) ────────────
    let monthTotal = costRows.filter((r) => (r.month ?? '').startsWith(monthPrefix)).reduce((s, r) => s + num(r.total_usd), 0)
    if (costRows.length === 0) {
      // Fallback: view unavailable — sum agent_runs directly for the current month.
      const monthRuns = await get<{ cost_usd: number | null }>(`agent_runs?created_at=gte.${monthPrefix}-01T00:00:00Z&select=cost_usd`)
      monthTotal = monthRuns.reduce((s, r) => s + num(r.cost_usd), 0)
    }
    monthTotal = +monthTotal.toFixed(5)
    const overThreshold = monthTotal > COST_THRESHOLD_USD
    const costGuardrail = {
      month: monthPrefix,
      total_usd: monthTotal,
      threshold_usd: COST_THRESHOLD_USD,
      status: overThreshold ? 'alert' : 'ok',
      message: overThreshold
        ? `ALERT: agent spend for ${monthPrefix} is $${monthTotal.toFixed(2)}, above the $${COST_THRESHOLD_USD} monthly guardrail. Review the model routing and cron volume.`
        : `Agent spend for ${monthPrefix} is $${monthTotal.toFixed(2)} of the $${COST_THRESHOLD_USD} monthly guardrail — within budget.`,
    }

    // ── Build the facts block for the model ──────────────────────────────────
    const agentLines = [...byAgent.entries()].map(([name, a]) =>
      `- ${name}: ${a.runs} runs (${a.ok} ok, ${a.err} error), $${a.cost.toFixed(4)}${a.errors.length ? ` — errors: ${a.errors.join(' | ')}` : ''}`).join('\n') || '- no agent runs this week'
    const attentionLines = attention.length
      ? attention.map((x) => `- ${customerMap.get(x.p.customer_id)?.company} ${x.p.reference} €${num(x.p.total).toFixed(0)} (${x.days} days open, ${x.p.subject})`).join('\n')
      : '- none'
    const coldLines = cold.length ? cold.map((x) => `- ${x.c.company} (${x.d} days inactive)`).join('\n') : '- none'
    const draftLines = pendingDrafts.length
      ? pendingDrafts.slice(0, 8).map((t) => `- ${t.title} (${t.priority})`).join('\n')
      : '- none pending review'
    const leadLines = topLeads.length
      ? topLeads.map((c) => `- ${c.company}: lead score ${c.lead_score}${c.lead_justification ? ` — ${String(c.lead_justification).slice(0, 120)}` : ''}`).join('\n')
      : '- no scored leads'
    const marketLines = marketItems.length
      ? marketItems.slice(0, 6).map((m) => `- [${m.category ?? ''}/${m.region ?? ''}] ${m.title}`).join('\n')
      : '- no market digest yet'
    const briefLines = briefings.length
      ? briefings.slice(0, 3).map((b) => `- ${b.briefing_date}: ${String((b.briefing as { headline?: string })?.headline ?? '').slice(0, 200)}`).join('\n')
      : '- none'

    const facts = `PIPELINE (whole portfolio):
- Pipeline value (open): €${totalPipeline.toFixed(0)} across ${open} open proposals
- Revenue won: €${totalRevenue.toFixed(0)} (${accepted} accepted, ${rejected} rejected, conversion ${conversion}%)
- Customers: ${customers.length}

AGENT ACTIVITY (past 7 days):
${agentLines}

OPEN PROPOSALS NEEDING FOLLOW-UP (>=7 days, no recent interaction):
${attentionLines}

COLD CLIENTS (21+ days inactive):
${coldLines}

AGENT FOLLOW-UP DRAFTS AWAITING HUMAN REVIEW:
${draftLines}

TOP LEAD-QUALIFICATION SCORES:
${leadLines}

LATEST MARKET INTELLIGENCE ITEMS:
${marketLines}

RECENT DAILY BRIEFING HEADLINES:
${briefLines}

COST GUARDRAIL (this month): $${monthTotal.toFixed(2)} of $${COST_THRESHOLD_USD} — ${costGuardrail.status}`

    const prompt = buildPrompt(facts)

    // ── Generate: Fable 5 primary, Opus 4.8 fallback ─────────────────────────
    let out: Awaited<ReturnType<typeof generate>>
    let fellBack = false
    try {
      out = await generate(FABLE, prompt, 'medium')
    } catch (fableErr) {
      fellBack = true
      out = await generate(OPUS, prompt, 'medium')
      console.log(`chief-of-staff: fable-5 unavailable (${String(fableErr).slice(0, 120)}), used opus-4-8`)
    }
    const { parsed, res } = out

    const digest = {
      headline: parsed.headline,
      agents_summary: parsed.agents_summary ?? '',
      unanswered: Array.isArray(parsed.unanswered) ? parsed.unanswered : [],
      cross_client_patterns: Array.isArray(parsed.cross_client_patterns) ? parsed.cross_client_patterns : [],
      priorities: (parsed.priorities as unknown[]).slice(0, 3),
      cost_guardrail: costGuardrail,
      model: res.model,
      generatedAt: new Date().toISOString(),
    }

    const ins = await fetch(`${REST}/chief_of_staff_digests`, {
      method: 'POST',
      headers: { ...sbHeaders, Prefer: 'return=minimal' },
      body: JSON.stringify({ digest, period: 'weekly', week_start: weekStart }),
    })
    if (!ins.ok) throw new Error(`digest_insert ${ins.status}: ${await ins.text()}`)

    await logRun({
      agent_name: 'chief-of-staff', trigger_type: trigger, model: res.model,
      input_tokens: res.usage.input_tokens, output_tokens: res.usage.output_tokens,
      cost_usd: claudeCostUsd(res.model, res.usage), duration_ms: Date.now() - startedAt, status: 'success',
      input: { week_start: weekStart, agents: byAgent.size, fell_back_to_opus: fellBack },
      output: { headline: digest.headline, cost_status: costGuardrail.status, month_usd: monthTotal },
    })

    return new Response(JSON.stringify({ ok: true, model: res.model, week_start: weekStart, cost_status: costGuardrail.status, durationMs: Date.now() - startedAt }), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  } catch (e) {
    await logRun({ agent_name: 'chief-of-staff', trigger_type: trigger, status: 'error', error: String(e), duration_ms: Date.now() - startedAt })
    return new Response(JSON.stringify({ error: 'chief_of_staff_failed', detail: String(e) }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }
})
