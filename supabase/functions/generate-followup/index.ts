import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type Payload = {
  customerName: string
  customerEmail: string
  proposalReference: string
  proposalSubject: string
  proposalTotal: number
  proposalCreatedAt: string
  daysOpen: number
  salespersonName: string
  interactionHistory: string
}

type DraftResult = {
  subject: string
  body: string
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
    customerName,
    proposalReference,
    proposalSubject,
    proposalTotal,
    daysOpen,
    salespersonName,
    interactionHistory,
  } = body

  console.log('[generate-followup] customer:', customerName, '| ref:', proposalReference, '| days open:', daysOpen)

  const prompt = `You are an expert B2B sales consultant writing a follow-up email for Kozegho, a Portuguese manufacturer of water treatment equipment.

Write a professional, concise follow-up email for this situation:
- Customer: ${customerName}
- Proposal: ${proposalReference} — ${proposalSubject}
- Value: €${proposalTotal.toFixed(2)}
- Sent: ${daysOpen} days ago
- Salesperson: ${salespersonName}
- Previous interactions: ${interactionHistory || 'none recorded'}

The email must:
1. Reference the specific proposal by reference number
2. Be warm but professional
3. Offer to answer questions or arrange a call
4. Not be pushy or desperate
5. Be concise (3-4 short paragraphs max)
6. Be in English unless the interaction history clearly indicates another language

Respond with ONLY a single-line JSON object. No markdown. No code blocks. Start with { end with }.
{"subject":"Re: Kozegho Commercial Proposal – ${proposalReference}","body":"Full email body in HTML with <p> tags only"}`

  const resp = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 8192 },
    }),
  })

  if (!resp.ok) {
    const detail = await resp.text()
    console.log('[generate-followup] Gemini error', resp.status, detail)
    return new Response(JSON.stringify({ error: 'gemini_error', detail }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }

  const geminiData = await resp.json()
  let rawText: string = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  rawText = rawText.trim()

  if (rawText.startsWith('```')) {
    rawText = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  }

  console.log('[generate-followup] raw text length:', rawText.length)
  console.log('[generate-followup] raw text preview:', rawText.substring(0, 200))

  if (!rawText.startsWith('{')) {
    console.error('[generate-followup] Response does not start with {:', rawText)
    return new Response(
      JSON.stringify({ error: 'no_json', raw: rawText.substring(0, 200) }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } }
    )
  }

  let result: DraftResult
  try {
    result = JSON.parse(rawText) as DraftResult
  } catch (parseError) {
    console.error('[generate-followup] JSON.parse failed:', String(parseError))
    return new Response(
      JSON.stringify({ error: 'parse_failed', raw: rawText.substring(0, 200) }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } }
    )
  }

  if (!result.subject || !result.body) {
    console.error('[generate-followup] Missing subject or body. Result:', JSON.stringify(result))
    return new Response(
      JSON.stringify({ error: 'missing_fields', raw: rawText.substring(0, 200) }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } }
    )
  }

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json', ...CORS }
  })
})
