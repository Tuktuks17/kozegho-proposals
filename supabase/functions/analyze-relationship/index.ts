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

type Payload = {
  customerId: string
  customerName: string
  proposalCount: number
  pipelineTotal: number
  revenueTotal: number
  acceptedCount: number
  rejectedCount: number
  openCount: number
  interactionCount: number
  interactionTypes: string
  emailCount: number
  daysSinceLastActivity: number
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

  const {
    customerId, customerName,
    proposalCount, pipelineTotal, revenueTotal,
    acceptedCount, rejectedCount, openCount,
    interactionCount, interactionTypes,
    emailCount, daysSinceLastActivity,
  } = body

  console.log('[analyze-relationship] customer:', customerName, '| proposals:', proposalCount, '| interactions:', interactionCount, '| emails:', emailCount, '| days:', daysSinceLastActivity)

  // Insufficient data — return a baseline result without calling Gemini
  if (proposalCount === 0 && interactionCount === 0 && (emailCount ?? 0) === 0) {
    const fallback: AnalysisResult = {
      score: 0,
      temperature: 'cold',
      analysis: 'Insufficient data to analyse this relationship. Log interactions or create proposals to generate insights.',
      opportunity: null,
      suggestions: [
        'Create a commercial proposal to initiate the relationship.',
        'Log a first interaction to start tracking engagement.',
        "Research the customer's industry to identify relevant Kozegho products.",
      ],
      risk_flags: ['No engagement data recorded.'],
    }
    await upsertScore(customerId, fallback)
    return new Response(JSON.stringify(fallback), {
      headers: { 'Content-Type': 'application/json', ...CORS }
    })
  }

  const prompt = `You are an elite B2B sales strategist with 20 years of experience in industrial equipment sales across Europe. You are analysing a commercial relationship for Kozegho, a Portuguese manufacturer of water treatment and industrial process equipment (polymer preparation systems, mixers, dosing systems, tanks, controllers).

Your role is to act as a proactive commercial advisor — not just describe what happened, but prescribe what should happen next.

CUSTOMER DATA:
- Company: ${customerName}
- Proposals sent: ${proposalCount} (total pipeline: €${(pipelineTotal ?? 0).toFixed(2)})
- Accepted: ${acceptedCount} proposals (€${(revenueTotal ?? 0).toFixed(2)})
- Rejected: ${rejectedCount} proposals
- Open/pending: ${openCount} proposals
- Logged interactions: ${interactionCount} (${interactionTypes || 'none'})
- Emails exchanged: ${emailCount ?? 0}
- Days since last activity: ${daysSinceLastActivity ?? 'unknown'}

Analyse this relationship and respond ONLY with a valid JSON object. No markdown, no code blocks, no explanations outside the JSON.

{"score":<integer 0-100 based on: engagement frequency 30%, conversion rate 30%, recency 20%, revenue potential 20%>,"temperature":<"hot" if score>=70, "warm" if score>=40, "cold" if score<40>,"analysis":"<2-3 sentences of sharp, specific commercial analysis — mention actual numbers, identify the pattern, name the opportunity or risk>","opportunity":"<one specific, time-bound commercial opportunity OR null if none detected>","suggestions":["<specific action 1 — who does what, when, how>","<specific action 2 — tied to the data above>","<specific action 3 — proactive, not reactive>"],"risk_flags":["<specific risk if any, else empty array>"]}`

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
    console.log('[analyze-relationship] Gemini error', resp.status, detail)
    return new Response(JSON.stringify({ error: 'gemini_error', detail }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }

  const geminiData = await resp.json()
  let rawText: string = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

  let result: AnalysisResult
  try {
    // Strip markdown code blocks
    rawText = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
    // Extract only the JSON object — take everything between first { and last }
    const jsonStart = rawText.indexOf('{')
    const jsonEnd = rawText.lastIndexOf('}')
    if (jsonStart === -1 || jsonEnd === -1) throw new Error('No JSON object found in Gemini response')
    rawText = rawText.slice(jsonStart, jsonEnd + 1)
    result = JSON.parse(rawText) as AnalysisResult
    if (typeof result.score !== 'number') throw new Error('missing score')
    result.score = Math.max(0, Math.min(100, Math.round(result.score)))
    if (!Array.isArray(result.suggestions)) result.suggestions = []
    if (!Array.isArray(result.risk_flags)) result.risk_flags = []
    result.opportunity = result.opportunity ?? null
  } catch {
    console.log('[analyze-relationship] JSON parse failed. Raw:', rawText.slice(0, 300))
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
