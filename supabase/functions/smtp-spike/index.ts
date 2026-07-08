import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import nodemailer from 'npm:nodemailer@8'

// M0 spike (Mail Sender fusion): prove whether the company SmarterMail SMTP is reachable
// from the Supabase Deno edge runtime. Attempt A = nodemailer via npm specifier.
// Sends ONE plain-text email and answers { ok, attempt, messageId?, error? }.
// This function is deployed only for the spike and removed afterwards; the source stays
// in the repo as the M4 reference implementation.

const REQUIRED = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_SECURE',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM_EMAIL',
  'SPIKE_TEST_RECIPIENT',
] as const

// Secret values must never leave this function — scrub them from any error text.
function redact(msg: string): string {
  let out = msg
  for (const name of REQUIRED) {
    const value = Deno.env.get(name)
    if (value) out = out.split(value).join(`<${name}>`)
  }
  return out
}

Deno.serve(async () => {
  const missing = REQUIRED.filter((name) => !Deno.env.get(name))
  if (missing.length) {
    return new Response(
      JSON.stringify({ ok: false, attempt: 'nodemailer', error: `missing secrets: ${missing.join(', ')}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const secure = Deno.env.get('SMTP_SECURE') === 'true'
  const transport = nodemailer.createTransport({
    host: Deno.env.get('SMTP_HOST')!,
    port: Number(Deno.env.get('SMTP_PORT')),
    secure, // true = implicit TLS; false = STARTTLS upgrade on the configured port
    requireTLS: !secure,
    auth: { user: Deno.env.get('SMTP_USER')!, pass: Deno.env.get('SMTP_PASS')! },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
  })

  try {
    const info = await transport.sendMail({
      from: Deno.env.get('SMTP_FROM_EMAIL')!,
      to: Deno.env.get('SPIKE_TEST_RECIPIENT')!,
      subject: '[SPIKE] SMTP from Supabase Edge Function',
      text: `SMTP spike (M0) sent at ${new Date().toISOString()} from the Supabase Deno edge runtime via nodemailer.`,
    })
    return new Response(
      JSON.stringify({ ok: true, attempt: 'nodemailer', messageId: info.messageId }),
      { headers: { 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    const raw = e instanceof Error ? `${e.name}: ${e.message}` : String(e)
    return new Response(
      JSON.stringify({ ok: false, attempt: 'nodemailer', error: redact(raw) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
})
