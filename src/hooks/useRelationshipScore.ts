import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { RelationshipScore, Interaction, Customer } from '@/types/database'
import type { PersistedProposal } from '@/types/proposal'

type AnalyzePayload = {
  customer: Customer
  proposals: PersistedProposal[]
  interactions: Interaction[]
  emailCount: number
}

export function useRelationshipScore(customerId: string) {
  const [score, setScore] = useState<RelationshipScore | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    // relationship_scores has no insert/update RLS policy for users —
    // reads are allowed via "relationship_scores_select"; writes go through the Edge Function.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase.from('relationship_scores') as any)
      .select('*')
      .eq('customer_id', customerId)
      .maybeSingle()
      .then(({ data, error: err }: { data: RelationshipScore | null; error: { message: string } | null }) => {
        if (cancelled) return
        if (err) setError(err.message)
        else { setError(null); setScore(data) }
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [customerId, refreshKey])

  const analyzeRelationship = useCallback(async (payload: AnalyzePayload): Promise<{ error: string | null }> => {
    setAnalyzing(true)
    setError(null)

    const { data, error: fnError } = await supabase.functions.invoke('analyze-relationship', {
      body: {
        customerId: payload.customer.id,
        customerName: payload.customer.company,
        proposals: payload.proposals.map(p => ({
          reference: p.reference,
          subject: p.subject,
          total: p.total,
          outcome: p.outcome,
          created_at: p.created_at,
        })),
        interactions: payload.interactions.map(i => ({
          type: i.type,
          content: i.content,
          occurred_at: i.occurred_at,
        })),
        emailCount: payload.emailCount,
      },
    })

    setAnalyzing(false)

    if (fnError) {
      // FunctionsHttpError has a `context` Response with the actual error body from the function
      let msg = (fnError as { message: string }).message
      try {
        const body = await (fnError as unknown as { context: Response }).context.clone().json()
        if (body?.error) msg = body.error
      } catch { /* keep generic message */ }
      setError(msg)
      return { error: msg }
    }

    if (data) {
      const result = data as RelationshipScore
      // Optimistically update UI from the Edge Function response
      setScore({
        customer_id: payload.customer.id,
        score: result.score,
        temperature: result.temperature,
        analysis: result.analysis,
        opportunity: result.opportunity ?? null,
        suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
        risk_flags: Array.isArray(result.risk_flags) ? result.risk_flags : [],
        last_analyzed: new Date().toISOString(),
      })
      setRefreshKey(k => k + 1)
    }

    return { error: null }
  }, [])

  return { score, loading, analyzing, error, analyzeRelationship }
}
