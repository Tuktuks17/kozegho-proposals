import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { callClaudeWithUsage, claudeCostUsd } from '../_shared/claude.ts'

// Market Intelligence Agent (Phase 4, Sonnet 4.6 + web_search server tool). Weekly cron.
// Researches the water-treatment sector across PT/ES/FR/UK, competitor moves and client news,
// stores a digest in market_digests (rendered as cards in the Intelligence Hub). Logs to agent_runs.
// NOTE: the web_search tool bills a per-search fee on top of tokens; the logged cost_usd is
// the token cost only (an underestimate) — the search fee is residual at weekly volume.

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

const PROMPT = `You are a market intelligence analyst for Kozegho, a Portuguese manufacturer of water treatment and industrial process equipment (polymer preparation systems, dosing systems, mixers, controllers). Research CURRENT developments (favour the last ~30 days) relevant to Kozegho's commercial team.

Use web search to investigate, across Portugal, Spain, France and the United Kingdom:
1. Water-treatment sector developments, regulation changes, and public tenders.
2. Competitor moves — other manufacturers of dosing / polymer preparation / water-treatment equipment.
3. Industry trends and notable news about active industrial water-treatment buyers.

Then produce a concise digest of 5 to 7 items. Base every item on what you actually found — do not invent developments.

Respond with ONLY a single-line JSON object as the FINAL thing you output. No markdown, no code fences. It must start with { and end with }.
{"items":[{"title":"short headline","summary":"1-2 sentence summary","category":"regulation|competitor|tender|trend|client","region":"PT|ES|FR|UK|EU","source":"source URL if available, else empty string"}]}`

async function logRun(row: Record<string, unknown>): Promise<void> {
  await fetch(`${REST}/agent_runs`, { method: 'POST', headers: { ...sbHeaders, Prefer: 'return=minimal' }, body: JSON.stringify(row) }).catch(() => {})
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
    const res = await callClaudeWithUsage({
      prompt: PROMPT,
      model: MODEL,
      maxTokens: 3000,
      temperature: 0.4,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 6 }],
    })

    // The response text is Claude's prose + the final JSON digest; extract the JSON object.
    const first = res.text.indexOf('{')
    const last = res.text.lastIndexOf('}')
    if (first === -1 || last === -1) throw new Error(`no JSON in response: ${res.text.slice(0, 200)}`)
    const parsed = JSON.parse(res.text.slice(first, last + 1)) as { items?: unknown[] }
    const items = Array.isArray(parsed.items) ? parsed.items : []
    if (items.length === 0) throw new Error('digest had no items')

    const digest = { items, generatedAt: new Date().toISOString() }
    const ins = await fetch(`${REST}/market_digests`, {
      method: 'POST',
      headers: { ...sbHeaders, Prefer: 'return=minimal' },
      body: JSON.stringify({ digest, period: 'weekly' }),
    })
    if (!ins.ok) throw new Error(`digest_insert ${ins.status}: ${await ins.text()}`)

    await logRun({
      agent_name: 'market-intelligence', trigger_type: trigger, model: res.model,
      input_tokens: res.usage.input_tokens, output_tokens: res.usage.output_tokens,
      cost_usd: claudeCostUsd(res.model, res.usage), duration_ms: Date.now() - startedAt, status: 'success',
      input: { region: 'PT/ES/FR/UK' }, output: { item_count: items.length },
    })

    return new Response(JSON.stringify({ ok: true, item_count: items.length, durationMs: Date.now() - startedAt }), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  } catch (e) {
    await logRun({ agent_name: 'market-intelligence', trigger_type: trigger, model: MODEL, status: 'error', error: String(e), duration_ms: Date.now() - startedAt })
    return new Response(JSON.stringify({ error: 'market_intelligence_failed', detail: String(e) }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }
})
