import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type ProposalInput = { reference: string; subject: string; total: number; outcome?: string | null; created_at: string }
type InteractionInput = { type: string; content: string; occurred_at: string }

type Payload = {
  customerId: string
  customerName: string
  proposals: ProposalInput[]
  interactions: InteractionInput[]
  emailCount: number
}

type AnalysisResult = {
  score: number
  temperature: 'hot' | 'warm' | 'cold'
  analysis: string
  opportunity: string | null
  suggestions: string[]
  risk_flags: string[]
}

async function upsertScore(customerId: string, result: AnalysisResult): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/relationship_scores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        customer_id: customerId,
        score: result.score,
        temperature: result.temperature,
        analysis: result.analysis,
        opportunity: result.opportunity,
        suggestions: result.suggestions,
        risk_flags: result.risk_flags,
        last_analyzed: new Date().toISOString(),
      }),
    })
  } catch { /* non-fatal — analysis still returned to frontend */ }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS })
  }

  if (!GEMINI_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'GEMINI_API_KEY not configured on this Edge Function' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } }
    )
  }

  let body: Payload
  try {
    body = (await req.json()) as Payload
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...CORS } }
    )
  }

  const { customerId, customerName, proposals, interactions, emailCount } = body

  // Insufficient data — return a baseline result without calling Gemini
  if (proposals.length === 0 && interactions.length === 0 && emailCount === 0) {
    const fallback: AnalysisResult = {
      score: 0,
      temperature: 'cold',
      analysis: 'Insufficient data to analyse this relationship. Log interactions or create proposals to generate insights.',
      opportunity: null,
      suggestions: [
        'Create a commercial proposal to initiate the relationship.',
        'Log a first interaction to start tracking engagement.',
        'Research the customer\'s industry to identify relevant Kozegho products.',
      ],
      risk_flags: ['No engagement data recorded.'],
    }
    await upsertScore(customerId, fallback)
    return new Response(JSON.stringify(fallback), {
      headers: { 'Content-Type': 'application/json', ...CORS }
    })
  }

  // Build prompt context
  const totalValue = proposals.reduce((s, p) => s + (p.total ?? 0), 0)
  const accepted = proposals.filter(p => p.outcome === 'accepted').length
  const rejected = proposals.filter(p => p.outcome === 'rejected').length
  const openCount = proposals.filter(p => !p.outcome || p.outcome === 'open').length
  const interactionTypes = [...new Set(interactions.map(i => i.type))].join(', ') || 'none'
  const allDates = [
    ...proposals.map(p => p.created_at),
    ...interactions.map(i => i.occurred_at),
  ].sort().reverse()
  const lastDate = allDates[0] ? new Date(allDates[0]).toDateString() : 'unknown'

  const prompt = `You are a senior sales analyst for Kozegho, a Portuguese manufacturer of water treatment equipment.
Analyse the commercial relationship with this customer and respond ONLY in valid JSON with no markdown and no code blocks.
Customer: ${customerName}
Proposals sent: ${proposals.length} (total value: €${totalValue.toFixed(2)}), outcomes: ${accepted} accepted / ${rejected} rejected / ${openCount} open
Interactions logged: ${interactions.length} (types: ${interactionTypes})
Emails exchanged: ${emailCount}
Most recent activity: ${lastDate}

Respond with exactly this JSON structure (no other text before or after):
{
  "score": <integer 0-100 based on engagement, conversion rate, and recency>,
  "temperature": <"hot" | "warm" | "cold">,
  "analysis": "<2-3 sentences, professional British English, specific to this customer's actual data>",
  "opportunity": <"<specific opportunity if clearly detected>" | null>,
  "suggestions": ["<concrete action 1>", "<concrete action 2>", "<concrete action 3>"],
  "risk_flags": ["<risk 1>"]
}`

  const resp = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 1000 },
    }),
  })

  if (!resp.ok) {
    const detail = await resp.text()
    return new Response(JSON.stringify({ error: 'gemini_error', detail }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }

  const geminiData = await resp.json()
  const rawText: string = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''

  let result: AnalysisResult
  try {
    const clean = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    result = JSON.parse(clean) as AnalysisResult
    if (typeof result.score !== 'number') throw new Error('missing score')
    result.score = Math.max(0, Math.min(100, Math.round(result.score)))
    if (!Array.isArray(result.suggestions)) result.suggestions = []
    if (!Array.isArray(result.risk_flags)) result.risk_flags = []
    result.opportunity = result.opportunity ?? null
  } catch {
    return new Response(
      JSON.stringify({ error: 'Failed to parse AI response. Try again.', raw: rawText }),
      { status: 502, headers: { 'Content-Type': 'application/json', ...CORS } }
    )
  }

  await upsertScore(customerId, result)

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json', ...CORS }
  })
})
