import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { callClaudeWithUsage, claudeCostUsd, parseJsonStrict } from '../_shared/claude.ts'

// Lead Qualification Agent (Phase 4, Haiku 4.5). Scores a customer's commercial priority 0-100 on
// FIT (country, catalogue alignment, deal size) + ENGAGEMENT (interactions, outcomes, response
// velocity). Runs on customer creation ({customerId}) and on a weekly cron (batch of unscored/stalest).
// Writes lead_score + lead_justification to customers; logs each run to agent_runs.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const REST = `${SUPABASE_URL}/rest/v1`
const MODEL = 'claude-haiku-4-5-20251001'
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

type Customer = { id: string; company: string; country: string | null }
type Proposal = { customer_id: string; total: number; outcome: string; created_at: string; email_sent_at: string | null; items?: { product_family?: string }[] }
type Inter = { customer_id: string; occurred_at: string }

function buildPrompt(c: Customer, agg: {
  proposalCount: number; accepted: number; rejected: number; open: number
  pipeline: number; revenue: number; priceMin: number; priceMax: number
  families: string[]; interactionCount: number; daysSinceLastActivity: number | null
}): string {
  return `You are a B2B lead qualification analyst for Kozegho, a Portuguese manufacturer of water treatment and industrial process equipment (product families: AFL, AMR, CSL — polymer preparation, dosing, mixers).

Score this customer's COMMERCIAL PRIORITY from 0 to 100. Consider:
- FIT: country (core targets are PT/ES/FR/UK and the wider EU), catalogue alignment (do their proposals map to Kozegho's water-treatment products), and deal size (historical proposal values).
- ENGAGEMENT: number of interactions, proposal activity, outcomes (accepted deals signal strong potential; all-rejected signals weak fit), and recency / response velocity.
Higher score = higher commercial priority and potential. A brand-new customer with no history should get a moderate fit-based score.

CUSTOMER:
- Company: ${c.company} (Country: ${c.country ?? 'unknown'})
- Proposals: ${agg.proposalCount} (accepted ${agg.accepted}, rejected ${agg.rejected}, open ${agg.open})
- Open pipeline: €${agg.pipeline.toFixed(2)} | Revenue won: €${agg.revenue.toFixed(2)}
- Historical value range: €${agg.priceMin.toFixed(2)} – €${agg.priceMax.toFixed(2)}
- Product families quoted: ${agg.families.length ? agg.families.join(', ') : 'none yet'}
- Interactions logged: ${agg.interactionCount}
- Days since last activity: ${agg.daysSinceLastActivity ?? 'no activity yet'}

Respond with ONLY a single-line JSON object. No markdown. Start with { end with }.
{"score": 0-100 integer, "justification": "one concise sentence citing the main drivers of the score"}`
}

async function logRun(row: Record<string, unknown>): Promise<void> {
  await fetch(`${REST}/agent_runs`, { method: 'POST', headers: { ...sbHeaders, Prefer: 'return=minimal' }, body: JSON.stringify(row) }).catch(() => {})
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  let trigger = 'cron'
  let customerId: string | undefined
  let limit = 25
  try {
    const body = await req.json().catch(() => ({}))
    trigger = body?.trigger ?? 'cron'
    customerId = body?.customerId
    if (Number(body?.limit) > 0) limit = Number(body.limit)
  } catch { /* defaults */ }

  try {
    const now = Date.now()
    // Customers to score
    const custUrl = customerId
      ? `${REST}/customers?id=eq.${customerId}&select=id,company,country`
      : `${REST}/customers?select=id,company,country&order=lead_scored_at.asc.nullsfirst&limit=${limit}`
    const [custRes, propRes, intRes] = await Promise.all([
      fetch(custUrl, { headers: sbHeaders }),
      fetch(`${REST}/proposals?select=customer_id,total,outcome,created_at,email_sent_at,items`, { headers: sbHeaders }),
      fetch(`${REST}/interactions?select=customer_id,occurred_at`, { headers: sbHeaders }),
    ])
    if (!custRes.ok) throw new Error(`fetch_customers ${custRes.status}: ${await custRes.text()}`)
    const customers: Customer[] = await custRes.json()
    const allProposals: Proposal[] = propRes.ok ? await propRes.json() : []
    const allInteractions: Inter[] = intRes.ok ? await intRes.json() : []

    let scored = 0
    const results: Array<Record<string, unknown>> = []

    for (const c of customers) {
      const startedAt = Date.now()
      const props = allProposals.filter((p) => p.customer_id === c.id)
      const ints = allInteractions.filter((i) => i.customer_id === c.id)
      const accepted = props.filter((p) => p.outcome === 'accepted')
      const rejected = props.filter((p) => p.outcome === 'rejected')
      const open = props.filter((p) => p.outcome === 'open')
      const totals = props.map((p) => Number(p.total ?? 0)).filter((n) => n > 0)
      const families = [...new Set(props.flatMap((p) => (Array.isArray(p.items) ? p.items : []).map((it) => it?.product_family).filter(Boolean) as string[]))]
      const lastActivity = [...props.map((p) => p.created_at), ...ints.map((i) => i.occurred_at)].sort().at(-1)
      const agg = {
        proposalCount: props.length,
        accepted: accepted.length,
        rejected: rejected.length,
        open: open.length,
        pipeline: open.reduce((s, p) => s + Number(p.total ?? 0), 0),
        revenue: accepted.reduce((s, p) => s + Number(p.total ?? 0), 0),
        priceMin: totals.length ? Math.min(...totals) : 0,
        priceMax: totals.length ? Math.max(...totals) : 0,
        families,
        interactionCount: ints.length,
        daysSinceLastActivity: lastActivity ? Math.floor((now - new Date(lastActivity).getTime()) / DAY_MS) : null,
      }

      try {
        const res = await callClaudeWithUsage({ prompt: buildPrompt(c, agg), model: MODEL, maxTokens: 300, temperature: 0.3 })
        const out = parseJsonStrict<{ score: number; justification: string }>(res.text)
        const score = Math.max(0, Math.min(100, Math.round(Number(out.score))))
        const upd = await fetch(`${REST}/customers?id=eq.${c.id}`, {
          method: 'PATCH',
          headers: { ...sbHeaders, Prefer: 'return=minimal' },
          body: JSON.stringify({ lead_score: score, lead_justification: out.justification ?? null, lead_scored_at: new Date().toISOString() }),
        })
        if (!upd.ok) throw new Error(`customer_update ${upd.status}: ${await upd.text()}`)
        scored++
        await logRun({
          agent_name: 'lead-qualification', trigger_type: trigger, model: res.model,
          input_tokens: res.usage.input_tokens, output_tokens: res.usage.output_tokens,
          cost_usd: claudeCostUsd(res.model, res.usage), duration_ms: Date.now() - startedAt, status: 'success',
          input: { customer_id: c.id, company: c.company }, output: { score },
        })
        results.push({ company: c.company, score, status: 'success' })
      } catch (e) {
        await logRun({ agent_name: 'lead-qualification', trigger_type: trigger, model: MODEL, status: 'error', error: String(e), duration_ms: Date.now() - startedAt, input: { customer_id: c.id } })
        results.push({ company: c.company, status: 'error', error: String(e) })
      }
    }

    return new Response(JSON.stringify({ ok: true, scored, candidates: customers.length, results }), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  } catch (e) {
    await logRun({ agent_name: 'lead-qualification', trigger_type: trigger, status: 'error', error: String(e) })
    return new Response(JSON.stringify({ error: 'lead_qualification_failed', detail: String(e) }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }
})
