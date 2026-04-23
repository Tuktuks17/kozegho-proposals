import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { buildReference } from '@/lib/referenceFormat'

export function useProposalReference() {
  const [reference, setReference] = useState<string>('')

  useEffect(() => {
    const today = new Date()
    const dateStr = today.toISOString().slice(0, 10)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase.rpc as any)('count_proposals_on_date', { p_date: dateStr })
      .then(({ data }: { data: number | null }) => {
        setReference(buildReference(today, data ?? 0))
      })
  }, [])

  return reference
}
