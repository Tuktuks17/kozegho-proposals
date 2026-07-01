import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { MarketDigest } from '@/types/database'

// Latest Market Intelligence digest (market-intelligence weekly agent), rendered as cards in the Hub.
export function useMarketDigest() {
  const [digest, setDigest] = useState<MarketDigest | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      // market_digests is not in the generated Database types — cast like the rest of the codebase.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('market_digests') as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!cancelled) {
        setDigest((data as MarketDigest) ?? null)
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  return { digest, loading }
}
