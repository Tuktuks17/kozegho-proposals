import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { buildReference } from '@/lib/referenceFormat'

export function useProposalReference(salespersonName: string, userId: string) {
  const [dailyCount, setDailyCount] = useState<number | null>(null)

  const fetchCount = useCallback(async () => {
    if (!userId) return
    const today = new Date()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    const prefix = `${mm}${dd}`

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count } = await (supabase.from('proposals') as any)
      .select('id', { count: 'exact', head: true })
      .eq('created_by', userId)
      .like('reference', `${prefix}%`)

    setDailyCount(count ?? 0)
  }, [userId])

  useEffect(() => {
    fetchCount()
  }, [fetchCount])

  const reference = dailyCount === null ? '' : buildReference(new Date(), dailyCount, salespersonName)
  return { reference, refresh: fetchCount }
}
