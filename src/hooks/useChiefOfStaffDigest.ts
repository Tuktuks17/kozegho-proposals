import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { ChiefOfStaffDigest } from '@/types/database'

// Latest Chief of Staff weekly digest (chief-of-staff agent, Fri 17:00 Lisbon).
// RLS (cos_digests_manager_read / is_manager) means salespersons get no rows; we also gate
// the fetch on `enabled` so we don't even query for non-managers.
export function useChiefOfStaffDigest(enabled: boolean) {
  const [digest, setDigest] = useState<ChiefOfStaffDigest | null>(null)
  const [loading, setLoading] = useState(enabled)

  useEffect(() => {
    if (!enabled) { setLoading(false); return }
    let cancelled = false
    ;(async () => {
      // chief_of_staff_digests is not in the generated Database types — cast like the rest of the codebase.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('chief_of_staff_digests') as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!cancelled) {
        setDigest((data as ChiefOfStaffDigest) ?? null)
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [enabled])

  return { digest, loading }
}
