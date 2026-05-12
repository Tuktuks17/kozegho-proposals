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

    // SECURITY DEFINER function bypasses RLS — counts ALL proposals today
    // (not just the current user's) so the seq letter is globally unique per day
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)
      ('get_daily_proposal_count', { date_prefix: prefix })

    if (error) {
      console.error('Failed to fetch daily count:', error)
      return 0
    }

    const newCount = (data as number) ?? 0
    setDailyCount(newCount)
    return newCount
  }, [userId])

  useEffect(() => {
    fetchCount()
  }, [fetchCount])

  const reference = dailyCount === null ? '' : buildReference(new Date(), dailyCount, salespersonName)
  return { reference, refresh: fetchCount }
}
