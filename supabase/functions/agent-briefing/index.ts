import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { callClaudeWithUsage, claudeCostUsd, parseJsonStrict } from '../_shared/claude.ts'

// Daily Briefing Agent (Phase 3). Cron 06:00 UTC (07:00 Lisbon summer). For each active profile it
// computes a scoped portfolio snapshot server-side (managers = full portfolio, salespersons = their
// own book), generates the briefing with Haiku 4.5, and upserts it into daily_briefings so the app
// reads it instantly. Logs every run to agent_runs.

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

type Profile = { id: string; role: string; full_name: string }
type Proposal = { customer_id: string; total: number; outcome: string; reference: string; subject: string; created_at: string; created_by: string }
type Customer = { id: string; company: string; created_by: string }
type Inter = { customer_id: string; occurred_at: string }

const daysSince = (iso: string, now: number) => Math.floor((now - new Date(iso).getTime()) / DAY_MS)

function buildPrompt(metrics: Record<string, number>, attentionSummary: string, coldSummary: string): string {
  return `You are an elite B2B sales strategist advising the Sales Manager of Kozegho, a Portuguese manufacturer of water treatment and industrial process equipment.

PORTFOLIO SNAPSHOT:
- Total pipeline: €${metrics.totalPipeline.toFixed(2)}
- Revenue this period: €${metrics.totalRevenue.toFixed(2)}
- Conversion rate: ${metrics.conversionRate}% (${metrics.acceptedCount} won, ${metrics.rejectedCount} lost, ${metrics.openCount} open)
- Proposals needing immediate attention: ${attentionSummary}
- Clients going cold: ${coldSummary}

Generate a sharp, actionable daily commercial briefing. Be specific with company names and values.

Respond with ONLY a single-line JSON object. No markdown. No code blocks. Start with { end with }.
{"headline":"One sentence executive summary of the commercial situation","urgent":["Specific action 1 with company name and value","Specific action 2","Specific action 3"],"opportunity":"One specific opportunity to pursue this week with rationale","risk":"One critical risk to monitor with specific client name","momentum":"brief"|"building"|"strong"|"declining"}`
}

async function logRun(row: Record<string, unknown>): Promise<void> {
  await fetch(`${REST}/agent_runs`, { method: 'POST', headers: { ...sbHeaders, Prefer: 'return=minimal' }, body: JSON.stringify(row) }).catch(() => {})
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  let trigger = 'cron'
  let onlyProfile: string | undefined
  try {
    const body = await req.json().catch(() => ({}))
    trigger = body?.trigger ?? 'cron'
    onlyProfile = body?.profileId
  } catch { /* defaults */ }

  try {
    const now = Date.now()
    const briefingDate = new Date(now).toISOString().slice(0, 10)
    const fourWeeksAgo = new Date(now - 28 * DAY_MS).toISOString()

    // Load everything once (service role), scope per profile in memory.
    const [profRes, propRes, custRes, intRes] = await Promise.all([
      fetch(`${REST}/profiles?select=id,role,full_name`, { headers: sbHeaders }),
      fetch(`${REST}/proposals?select=customer_id,total,outcome,reference,subject,created_at,created_by`, { headers: sbHeaders }),
      fetch(`${REST}/customers?select=id,company,created_by`, { headers: sbHeaders }),
      fetch(`${REST}/interactions?occurred_at=gte.${fourWeeksAgo}&select=customer_id,occurred_at`, { headers: sbHeaders }),
    ])
    const profiles: Profile[] = (await profRes.json()).filter((p: Profile) => !onlyProfile || p.id === onlyProfile)
    const allProposals: Proposal[] = await propRes.json()
    const allCustomers: Customer[] = await custRes.json()
    const allInteractions: Inter[] = await intRes.json()

    const results: Array<Record<string, unknown>> = []

    for (const profile of profiles) {
      const startedAt = Date.now()
      const isManager = profile.role === 'manager'
      const proposals = isManager ? allProposals : allProposals.filter((p) => p.created_by === profile.id)
      const customers = isManager ? allCustomers : allCustomers.filter((c) => c.created_by === profile.id)
      const customerIds = new Set(customers.map((c) => c.id))
      const interactions = isManager ? allInteractions : allInteractions.filter((i) => customerIds.has(i.customer_id))
      const customerMap = new Map(customers.map((c) => [c.id, c]))

      let totalPipeline = 0, totalRevenue = 0, acceptedCount = 0, rejectedCount = 0, openCount = 0
      for (const p of proposals) {
        if (p.outcome === 'accepted') { totalRevenue += Number(p.total ?? 0); acceptedCount++ }
        else if (p.outcome === 'rejected') { rejectedCount++ }
        else { totalPipeline += Number(p.total ?? 0); openCount++ }
      }
      const decided = acceptedCount + rejectedCount
      const conversionRate = decided > 0 ? Math.round((acceptedCount / decided) * 100) : 0

      // Attention: open proposals >= 4 days old
      const attention = proposals
        .filter((p) => (!p.outcome || p.outcome === 'open') && customerMap.has(p.customer_id))
        .map((p) => ({ p, daysOpen: daysSince(p.created_at, now), customer: customerMap.get(p.customer_id)! }))
        .filter((x) => x.daysOpen >= 4)
        .sort((a, b) => b.daysOpen - a.daysOpen).slice(0, 8)
      const attentionSummary = attention.length
        ? attention.map((x) => `${x.customer.company} ref:${x.p.reference} €${Number(x.p.total ?? 0).toFixed(2)} (${x.daysOpen} days open, ${x.daysOpen > 14 ? 'critical' : x.daysOpen >= 8 ? 'high' : 'medium'})`).join('; ')
        : 'none'

      // Cold risk: last activity (proposal or interaction) >= 14 days
      const lastActivity = new Map<string, string>()
      for (const p of proposals) { const e = lastActivity.get(p.customer_id); if (!e || p.created_at > e) lastActivity.set(p.customer_id, p.created_at) }
      for (const i of interactions) { const e = lastActivity.get(i.customer_id); if (!e || i.occurred_at > e) lastActivity.set(i.customer_id, i.occurred_at) }
      const cold = customers
        .map((c) => { const last = lastActivity.get(c.id); if (!last) return null; const d = daysSince(last, now); return d >= 14 ? { c, d } : null })
        .filter((x): x is { c: Customer; d: number } => x !== null)
        .sort((a, b) => b.d - a.d).slice(0, 6)
      const coldSummary = cold.length ? cold.map((x) => `${x.c.company} (${x.d} days inactive, ${x.d > 30 ? 'cold' : 'warm'})`).join('; ') : 'none'

      const metrics = { totalPipeline, totalRevenue, openCount, acceptedCount, rejectedCount, conversionRate }
      try {
        const res = await callClaudeWithUsage({ prompt: buildPrompt(metrics, attentionSummary, coldSummary), model: MODEL, maxTokens: 1200, temperature: 0.3 })
        const briefing = parseJsonStrict<Record<string, unknown>>(res.text)
        if (!briefing.headline) throw new Error('briefing missing headline')
        if (!Array.isArray(briefing.urgent)) briefing.urgent = []
        briefing.opportunity = briefing.opportunity ?? ''
        briefing.risk = briefing.risk ?? ''
        briefing.generatedAt = new Date().toISOString()

        const up = await fetch(`${REST}/daily_briefings?on_conflict=profile_id,briefing_date`, {
          method: 'POST',
          headers: { ...sbHeaders, Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify({ profile_id: profile.id, briefing, briefing_date: briefingDate }),
        })
        if (!up.ok) throw new Error(`briefing_upsert ${up.status}: ${await up.text()}`)

        await logRun({
          agent_name: 'briefing', trigger_type: trigger, model: res.model,
          input_tokens: res.usage.input_tokens, output_tokens: res.usage.output_tokens,
          cost_usd: claudeCostUsd(res.model, res.usage), duration_ms: Date.now() - startedAt, status: 'success',
          input: { profile_id: profile.id, role: profile.role }, output: { headline: briefing.headline },
        })
        results.push({ profile: profile.full_name, role: profile.role, status: 'success' })
      } catch (e) {
        await logRun({ agent_name: 'briefing', trigger_type: trigger, model: MODEL, status: 'error', error: String(e), duration_ms: Date.now() - startedAt, input: { profile_id: profile.id, role: profile.role } })
        results.push({ profile: profile.full_name, role: profile.role, status: 'error', error: String(e) })
      }
    }

    return new Response(JSON.stringify({ ok: true, briefing_date: briefingDate, profiles: results.length, results }), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  } catch (e) {
    await logRun({ agent_name: 'briefing', trigger_type: trigger, status: 'error', error: String(e) })
    return new Response(JSON.stringify({ error: 'agent_briefing_failed', detail: String(e) }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }
})
