// supabase/functions/_shared/msgraph.ts
// App-only (client credentials) Microsoft Graph client — the F0 track.
// Used for the central mailbox (GRAPH_SENDER_MAILBOX): automated agent sends
// (F3+) and inbox analysis (F6). Per-user mail goes through the delegated
// provider_token flow in the frontend, NOT through this module.
//
// Required secrets (set via `supabase secrets set`, never in code):
//   MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET, GRAPH_SENDER_MAILBOX

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0'

export const GRAPH_SECRET_NAMES = [
  'MS_TENANT_ID',
  'MS_CLIENT_ID',
  'MS_CLIENT_SECRET',
  'GRAPH_SENDER_MAILBOX',
] as const

export function graphSecretsMissing(): string[] {
  return GRAPH_SECRET_NAMES.filter((name) => !Deno.env.get(name))
}

// Secret values must never leave the function — scrub them from any error text.
export function redactGraphSecrets(msg: string): string {
  let out = msg
  for (const name of GRAPH_SECRET_NAMES) {
    const value = Deno.env.get(name)
    if (value) out = out.split(value).join(`<${name}>`)
  }
  return out
}

// Module-level token cache — edge isolates are reused across invocations,
// so this avoids a token round-trip on warm calls. 60s safety margin.
let cachedToken: { token: string; expiresAt: number } | null = null

export async function getAppOnlyToken(): Promise<string> {
  const missing = graphSecretsMissing()
  if (missing.length) throw new Error(`missing secrets: ${missing.join(', ')}`)

  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.token

  const tenant = Deno.env.get('MS_TENANT_ID')!
  const resp = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('MS_CLIENT_ID')!,
      client_secret: Deno.env.get('MS_CLIENT_SECRET')!,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    }),
  })

  if (!resp.ok) {
    const detail = await resp.text()
    throw new Error(`graph_token_error ${resp.status}: ${redactGraphSecrets(detail)}`)
  }

  const data = await resp.json()
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  }
  return cachedToken.token
}

export type GraphAttachment = {
  name: string
  contentType: string
  contentBytes: string // base64
}

export type SendMailOpts = {
  to: string[]
  subject: string
  html: string
  attachments?: GraphAttachment[]
  replyTo?: string
  mailbox?: string // defaults to GRAPH_SENDER_MAILBOX
}

// POST /users/{mailbox}/sendMail — succeeds with HTTP 202 and empty body.
// Total request limit is ~4 MB; larger attachments need an upload session (not implemented).
export async function sendMailAppOnly(opts: SendMailOpts): Promise<void> {
  const token = await getAppOnlyToken()
  const mailbox = opts.mailbox ?? Deno.env.get('GRAPH_SENDER_MAILBOX')!

  const message = {
    subject: opts.subject,
    body: { contentType: 'HTML', content: opts.html },
    toRecipients: opts.to.map((address) => ({ emailAddress: { address } })),
    ...(opts.replyTo ? { replyTo: [{ emailAddress: { address: opts.replyTo } }] } : {}),
    ...(opts.attachments?.length
      ? {
          attachments: opts.attachments.map((a) => ({
            '@odata.type': '#microsoft.graph.fileAttachment',
            name: a.name,
            contentType: a.contentType,
            contentBytes: a.contentBytes,
          })),
        }
      : {}),
  }

  const resp = await fetch(`${GRAPH_BASE}/users/${encodeURIComponent(mailbox)}/sendMail`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, saveToSentItems: true }),
  })

  if (!resp.ok) {
    const detail = await resp.text()
    throw new Error(`graph_send_error ${resp.status}: ${redactGraphSecrets(detail)}`)
  }
}

export type GraphMessageSummary = {
  id: string
  subject: string | null
  from: string
  receivedDateTime: string
  bodyPreview: string | null
}

// GET /users/{mailbox}/messages — F6 (inbox analysis) building block.
export async function listMessagesAppOnly(
  opts: { mailbox?: string; top?: number } = {}
): Promise<GraphMessageSummary[]> {
  const token = await getAppOnlyToken()
  const mailbox = opts.mailbox ?? Deno.env.get('GRAPH_SENDER_MAILBOX')!
  const top = opts.top ?? 10

  const url =
    `${GRAPH_BASE}/users/${encodeURIComponent(mailbox)}/messages` +
    `?$select=id,subject,from,receivedDateTime,bodyPreview&$orderby=receivedDateTime desc&$top=${top}`
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })

  if (!resp.ok) {
    const detail = await resp.text()
    throw new Error(`graph_read_error ${resp.status}: ${redactGraphSecrets(detail)}`)
  }

  const data = await resp.json()
  type RawMessage = {
    id: string
    subject: string | null
    from?: { emailAddress?: { name?: string; address?: string } }
    receivedDateTime: string
    bodyPreview: string | null
  }
  return ((data.value ?? []) as RawMessage[]).map((m) => {
    const name = m.from?.emailAddress?.name ?? ''
    const addr = m.from?.emailAddress?.address ?? ''
    return {
      id: m.id,
      subject: m.subject,
      from: name && addr ? `${name} <${addr}>` : addr || name,
      receivedDateTime: m.receivedDateTime,
      bodyPreview: m.bodyPreview,
    }
  })
}
