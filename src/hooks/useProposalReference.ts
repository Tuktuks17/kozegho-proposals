import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { buildReference } from '@/lib/referenceFormat'

export function useProposalReference(salespersonName: string, userId: string) {
  const [dailyCount, setDailyCount] = useState<number | null>(null)

  // Count ALL proposals created today by this user (regardless of reference format)
  useEffect(() => {
    if (!userId) return
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

    supabase
      .from('proposals')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', userId)
      .gte('created_at', startOfDay.toISOString())
      .lt('created_at', endOfDay.toISOString())
      .then(({ count }) => setDailyCount(count ?? 0))
  }, [userId])

  if (dailyCount === null) return ''
  return buildReference(new Date(), dailyCount, salespersonName)
}
