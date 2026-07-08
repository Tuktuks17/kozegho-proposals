import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Microsoft twin of gmail-threads: same request pattern, same response shape
// ({ threads: ThreadSummary[] }), so the frontend hook can route by provider.
// graphToken is passed in the body by the frontend (supabase.functions.invoke
// uses the Supabase JWT in the Authorization header, so the Graph token must
// travel in the request body to avoid conflicts).
type Payload = { customerEmail: string; graphToken: string; maxResults?: number }

type ThreadSummary = {
  threadId: string
  subject: string
  from: string
  date: string
  messageCount: number
  snippet: string
}

type GraphMessage = {
  conversationId: string
  subject: string | null
  from?: { emailAddress?: { name?: string; address?: string } }
  receivedDateTime: string
  bodyPreview: string | null
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

  const graphToken = body.graphToken?.trim()
  console.log('[graph-threads] customerEmail:', body.customerEmail, '| token present:', !!graphToken)
  if (!graphToken) {
    return new Response(
      JSON.stringify({ error: 'graphToken is required in the request body' }),
      { status: 401, headers: { 'Content-Type': 'application/json', ...CORS } }
    )
  }

  if (!body.customerEmail) {
    return new Response(
      JSON.stringify({ error: 'customerEmail is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...CORS } }
    )
  }

  const maxResults = body.maxResults ?? 15
  // KQL 'participants' covers from/to/cc — the Graph equivalent of the Gmail
  // "from:X OR to:X" query. $orderby is not allowed together with $search,
  // so messages are sorted client-side below.
  const search = encodeURIComponent(`"participants:${body.customerEmail}"`)
  const select = 'conversationId,subject,from,receivedDateTime,bodyPreview'
  // Fetch more messages than threads needed — several messages share a conversation.
  const top = Math.min(maxResults * 4, 100)
  const url =
    `https://graph.microsoft.com/v1.0/me/messages?$search=${search}&$select=${select}&$top=${top}`

  const resp = await fetch(url, { headers: { Authorization: `Bearer ${graphToken}` } })

  if (resp.status === 401) {
    return new Response(
      JSON.stringify({ error: 'Microsoft token expired or invalid. Sign out and sign in again.' }),
      { status: 401, headers: { 'Content-Type': 'application/json', ...CORS } }
    )
  }
  if (resp.status === 403) {
    // Token lacks Mail.Read scope — user must sign out and sign in to grant read access.
    const detail = await resp.text()
    console.log('[graph-threads] 403 from Graph API:', detail)
    return new Response(
      JSON.stringify({ error: 'Microsoft mail read access not granted. Sign out and sign in again, then accept the email read permission.' }),
      { status: 403, headers: { 'Content-Type': 'application/json', ...CORS } }
    )
  }
  if (!resp.ok) {
    const detail = await resp.text()
    console.log('[graph-threads] Graph API error', resp.status, detail)
    return new Response(
      JSON.stringify({ error: `Microsoft Graph error ${resp.status}`, detail }),
      { status: resp.status, headers: { 'Content-Type': 'application/json', ...CORS } }
    )
  }

  const data = await resp.json()
  const messages: GraphMessage[] = data.value ?? []

  // Group messages into conversations (Graph has no thread endpoint like Gmail)
  const byConversation = new Map<string, GraphMessage[]>()
  for (const m of messages) {
    if (!m.conversationId) continue
    const group = byConversation.get(m.conversationId)
    if (group) group.push(m)
    else byConversation.set(m.conversationId, [m])
  }

  const threads: ThreadSummary[] = [...byConversation.entries()]
    .map(([conversationId, msgs]) => {
      msgs.sort((a, b) => a.receivedDateTime.localeCompare(b.receivedDateTime))
      const last = msgs[msgs.length - 1]
      const fromName = last.from?.emailAddress?.name ?? ''
      const fromAddr = last.from?.emailAddress?.address ?? ''
      return {
        threadId: conversationId,
        subject: last.subject || '(no subject)',
        from: fromName && fromAddr ? `${fromName} <${fromAddr}>` : fromAddr || fromName,
        date: last.receivedDateTime,
        messageCount: msgs.length,
        snippet: last.bodyPreview ?? '',
      }
    })
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, maxResults)

  return new Response(JSON.stringify({ threads }), {
    headers: { 'Content-Type': 'application/json', ...CORS }
  })
})
