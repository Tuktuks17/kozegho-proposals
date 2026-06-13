import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { callClaude } from '../_shared/claude.ts'

type Payload = {
  products: string[]
  clientCountry: string
  language: 'PT' | 'ES' | 'FR' | 'EN'
  salespersonName: string
  companyName: string
}

const LANGUAGE_INSTRUCTION: Record<Payload['language'], string> = {
  PT: 'Responde em português europeu, tom profissional mas próximo.',
  ES: 'Responde en español (España), tono profesional y cordial.',
  FR: 'Réponds en français, ton professionnel et courtois.',
  EN: 'Reply in professional British English.'
}

const CORS = {
  'Access-Control-Allow-Origin': 'https://kozegho-proposals.vercel.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS })
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
Write exactly 3 to 4 complete sentences. Each sentence must end with a full stop. Do not truncate mid-sentence.
    `.trim()

    let text: string
    try {
      text = await callClaude({ prompt, model: 'claude-sonnet-4-6', maxTokens: 600 })
    } catch (e) {
      return new Response(JSON.stringify({ error: 'anthropic_error', detail: String(e) }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...CORS }
      })
    }

    return new Response(JSON.stringify({ introduction: text }), {
      headers: { 'Content-Type': 'application/json', ...CORS }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: 'bad_request', detail: String(e) }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS }
    })
  }
})
