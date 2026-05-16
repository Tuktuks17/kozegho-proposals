import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { ProposalAttention, ColdRiskCustomer } from './useIntelligenceData'

export type BriefingResult = {
  headline: string
  urgent: string[]
  opportunity: string
  risk: string
  momentum: 'brief' | 'building' | 'strong' | 'declining'
  generatedAt: string
}

export type GenerateBriefingInput = {
  metrics: {
    totalPipeline: number
    totalRevenue: number
    openCount: number
    acceptedCount: number
    rejectedCount: number
    conversionRate: number
  }
  attentionItems: ProposalAttention[]
  coldRiskItems: ColdRiskCustomer[]
}

const CACHE_KEY = 'kp:daily_briefing'
const CACHE_TTL_MS = 4 * 60 * 60 * 1000

function loadFromCache(): BriefingResult | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as BriefingResult
    if (!parsed.generatedAt) return null
    const age = Date.now() - new Date(parsed.generatedAt).getTime()
    if (age > CACHE_TTL_MS) return null
    return parsed
  } catch {
    return null
  }
}

export function useDailyBriefing() {
  const [briefing, setBriefing] = useState<BriefingResult | null>(() => loadFromCache())
  const [loading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lastGenerated = briefing?.generatedAt ?? null

  const generateBriefing = useCallback(async (input: GenerateBriefingInput): Promise<{ error: string | null }> => {
    setAnalyzing(true)
    setError(null)

    const payload = {
      metrics: input.metrics,
      attentionItems: input.attentionItems.map(a => ({
        customerName: a.customer.company,
        reference: a.proposal.reference,
        total: a.proposal.total,
        daysOpen: a.daysOpen,
        urgency: a.urgency,
      })),
      coldRiskItems: input.coldRiskItems.map(c => ({
        customerName: c.customer.company,
        daysSinceLastActivity: c.daysSinceLastActivity,
        temperature: c.temperature,
      })),
    }

    const { data, error: fnError } = await supabase.functions.invoke('analyze-portfolio', {
      body: payload,
    })

    setAnalyzing(false)

    if (fnError) {
      let msg = (fnError as { message: string }).message
      try {
        const body = await (fnError as unknown as { context: Response }).context.clone().json()
        if (body?.raw) msg = `Parse failed — Gemini returned: ${(body.raw as string).substring(0, 150)}`
        else if (body?.error) msg = body.error
      } catch { /* keep generic message */ }
      setError(msg)
      return { error: msg }
    }

    if (data) {
      const result = data as BriefingResult
      setBriefing(result)
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(result))
      } catch { /* storage full — non-fatal */ }
    }

    return { error: null }
  }, [])

  return { briefing, loading, analyzing, error, lastGenerated, generateBriefing }
}
