// supabase/functions/_shared/claude.ts
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'

export type ClaudeOpts = {
  prompt: string
  system?: string
  model?: string          // default: claude-sonnet-4-6
  maxTokens?: number      // default: 1024
  temperature?: number    // default: 0.7
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
