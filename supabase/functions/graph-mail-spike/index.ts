import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {
  graphSecretsMissing,
  redactGraphSecrets,
  sendMailAppOnly,
  listMessagesAppOnly,
} from '../_shared/msgraph.ts'

// F1 spike (Microsoft layer): prove that app-only Graph works from the Supabase
// Deno edge runtime — client-credentials token, sendMail from GRAPH_SENDER_MAILBOX,
// and a read of the same mailbox (validates Mail.ReadWrite for the F6 phase).
// Deployed for the spike; the reusable client lives in _shared/msgraph.ts.
// Requires the four MS_*/GRAPH_* secrets (guia F0, Passo 5) + SPIKE_TEST_RECIPIENT.

Deno.serve(async () => {
  const missing = [...graphSecretsMissing()]
  if (!Deno.env.get('SPIKE_TEST_RECIPIENT')) missing.push('SPIKE_TEST_RECIPIENT')
  if (missing.length) {
    return new Response(
      JSON.stringify({ ok: false, error: `missing secrets: ${missing.join(', ')}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const result: {
    ok: boolean
    send: { ok: boolean; error?: string }
    read: { ok: boolean; count?: number; error?: string }
  } = { ok: false, send: { ok: false }, read: { ok: false } }

  try {
    await sendMailAppOnly({
      to: [Deno.env.get('SPIKE_TEST_RECIPIENT')!],
      subject: '[SPIKE] Microsoft Graph app-only from Supabase Edge Function',
      html: `<p>Graph spike (F1) sent at ${new Date().toISOString()} from the Supabase Deno edge runtime via client credentials.</p>`,
    })
    result.send.ok = true
  } catch (e) {
    const raw = e instanceof Error ? `${e.name}: ${e.message}` : String(e)
    result.send.error = redactGraphSecrets(raw)
  }

  // Read is reported separately: send can work while read is still blocked
  // (e.g. Application Access Policy propagating, or Mail.ReadWrite not consented).
  try {
    const messages = await listMessagesAppOnly({ top: 3 })
    result.read = { ok: true, count: messages.length }
  } catch (e) {
    const raw = e instanceof Error ? `${e.name}: ${e.message}` : String(e)
    result.read = { ok: false, error: redactGraphSecrets(raw) }
  }

  result.ok = result.send.ok && result.read.ok
  return new Response(JSON.stringify(result), {
    status: result.ok ? 200 : 500,
    headers: { 'Content-Type': 'application/json' },
  })
})
