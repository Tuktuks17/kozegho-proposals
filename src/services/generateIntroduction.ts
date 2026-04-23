import { supabase } from '@/lib/supabase'
import type { ProposalLanguage } from '@/types/catalog'
import { PROPOSAL_LABELS } from '@/i18n/proposalLabels'

type GeneratePayload = {
  products: string[]
  clientCountry: string
  language: ProposalLanguage
  salespersonName: string
  companyName: string
}

export async function generateIntroduction(payload: GeneratePayload): Promise<string> {
  const fallback = PROPOSAL_LABELS[payload.language].fallbackIntroduction
  try {
    // supabase.functions.invoke automatically includes the session JWT
    const { data, error } = await supabase.functions.invoke('generate-introduction', {
      body: payload
    })
    if (error) {
      console.warn('generate-introduction edge function error:', error)
      return fallback
    }
    const text = data?.introduction as string | undefined
    if (!text?.trim()) return fallback
    return text.trim()
  } catch (e) {
    console.warn('generate-introduction failed, using fallback:', e)
    return fallback
  }
}
