import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { callClaude, parseJsonStrict } from '../_shared/claude.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const CORS = {
  'Access-Control-Allow-Origin': 'https://kozegho-proposals.vercel.app',
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

  console.log('[analyze-relationship] body received:', JSON.stringify(body))
  console.log('[analyze-relationship] customerName:', customerName, '| proposalCount:', proposalCount, '| interactionCount:', interactionCount, '| emailCount:', emailCount, '| days:', daysSinceLastActivity)

  // Insufficient data — return a baseline result without calling the model
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

Respond with ONLY a JSON object on a single line. No markdown. No code blocks.
No line breaks inside the JSON. Start with { and end with }.

Example of the EXACT format required:
{"score":75,"temperature":"warm","analysis":"Brief analysis here.","opportunity":"Specific opportunity or null","suggestions":["Action 1","Action 2","Action 3"],"risk_flags":[]}`

  let rawText: string
  try {
    rawText = await callClaude({
      prompt,
      model: 'claude-sonnet-4-6',
      maxTokens: 1200,
      temperature: 0.4,
    })
  } catch (e) {
    console.log('[analyze-relationship] Claude error', String(e))
    return new Response(JSON.stringify({ error: 'anthropic_error', detail: String(e) }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }

  // Remove any accidental markdown if present
  if (rawText.startsWith('```')) {
    rawText = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  }

  console.log('[analyze-relationship] raw text length:', rawText.length)
  console.log('[analyze-relationship] raw text preview:', rawText.substring(0, 200))

  if (!rawText.startsWith('{')) {
    console.error('[analyze-relationship] Response does not start with {:', rawText)
    return new Response(
      JSON.stringify({ error: 'no_json', raw: rawText.substring(0, 200) }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } }
    )
  }

  let result: AnalysisResult
  try {
    result = parseJsonStrict<AnalysisResult>(rawText)
  } catch (parseError) {
    console.error('[analyze-relationship] JSON.parse failed:', String(parseError))
    return new Response(
      JSON.stringify({ error: 'parse_failed', raw: rawText.substring(0, 200) }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } }
    )
  }

  if (typeof result.score !== 'number') {
    console.error('[analyze-relationship] Missing score field. Result:', JSON.stringify(result))
    return new Response(
      JSON.stringify({ error: 'missing_score', raw: rawText.substring(0, 200) }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } }
    )
  }
  result.score = Math.max(0, Math.min(100, Math.round(result.score)))
  if (!Array.isArray(result.suggestions)) result.suggestions = []
  if (!Array.isArray(result.risk_flags)) result.risk_flags = []
  result.opportunity = result.opportunity ?? null

  await upsertScore(customerId, result)

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json', ...CORS }
  })
})
