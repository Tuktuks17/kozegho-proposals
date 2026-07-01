import { useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export type ClientAnalysisFacts = {
  proposalCount: number
  acceptedCount: number
  rejectedCount: number
  openCount: number
  revenue: number
  openPipeline: number
  priceMin: number
  priceMax: number
  interactionCount: number
}

export type ClientAnalysis = {
  summary: string
  analysis: string
  patterns: string[]
  next_best_action: string
  facts: ClientAnalysisFacts
  similarCount: number
}

// Client Analysis RAG (analyze-client-history). Used by the customer-detail deep-analysis panel
// and the proposal form's auto-context for an existing customer.
export function useClientAnalysis() {
  const [data, setData] = useState<ClientAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Session cache keyed by customerId — a repeat request for the same client returns the cached
  // result instead of firing another (paid) analyze-client-history call.
  const cacheRef = useRef<Record<string, ClientAnalysis>>({})

  const analyze = useCallback(async (customerId: string, question?: string) => {
    setError(null)
    // Default (question-less) analysis is cacheable; a custom question always re-runs.
    if (!question && cacheRef.current[customerId]) {
      setData(cacheRef.current[customerId])
      setLoading(false)
      return
    }
    setLoading(true)
    setData(null)
    const { data: res, error: fnError } = await supabase.functions.invoke('analyze-client-history', {
      body: { customerId, question: question ?? null },
    })
    setLoading(false)
    if (fnError) {
      let msg = (fnError as { message: string }).message
      try {
        const body = await (fnError as unknown as { context: Response }).context.clone().json()
        if (body?.error) msg = body.error
      } catch { /* keep generic message */ }
      setError(msg)
      return
    }
    if (res) {
      const result = res as ClientAnalysis
      if (!question) cacheRef.current[customerId] = result
      setData(result)
    }
  }, [])

  const reset = useCallback(() => { setData(null); setError(null); setLoading(false) }, [])

  return { data, loading, error, analyze, reset }
}
