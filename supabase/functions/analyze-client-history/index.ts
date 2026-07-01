import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { callClaudeWithUsage, claudeCostUsd, parseJsonStrict } from '../_shared/claude.ts'

// Client Analysis Agent (Phase 3, RAG). Given a customerId (+ optional question):
// gte-small query embedding → pgvector similarity over proposal_embeddings (similar deals from
// OTHER clients) + this client's own proposals/outcomes/interactions → Sonnet 4.6 synthesis,
// grounded strictly on the provided facts. Logs to agent_runs. Read-only; user-triggered.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const REST = `${SUPABASE_URL}/rest/v1`
const MODEL = 'claude-sonnet-4-6'

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

// gte-small at module scope so a warm worker reuses the loaded model.
const session = new (Supabase as unknown as { ai: { Session: new (m: string) => { run: (t: string, o: Record<string, unknown>) => Promise<number[]> } } }).ai.Session('gte-small')

type Proposal = {
  reference: string; subject: string; total: number; outcome: string; status: string; created_at: string
  items?: { product_name?: string; product_family?: string }[]
}
type Interaction = { type: string; content: string; occurred_at: string }
type Similar = { metadata: { company?: string; customer?: string; outcome?: string; total?: number; reference?: string } | null; similarity: number; content: string }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  const startedAt = Date.now()

  let customerId = ''
  let question = ''
  try {
    const body = await req.json()
    customerId = body?.customerId ?? ''
    question = (body?.question ?? '').toString().trim()
  } catch { /* handled below */ }
  if (!customerId) {
    return new Response(JSON.stringify({ error: 'customerId required' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }

  try {
    // 1. Facts: customer, this client's proposals + interactions (service role)
    const [custRes, propRes, intRes] = await Promise.all([
      fetch(`${REST}/customers?id=eq.${customerId}&select=company,name,country,email`, { headers: sbHeaders }),
      fetch(`${REST}/proposals?customer_id=eq.${customerId}&select=reference,subject,total,outcome,status,created_at,items&order=created_at.desc`, { headers: sbHeaders }),
      fetch(`${REST}/interactions?customer_id=eq.${customerId}&select=type,content,occurred_at&order=occurred_at.desc`, { headers: sbHeaders }),
    ])
    const customer = (await custRes.json())?.[0]
    if (!customer) throw new Error('customer not found')
    const proposals: Proposal[] = await propRes.json()
    const interactions: Interaction[] = await intRes.json()

    // Deterministic facts (DB-derived — never invented by the model)
    const accepted = proposals.filter((p) => p.outcome === 'accepted')
    const rejected = proposals.filter((p) => p.outcome === 'rejected')
    const open = proposals.filter((p) => p.outcome === 'open')
    const totals = proposals.map((p) => Number(p.total ?? 0)).filter((n) => n > 0)
    const facts = {
      proposalCount: proposals.length,
      acceptedCount: accepted.length,
      rejectedCount: rejected.length,
      openCount: open.length,
      revenue: +accepted.reduce((s, p) => s + Number(p.total ?? 0), 0).toFixed(2),
      openPipeline: +open.reduce((s, p) => s + Number(p.total ?? 0), 0).toFixed(2),
      priceMin: totals.length ? Math.min(...totals) : 0,
      priceMax: totals.length ? Math.max(...totals) : 0,
      interactionCount: interactions.length,
    }

    // 2. Similarity: embed the query, find similar deals from OTHER clients
    const queryText = question || `Commercial history and next best action for ${customer.company}. ${proposals.slice(0, 3).map((p) => p.subject).join('; ')}`
    const embedding = await session.run(queryText, { mean_pool: true, normalize: true })
    let similar: Similar[] = []
    const simRes = await fetch(`${REST}/rpc/match_proposal_embeddings`, {
      method: 'POST',
      headers: sbHeaders,
      body: JSON.stringify({ query_embedding: `[${embedding.join(',')}]`, match_count: 6, exclude_customer: customerId }),
    })
    if (simRes.ok) similar = await simRes.json()

    // 3. Build a grounded context block
    const propLines = proposals.length
      ? proposals.map((p) => `- ${p.reference} — ${p.subject} — €${Number(p.total ?? 0).toFixed(2)} — ${p.outcome} — ${p.created_at.slice(0, 10)}`).join('\n')
      : '(no proposals)'
    const intLines = interactions.length
      ? interactions.slice(0, 8).map((i) => `- ${i.occurred_at.slice(0, 10)} [${i.type}] ${String(i.content ?? '').slice(0, 200)}`).join('\n')
      : '(no interactions logged)'
    const simLines = similar.length
      ? similar.map((s) => `- ${s.metadata?.company ?? s.metadata?.customer ?? 'other client'} — €${Number(s.metadata?.total ?? 0).toFixed(2)} — ${s.metadata?.outcome ?? 'open'} (similarity ${s.similarity.toFixed(2)})`).join('\n')
      : '(none)'

    const prompt = `You are an elite B2B sales strategist analysing a commercial relationship for Kozegho, a Portuguese manufacturer of water treatment equipment.
Use ONLY the facts below. Never invent numbers, products, dates or events that are not present in the data. If data is missing, say so.

CUSTOMER: ${customer.company}${customer.country ? ` (${customer.country})` : ''}
FACTS (authoritative, computed from the database):
- Proposals: ${facts.proposalCount} (accepted ${facts.acceptedCount}, rejected ${facts.rejectedCount}, open ${facts.openCount})
- Revenue won: €${facts.revenue.toFixed(2)} | Open pipeline: €${facts.openPipeline.toFixed(2)}
- Historical proposal value range: €${facts.priceMin.toFixed(2)} – €${facts.priceMax.toFixed(2)}
- Logged interactions: ${facts.interactionCount}

THIS CLIENT'S PROPOSALS:
${propLines}

INTERACTIONS:
${intLines}

SIMILAR DEALS FROM OTHER CLIENTS (semantic match):
${simLines}

QUESTION: ${question || 'Summarise the relationship and recommend the next best action.'}

Respond with ONLY a single-line JSON object. No markdown, no code blocks. Start with { end with }.
{"summary":"1-2 sentences a salesperson sees as auto-context when creating a new proposal for this client, citing concrete numbers/products/outcomes from the facts above","analysis":"a short paragraph of deeper analysis grounded in the data","patterns":["win/loss pattern","historical price range","recurring products or themes","seasonality if any"],"next_best_action":"one concrete recommended next step"}`

    const res = await callClaudeWithUsage({ prompt, model: MODEL, maxTokens: 1200, temperature: 0.3 })
    const synth = parseJsonStrict<{ summary: string; analysis: string; patterns: string[]; next_best_action: string }>(res.text)

    const durationMs = Date.now() - startedAt
    await fetch(`${REST}/agent_runs`, {
      method: 'POST', headers: { ...sbHeaders, Prefer: 'return=minimal' },
      body: JSON.stringify({
        agent_name: 'client-analysis', trigger_type: 'user', model: res.model,
        input_tokens: res.usage.input_tokens, output_tokens: res.usage.output_tokens,
        cost_usd: claudeCostUsd(res.model, res.usage), duration_ms: durationMs, status: 'success',
        input: { customer_id: customerId, question: question || null },
        output: { summary: synth.summary },
      }),
    }).catch(() => {})

    return new Response(JSON.stringify({
      summary: synth.summary,
      analysis: synth.analysis,
      patterns: Array.isArray(synth.patterns) ? synth.patterns : [],
      next_best_action: synth.next_best_action,
      facts,
      similarCount: similar.length,
    }), { headers: { 'Content-Type': 'application/json', ...CORS } })
  } catch (e) {
    await fetch(`${REST}/agent_runs`, {
      method: 'POST', headers: { ...sbHeaders, Prefer: 'return=minimal' },
      body: JSON.stringify({
        agent_name: 'client-analysis', trigger_type: 'user', model: MODEL,
        status: 'error', error: String(e), duration_ms: Date.now() - startedAt,
        input: { customer_id: customerId },
      }),
    }).catch(() => {})
    return new Response(JSON.stringify({ error: 'client_analysis_failed', detail: String(e) }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }
})
