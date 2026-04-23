import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

type Payload = {
  products: string[]
  clientCountry: string
  language: 'PT' | 'DE' | 'ES' | 'FR' | 'EN'
  salespersonName: string
  companyName: string
}

const LANGUAGE_INSTRUCTION: Record<Payload['language'], string> = {
  PT: 'Responde em português europeu, tom profissional mas próximo.',
  DE: 'Antworte auf Deutsch, professioneller, höflicher Ton.',
  ES: 'Responde en español (España), tono profesional y cordial.',
  FR: 'Réponds en français, ton professionnel et courtois.',
  EN: 'Reply in professional British English.'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    })
  }
  try {
    const body = (await req.json()) as Payload
    const prompt = `
You are a sales assistant for Kozegho, a Portuguese manufacturer of mixers,
dosing systems, tanks and controllers for water treatment and industrial processes.
Write a professional 3 to 4 sentence introduction for a commercial proposal.
Do not use bullet points. Do not include a subject line or greeting. Start directly
with the body. Do not add a signature.
${LANGUAGE_INSTRUCTION[body.language]}
Context: Client: ${body.companyName} (${body.clientCountry}). Products: ${body.products.join(', ')}. Salesperson: ${body.salespersonName}.
The introduction must: 1) Thank ${body.companyName} for the opportunity. 2) Reference the specific products. 3) Briefly mention Kozegho's expertise in water treatment. 4) Express availability for follow-up.
    `.trim()

    const resp = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 400 }
      })
    })

    if (!resp.ok) {
      const err = await resp.text()
      return new Response(JSON.stringify({ error: 'gemini_error', detail: err }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      })
    }

    const data = await resp.json()
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''
    return new Response(JSON.stringify({ introduction: text }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: 'bad_request', detail: String(e) }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  }
})
