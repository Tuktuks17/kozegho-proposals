import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { PersistedProposal } from '@/types/proposal'

export type ProposalOutcome = 'open' | 'accepted' | 'rejected'

export function useCustomerProposals(customerId: string) {
  const [proposals, setProposals] = useState<PersistedProposal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('proposals')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err) { setError(err.message) } else { setError(null); setProposals((data ?? []) as PersistedProposal[]) }
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [customerId, refreshKey])

  const updateOutcome = useCallback(async (proposalId: string, outcome: ProposalOutcome): Promise<{ error: string | null }> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: err } = await (supabase.from('proposals') as any)
      .update({ outcome })
      .eq('id', proposalId)
    if (err) return { error: (err as { message: string }).message }
    setRefreshKey(k => k + 1)
    return { error: null }
  }, [])

  return { proposals, loading, error, updateOutcome }
}
