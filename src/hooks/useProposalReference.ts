import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { buildReference } from '@/lib/referenceFormat'

export function useProposalReference(salespersonName: string, userId: string) {
  const [dailyCount, setDailyCount] = useState<number | null>(null)

  const fetchCount = useCallback(async (): Promise<number> => {
    if (!userId) return 0
    const today = new Date()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    const prefix = `${mm}${dd}`

    // Count ALL proposals today across all users — seq letter is a global daily counter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count } = await (supabase.from('proposals') as any)
      .select('id', { count: 'exact', head: true })
      .like('reference', `${prefix}%K/%`)

    const newCount = count ?? 0
    setDailyCount(newCount)
    return newCount
  }, [userId])

  useEffect(() => {
    fetchCount()
  }, [fetchCount])

  const reference = dailyCount === null ? '' : buildReference(new Date(), dailyCount, salespersonName)
  return { reference, refresh: fetchCount }
}
