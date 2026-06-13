import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

// Generates gte-small (384-dim) embeddings for proposals — the vector memory for the
// Client Analysis RAG agent. Backfills proposals missing an embedding, or refreshes one
// proposal when called with { proposalId }. Runs daily via pg_cron to catch new proposals.
// All DB access uses the service role (bypasses RLS); writes to proposal_embeddings are
// service-role-only by design (Phase 1 foundation).

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const REST = `${SUPABASE_URL}/rest/v1`

const sbHeaders = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
}

const CORS = {
  'Access-Control-Allow-Origin': 'https://kozegho-proposals.vercel.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type Item = {
  product_name?: string
  description?: string
  product_id?: string
  quantity?: number
  unit_price?: number
  options?: { label?: string }[]
}

type Proposal = {
  id: string
  reference: string
  subject: string
  language: string
  status: string
  outcome: string
  subtotal: number
  total: number
  introduction: string | null
  additional_notes: string | null
  delivery_weeks: number | null
  delivery_terms: string | null
  payment_terms: string | null
  warranty: string | null
  salesperson_name: string
  created_at: string
  items: Item[]
  customers?: { name?: string; company?: string; country?: string } | null
}

function buildContent(p: Proposal): string {
  const c = p.customers || {}
  const itemsText = (Array.isArray(p.items) ? p.items : []).map((it) => {
    const opts = Array.isArray(it.options) && it.options.length
      ? ` [options: ${it.options.map((o) => o?.label).filter(Boolean).join(', ')}]`
      : ''
    const qty = it.quantity != null ? ` x${it.quantity}` : ''
    const price = it.unit_price != null ? ` €${it.unit_price}` : ''
    return `${it.product_name || it.description || it.product_id || 'item'}${qty}${price}${opts}`
  }).filter(Boolean).join('; ')

  return [
    `Customer: ${c.name ?? 'unknown'}${c.company ? ` (${c.company})` : ''}${c.country ? `, ${c.country}` : ''}`,
    `Proposal ${p.reference} [${p.language}] — ${p.subject}`,
    `Status: ${p.status}; Outcome: ${p.outcome}`,
    itemsText ? `Products: ${itemsText}` : '',
    `Subtotal €${Number(p.subtotal ?? 0).toFixed(2)}; Total €${Number(p.total ?? 0).toFixed(2)}`,
    (p.delivery_weeks != null || p.delivery_terms)
      ? `Delivery: ${p.delivery_weeks != null ? p.delivery_weeks + ' weeks; ' : ''}${p.delivery_terms ?? ''}`
      : '',
    p.payment_terms ? `Payment: ${p.payment_terms}` : '',
    p.warranty ? `Warranty: ${p.warranty}` : '',
    p.additional_notes ? `Notes: ${p.additional_notes}` : '',
    p.introduction ? `Introduction: ${p.introduction}` : '',
  ].filter(Boolean).join('\n')
}

const SELECT_COLS =
  'id,reference,subject,language,status,outcome,subtotal,total,introduction,additional_notes,delivery_weeks,delivery_terms,payment_terms,warranty,salesperson_name,created_at,items,customers(name,company,country)'

// Model session at module scope so a warm worker reuses the loaded gte-small model across
// invocations (the model load is the dominant CPU cost). Inference is CPU-heavy, so each
// invocation processes only a small batch (see `limit`) to stay under the worker CPU budget.
const session = new (Supabase as unknown as { ai: { Session: new (m: string) => { run: (t: string, o: Record<string, unknown>) => Promise<number[]> } } }).ai.Session('gte-small')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const startedAt = Date.now()
  let trigger = 'user'
  let proposalId: string | undefined
  let limit = 5 // batch size per invocation — gte-small inference is CPU-heavy; large batches hit WORKER_RESOURCE_LIMIT. 5 stays safely under the CPU budget; the daily cron + re-invocation drain any backlog.
  try {
    const body = await req.json().catch(() => ({}))
    trigger = body?.trigger ?? 'user'
    proposalId = body?.proposalId
    if (Number(body?.limit) > 0) limit = Number(body.limit)
  } catch { /* default trigger */ }

  try {
    // 1. Determine which proposals to embed
    let proposals: Proposal[] = []
    if (proposalId) {
      const r = await fetch(`${REST}/proposals?id=eq.${proposalId}&select=${encodeURIComponent(SELECT_COLS)}`, { headers: sbHeaders })
      if (!r.ok) throw new Error(`fetch_proposal ${r.status}: ${await r.text()}`)
      proposals = await r.json()
      // refresh: drop any existing embedding for this proposal first
      await fetch(`${REST}/proposal_embeddings?proposal_id=eq.${proposalId}`, { method: 'DELETE', headers: sbHeaders })
    } else {
      const [pr, er] = await Promise.all([
        fetch(`${REST}/proposals?select=${encodeURIComponent(SELECT_COLS)}`, { headers: sbHeaders }),
        fetch(`${REST}/proposal_embeddings?select=proposal_id`, { headers: sbHeaders }),
      ])
      if (!pr.ok) throw new Error(`fetch_proposals ${pr.status}: ${await pr.text()}`)
      if (!er.ok) throw new Error(`fetch_existing ${er.status}: ${await er.text()}`)
      const allProposals: Proposal[] = await pr.json()
      const existing: { proposal_id: string }[] = await er.json()
      const have = new Set(existing.map((e) => e.proposal_id))
      proposals = allProposals.filter((p) => !have.has(p.id))
    }

    // Cap this invocation to `limit` proposals; the rest are caught by re-invocation / the daily cron.
    const remainingBefore = proposals.length
    if (!proposalId && proposals.length > limit) proposals = proposals.slice(0, limit)

    // 2. Embed
    const rows: Record<string, unknown>[] = []
    for (const p of proposals) {
      const content = buildContent(p)
      const embedding: number[] = await session.run(content, { mean_pool: true, normalize: true })
      rows.push({
        proposal_id: p.id,
        content,
        embedding: `[${embedding.join(',')}]`,
        metadata: {
          reference: p.reference,
          outcome: p.outcome,
          status: p.status,
          total: p.total,
          language: p.language,
          customer: p.customers?.name ?? null,
          company: p.customers?.company ?? null,
          country: p.customers?.country ?? null,
          created_at: p.created_at,
        },
      })
    }

    // 3. Insert in chunks
    let embedded = 0
    for (let i = 0; i < rows.length; i += 25) {
      const chunk = rows.slice(i, i + 25)
      const ins = await fetch(`${REST}/proposal_embeddings`, {
        method: 'POST',
        headers: { ...sbHeaders, Prefer: 'return=minimal' },
        body: JSON.stringify(chunk),
      })
      if (!ins.ok) throw new Error(`insert_failed ${ins.status}: ${await ins.text()}`)
      embedded += chunk.length
    }

    const durationMs = Date.now() - startedAt
    await fetch(`${REST}/agent_runs`, {
      method: 'POST',
      headers: { ...sbHeaders, Prefer: 'return=minimal' },
      body: JSON.stringify({
        agent_name: 'embed-proposals',
        trigger_type: trigger,
        model: 'gte-small',
        status: 'success',
        duration_ms: durationMs,
        cost_usd: 0,
        input: { proposalId: proposalId ?? null, candidates: proposals.length },
        output: { embedded, remaining: Math.max(0, remainingBefore - embedded) },
      }),
    }).catch(() => {})

    return new Response(JSON.stringify({ ok: true, embedded, remaining: Math.max(0, remainingBefore - embedded), durationMs }), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  } catch (e) {
    const durationMs = Date.now() - startedAt
    await fetch(`${REST}/agent_runs`, {
      method: 'POST',
      headers: { ...sbHeaders, Prefer: 'return=minimal' },
      body: JSON.stringify({
        agent_name: 'embed-proposals',
        trigger_type: trigger,
        model: 'gte-small',
        status: 'error',
        error: String(e),
        duration_ms: durationMs,
      }),
    }).catch(() => {})
    return new Response(JSON.stringify({ error: 'embed_failed', detail: String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }
})
