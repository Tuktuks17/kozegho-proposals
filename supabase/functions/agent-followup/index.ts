import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { callClaudeWithUsage, claudeCostUsd, parseJsonStrict } from '../_shared/claude.ts'

// Follow-up Agent (Phase 2). Daily cron. For each open proposal sent >=7 days ago with no
// pending agent follow-up task and no interaction in the last 5 days, drafts a follow-up email
// (Sonnet 4.6) at the D+7 / D+14 / D+21 escalation tier and creates a human-in-the-loop task
// (source='agent') with the draft in metadata. SENDS NOTHING. Logs every draft to agent_runs.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const REST = `${SUPABASE_URL}/rest/v1`

const sbHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
}

const CORS = {
  'Access-Control-Allow-Origin': 'https://kozegho-proposals.vercel.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MODEL = 'claude-sonnet-4-6'
const DAY_MS = 24 * 60 * 60 * 1000

type Customer = { company?: string; name?: string; email?: string }
type Proposal = {
  id: string
  reference: string
  subject: string
  total: number
  language: string
  email_sent_at: string
  created_by: string
  customer_id: string
  salesperson_name: string
  customers?: Customer | null
}
type Interaction = { customer_id: string; type: string; content: string; occurred_at: string }

type Tier = { tier: 1 | 2 | 3; label: string; priority: 'medium' | 'high' | 'urgent'; guidance: string }

function tierFor(daysOpen: number): Tier {
  if (daysOpen >= 21) {
    return {
      tier: 3, label: 'D+21', priority: 'urgent',
      guidance: 'This proposal has been open for three weeks or more. Write a respectful but more direct check-in: acknowledge the time that has passed, restate the core value succinctly, and ask for a clear yes/no/when. Offer a short call to remove any blocker. This tier is also flagged to the manager.',
    }
  }
  if (daysOpen >= 14) {
    return {
      tier: 2, label: 'D+14', priority: 'high',
      guidance: 'This proposal has been open for two weeks. Reinforce value: reference the specific products/benefits in the proposal and how they address the client needs, then gently ask whether they have questions or need anything to move forward.',
    }
  }
  return {
    tier: 1, label: 'D+7', priority: 'medium',
    guidance: 'This proposal has been open for about a week. Write a short, cordial reminder that the proposal is available and offer to answer any questions.',
  }
}

const LANG_NAME: Record<string, string> = { PT: 'European Portuguese', EN: 'British English', ES: 'Spanish (Spain)', FR: 'French' }

function buildPrompt(p: Proposal, daysOpen: number, t: Tier, interactionHistory: string): string {
  const customerName = p.customers?.company || p.customers?.name || 'the customer'
  const lang = LANG_NAME[(p.language || 'EN').toUpperCase()] ?? 'British English'
  return `You are an expert B2B sales consultant writing a follow-up email for Kozegho, a Portuguese manufacturer of water treatment equipment.

Write a professional, concise follow-up email for this situation:
- Customer: ${customerName}
- Proposal: ${p.reference} — ${p.subject}
- Value: €${Number(p.total ?? 0).toFixed(2)}
- Sent: ${daysOpen} days ago
- Salesperson: ${p.salesperson_name}
- Previous interactions: ${interactionHistory || 'none recorded'}

Escalation tier ${t.label}: ${t.guidance}

The email must:
1. Reference the specific proposal by reference number
2. Be warm but professional
3. Offer to answer questions or arrange a call
4. Not be pushy or desperate
5. Be concise (3-4 short paragraphs max)
6. Be written in ${lang}
7. The "subject" value must contain ONLY the subject line text itself — never prefix it with "Subject:", "Assunto:", "Objet:" or "Asunto:".

Respond with ONLY a single-line JSON object. No markdown. No code blocks. Start with { end with }.
{"subject":"Re: Kozegho Commercial Proposal – ${p.reference}","body":"Full email body in HTML with <p> tags only"}`
}

async function logRun(row: Record<string, unknown>): Promise<void> {
  await fetch(`${REST}/agent_runs`, {
    method: 'POST',
    headers: { ...sbHeaders, Prefer: 'return=minimal' },
    body: JSON.stringify(row),
  }).catch(() => {})
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  let trigger = 'cron'
  let limit = 10
  let dryRun = false
  try {
    const body = await req.json().catch(() => ({}))
    trigger = body?.trigger ?? 'cron'
    if (Number(body?.limit) > 0) limit = Number(body.limit)
    dryRun = body?.dryRun === true
  } catch { /* defaults */ }

  try {
    const now = Date.now()
    const sevenDaysAgo = new Date(now - 7 * DAY_MS).toISOString()
    const fiveDaysAgo = new Date(now - 5 * DAY_MS).toISOString()

    // 1. Candidate proposals: open, sent >= 7 days ago (with customer)
    const selectCols = 'id,reference,subject,total,language,email_sent_at,created_by,customer_id,salesperson_name,customers(company,name,email)'
    const [candRes, intRes, taskRes] = await Promise.all([
      fetch(`${REST}/proposals?outcome=eq.open&email_sent_at=not.is.null&email_sent_at=lte.${sevenDaysAgo}&select=${encodeURIComponent(selectCols)}&order=email_sent_at.asc`, { headers: sbHeaders }),
      fetch(`${REST}/interactions?occurred_at=gte.${fiveDaysAgo}&select=customer_id`, { headers: sbHeaders }),
      fetch(`${REST}/tasks?source=eq.agent&status=eq.open&select=source_ref`, { headers: sbHeaders }),
    ])
    if (!candRes.ok) throw new Error(`fetch_proposals ${candRes.status}: ${await candRes.text()}`)
    if (!intRes.ok) throw new Error(`fetch_interactions ${intRes.status}: ${await intRes.text()}`)
    if (!taskRes.ok) throw new Error(`fetch_tasks ${taskRes.status}: ${await taskRes.text()}`)

    const candidates: Proposal[] = await candRes.json()
    const recentInteractionCustomers = new Set(((await intRes.json()) as { customer_id: string }[]).map((r) => r.customer_id))
    const hasOpenAgentTask = new Set(((await taskRes.json()) as { source_ref: string | null }[]).map((r) => r.source_ref).filter(Boolean))

    // 2. Filter: no recent interaction, no existing open agent task for this proposal
    const eligible = candidates.filter((p) => !recentInteractionCustomers.has(p.customer_id) && !hasOpenAgentTask.has(p.id))
    const batch = eligible.slice(0, limit)

    if (dryRun) {
      return new Response(JSON.stringify({ ok: true, dryRun: true, eligible: eligible.length, wouldProcess: batch.length }), {
        headers: { 'Content-Type': 'application/json', ...CORS },
      })
    }

    // 3. Interaction history for the selected customers (most recent first)
    const historyByCustomer = new Map<string, string>()
    const custIds = [...new Set(batch.map((p) => p.customer_id))]
    if (custIds.length > 0) {
      const inUrl = `${REST}/interactions?customer_id=in.(${custIds.join(',')})&select=customer_id,type,content,occurred_at&order=occurred_at.desc`
      const hr = await fetch(inUrl, { headers: sbHeaders })
      if (hr.ok) {
        const all = (await hr.json()) as Interaction[]
        for (const cid of custIds) {
          const lines = all.filter((i) => i.customer_id === cid).slice(0, 5)
            .map((i) => `${i.occurred_at.slice(0, 10)} [${i.type}] ${String(i.content ?? '').slice(0, 160)}`)
          if (lines.length) historyByCustomer.set(cid, lines.join(' | '))
        }
      }
    }

    let created = 0
    const results: Array<Record<string, unknown>> = []

    for (const p of batch) {
      const startedAt = Date.now()
      const daysOpen = Math.floor((now - new Date(p.email_sent_at).getTime()) / DAY_MS)
      const t = tierFor(daysOpen)
      try {
        const prompt = buildPrompt(p, daysOpen, t, historyByCustomer.get(p.customer_id) ?? '')
        const res = await callClaudeWithUsage({ prompt, model: MODEL, maxTokens: 1000, temperature: 0.4 })
        const draft = parseJsonStrict<{ subject: string; body: string }>(res.text)
        if (!draft.subject || !draft.body) throw new Error('draft missing subject/body')

        const customerName = p.customers?.company || p.customers?.name || 'Customer'
        const taskRow = {
          customer_id: p.customer_id,
          created_by: p.created_by,
          assigned_to: p.created_by,
          title: `Follow-up · ${p.reference} (${t.label})`,
          due_date: new Date(now + 2 * DAY_MS).toISOString().slice(0, 10),
          priority: t.priority,
          status: 'open',
          source: 'agent',
          source_ref: p.id,
          metadata: {
            proposal_id: p.id,
            reference: p.reference,
            subject: p.subject,
            tier: t.tier,
            tier_label: t.label,
            days_open: daysOpen,
            customer_name: customerName,
            customer_email: p.customers?.email ?? null,
            escalation: t.tier === 3 ? 'manager_alert' : null,
            draft: { subject: draft.subject, body: draft.body },
          },
        }
        const insRes = await fetch(`${REST}/tasks`, {
          method: 'POST',
          headers: { ...sbHeaders, Prefer: 'return=minimal' },
          body: JSON.stringify(taskRow),
        })
        if (!insRes.ok) throw new Error(`task_insert ${insRes.status}: ${await insRes.text()}`)
        created++

        await logRun({
          agent_name: 'followup',
          trigger_type: trigger,
          model: res.model,
          input_tokens: res.usage.input_tokens,
          output_tokens: res.usage.output_tokens,
          cost_usd: claudeCostUsd(res.model, res.usage),
          duration_ms: Date.now() - startedAt,
          status: 'success',
          input: { proposal_id: p.id, reference: p.reference, tier: t.tier, days_open: daysOpen },
          output: { task_created: true, subject: draft.subject },
        })
        results.push({ proposal_id: p.id, reference: p.reference, tier: t.label, status: 'success' })
      } catch (e) {
        await logRun({
          agent_name: 'followup',
          trigger_type: trigger,
          model: MODEL,
          duration_ms: Date.now() - startedAt,
          status: 'error',
          error: String(e),
          input: { proposal_id: p.id, reference: p.reference, tier: t.tier, days_open: daysOpen },
        })
        results.push({ proposal_id: p.id, reference: p.reference, tier: t.label, status: 'error', error: String(e) })
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      eligible: eligible.length,
      created,
      remaining: Math.max(0, eligible.length - created),
      results,
    }), { headers: { 'Content-Type': 'application/json', ...CORS } })
  } catch (e) {
    await logRun({ agent_name: 'followup', trigger_type: trigger, status: 'error', error: String(e) })
    return new Response(JSON.stringify({ error: 'agent_followup_failed', detail: String(e) }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }
})
