import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Interaction, InteractionType } from '@/types/database'

type AddPayload = {
  type: InteractionType
  content: string
  occurred_at: string
}

export function useInteractions(customerId: string) {
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    supabase
      .from('interactions')
      .select('*')
      .eq('customer_id', customerId)
      .order('occurred_at', { ascending: false })
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err) setError(err.message)
        else setInteractions((data ?? []) as Interaction[])
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [customerId, refreshKey])

  const addInteraction = useCallback(async (payload: AddPayload): Promise<{ error: string | null }> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated.' }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: err } = await (supabase.from('interactions') as any)
      .insert({
        customer_id: customerId,
        created_by: user.id,
        type: payload.type,
        content: payload.content,
        occurred_at: payload.occurred_at,
      })
    if (err) return { error: (err as { message: string }).message }
    setRefreshKey(k => k + 1)
    return { error: null }
  }, [customerId])

  return { interactions, loading, error, addInteraction }
}
