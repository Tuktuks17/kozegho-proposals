import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type Payload = { customerEmail: string; maxResults?: number }

type ThreadSummary = {
  threadId: string
  subject: string
  from: string
  date: string
  messageCount: number
  snippet: string
}

type GmailHeader = { name: string; value: string }

function getHeader(headers: GmailHeader[], name: string): string {
  return headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value ?? ''
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS })
  }

  const authHeader = req.headers.get('Authorization')
  const gmailToken = authHeader?.replace('Bearer ', '').trim()
  if (!gmailToken) {
    return new Response(
      JSON.stringify({ error: 'Missing Authorization header with Gmail token' }),
      { status: 401, headers: { 'Content-Type': 'application/json', ...CORS } }
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

  if (!body.customerEmail) {
    return new Response(
      JSON.stringify({ error: 'customerEmail is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...CORS } }
    )
  }

  const maxResults = body.maxResults ?? 15
  const q = `from:${body.customerEmail} OR to:${body.customerEmail}`
  const gmailHeaders = { Authorization: `Bearer ${gmailToken}` }

  // 1. List threads
  const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/threads?q=${encodeURIComponent(q)}&maxResults=${maxResults}`
  const listResp = await fetch(listUrl, { headers: gmailHeaders })

  if (listResp.status === 401) {
    return new Response(
      JSON.stringify({ error: 'Gmail token expired or invalid. Sign out and sign in again.' }),
      { status: 401, headers: { 'Content-Type': 'application/json', ...CORS } }
    )
  }
  if (!listResp.ok) {
    const detail = await listResp.text()
    return new Response(
      JSON.stringify({ error: 'Gmail API error', detail }),
      { status: listResp.status, headers: { 'Content-Type': 'application/json', ...CORS } }
    )
  }

  const listData = await listResp.json()
  const rawThreads: { id: string; snippet: string }[] = listData.threads ?? []

  // 2. Fetch thread metadata in parallel
  const detailUrl = (id: string) =>
    `https://gmail.googleapis.com/gmail/v1/users/me/threads/${id}` +
    `?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date`

  const details = await Promise.all(
    rawThreads.map(async (t) => {
      const res = await fetch(detailUrl(t.id), { headers: gmailHeaders })
      if (!res.ok) return null
      const td = await res.json()
      const messages: { payload: { headers: GmailHeader[] } }[] = td.messages ?? []
      if (messages.length === 0) return null
      const lastMsg = messages[messages.length - 1]
      const hdrs = lastMsg.payload?.headers ?? []
      return {
        threadId: t.id,
        subject: getHeader(hdrs, 'Subject') || '(no subject)',
        from: getHeader(hdrs, 'From'),
        date: getHeader(hdrs, 'Date'),
        messageCount: messages.length,
        snippet: td.snippet ?? '',
      } satisfies ThreadSummary
    })
  )

  const threads = details.filter((d): d is ThreadSummary => d !== null)

  return new Response(JSON.stringify({ threads }), {
    headers: { 'Content-Type': 'application/json', ...CORS }
  })
})
