import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { callClaude, parseJsonStrict } from '../_shared/claude.ts'

const CORS = {
  'Access-Control-Allow-Origin': 'https://kozegho-proposals.vercel.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type AttentionItem = {
  customerName: string
  reference: string
  total: number
  daysOpen: number
  urgency: string
}

type ColdRiskItem = {
  customerName: string
  daysSinceLastActivity: number
  temperature: string
}

type Payload = {
  metrics: {
    totalPipeline: number
    totalRevenue: number
    openCount: number
    acceptedCount: number
    rejectedCount: number
    conversionRate: number
  }
  attentionItems: AttentionItem[]
  coldRiskItems: ColdRiskItem[]
}

type BriefingResult = {
  headline: string
  urgent: string[]
  opportunity: string
  risk: string
  momentum: 'brief' | 'building' | 'strong' | 'declining'
  generatedAt: string
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

  const { metrics, attentionItems = [], coldRiskItems = [] } = body
  const { totalPipeline, totalRevenue, openCount, acceptedCount, rejectedCount, conversionRate } = metrics

  const attentionSummary = attentionItems.length > 0
    ? attentionItems
        .map(i => `${i.customerName} ref:${i.reference} €${i.total.toFixed(2)} (${i.daysOpen} days open, ${i.urgency})`)
        .join('; ')
    : 'none'

  const coldSummary = coldRiskItems.length > 0
    ? coldRiskItems
        .map(i => `${i.customerName} (${i.daysSinceLastActivity} days inactive, ${i.temperature})`)
        .join('; ')
    : 'none'

  console.log('[analyze-portfolio] metrics:', JSON.stringify(metrics))
  console.log('[analyze-portfolio] attention items:', attentionItems.length, '| cold risk:', coldRiskItems.length)

  const prompt = `You are an elite B2B sales strategist advising the Sales Manager of Kozegho, a Portuguese manufacturer of water treatment and industrial process equipment.

PORTFOLIO SNAPSHOT:
- Total pipeline: €${totalPipeline.toFixed(2)}
- Revenue this period: €${totalRevenue.toFixed(2)}
- Conversion rate: ${conversionRate}% (${acceptedCount} won, ${rejectedCount} lost, ${openCount} open)
- Proposals needing immediate attention: ${attentionSummary}
- Clients going cold: ${coldSummary}

Generate a sharp, actionable daily commercial briefing. Be specific with company names and values.

Respond with ONLY a single-line JSON object. No markdown. No code blocks. Start with { end with }.
{"headline":"One sentence executive summary of the commercial situation","urgent":["Specific action 1 with company name and value","Specific action 2","Specific action 3"],"opportunity":"One specific opportunity to pursue this week with rationale","risk":"One critical risk to monitor with specific client name","momentum":"brief"|"building"|"strong"|"declining"}`

  let rawText: string
  try {
    rawText = await callClaude({
      prompt,
      model: 'claude-haiku-4-5-20251001',
      maxTokens: 1200,
      temperature: 0.3,
    })
  } catch (e) {
    console.log('[analyze-portfolio] Claude error', String(e))
    return new Response(JSON.stringify({ error: 'anthropic_error', detail: String(e) }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }

  if (rawText.startsWith('```')) {
    rawText = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  }

  console.log('[analyze-portfolio] raw text length:', rawText.length)
  console.log('[analyze-portfolio] raw text preview:', rawText.substring(0, 200))

  if (!rawText.startsWith('{')) {
    console.error('[analyze-portfolio] Response does not start with {:', rawText)
    return new Response(
      JSON.stringify({ error: 'no_json', raw: rawText.substring(0, 200) }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } }
    )
  }

  let result: BriefingResult
  try {
    result = parseJsonStrict<BriefingResult>(rawText)
  } catch (parseError) {
    console.error('[analyze-portfolio] JSON.parse failed:', String(parseError))
    return new Response(
      JSON.stringify({ error: 'parse_failed', raw: rawText.substring(0, 200) }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } }
    )
  }

  if (!result.headline) {
    console.error('[analyze-portfolio] Missing headline field. Result:', JSON.stringify(result))
    return new Response(
      JSON.stringify({ error: 'missing_headline', raw: rawText.substring(0, 200) }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } }
    )
  }

  if (!Array.isArray(result.urgent)) result.urgent = []
  result.opportunity = result.opportunity ?? ''
  result.risk = result.risk ?? ''
  result.generatedAt = new Date().toISOString()

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json', ...CORS }
  })
})
