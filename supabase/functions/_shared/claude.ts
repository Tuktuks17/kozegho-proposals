// supabase/functions/_shared/claude.ts
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'

export type ClaudeOpts = {
  prompt: string
  system?: string
  model?: string          // default: claude-sonnet-4-6
  maxTokens?: number      // default: 1024
  temperature?: number    // default: 0.7
  tools?: unknown[]       // server tools (e.g. web_search) — used by callClaudeWithUsage only
}

export async function callClaude(opts: ClaudeOpts): Promise<string> {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not configured')
  const resp = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: opts.model ?? 'claude-sonnet-4-6',
      max_tokens: opts.maxTokens ?? 1024,
      temperature: opts.temperature ?? 0.7,
      ...(opts.system ? { system: opts.system } : {}),
      messages: [{ role: 'user', content: opts.prompt }],
    }),
  })
  if (!resp.ok) {
    const detail = await resp.text()
    throw new Error(`anthropic_error ${resp.status}: ${detail}`)
  }
  const data = await resp.json()
  return (data.content ?? [])
    .filter((b: { type: string }) => b.type === 'text')
    .map((b: { text: string }) => b.text)
    .join('')
    .trim()
}

// Para funções que exigem JSON estrito (analyze-*, generate-followup)
export function parseJsonStrict<T>(raw: string): T {
  const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  return JSON.parse(clean) as T
}

// ── Usage-aware variant (agents that must log tokens/cost to agent_runs) ────────
// Same call as callClaude but returns token usage + resolved model. callClaude above
// is left untouched (the 4 Phase-0 functions depend on its string return shape).
export type ClaudeUsage = { input_tokens: number; output_tokens: number }
export type ClaudeResult = { text: string; model: string; usage: ClaudeUsage }

// Price per 1M tokens (in / out) — keep in sync with strategy doc §3 routing table.
const MODEL_PRICING: Record<string, { in: number; out: number }> = {
  'claude-haiku-4-5-20251001': { in: 1, out: 5 },
  'claude-sonnet-4-6': { in: 3, out: 15 },
  'claude-fable-5': { in: 10, out: 50 },
}

export function claudeCostUsd(model: string, usage: ClaudeUsage): number {
  const p = MODEL_PRICING[model] ?? MODEL_PRICING['claude-sonnet-4-6']
  return +(usage.input_tokens / 1_000_000 * p.in + usage.output_tokens / 1_000_000 * p.out).toFixed(5)
}

export async function callClaudeWithUsage(opts: ClaudeOpts): Promise<ClaudeResult> {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not configured')
  const requestedModel = opts.model ?? 'claude-sonnet-4-6'
  const resp = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: requestedModel,
      max_tokens: opts.maxTokens ?? 1024,
      temperature: opts.temperature ?? 0.7,
      ...(opts.system ? { system: opts.system } : {}),
      ...(opts.tools ? { tools: opts.tools } : {}),
      messages: [{ role: 'user', content: opts.prompt }],
    }),
  })
  if (!resp.ok) {
    const detail = await resp.text()
    throw new Error(`anthropic_error ${resp.status}: ${detail}`)
  }
  const data = await resp.json()
  const text = (data.content ?? [])
    .filter((b: { type: string }) => b.type === 'text')
    .map((b: { text: string }) => b.text)
    .join('')
    .trim()
  return {
    text,
    model: data.model ?? requestedModel,
    usage: {
      input_tokens: data.usage?.input_tokens ?? 0,
      output_tokens: data.usage?.output_tokens ?? 0,
    },
  }
}
