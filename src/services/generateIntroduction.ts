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
  try {
    const { data, error } = await supabase.functions.invoke('generate-introduction', {
      body: payload
    })
    if (error || !data?.introduction) throw new Error('Edge function error')
    return data.introduction as string
  } catch {
    return PROPOSAL_LABELS[payload.language].fallbackIntroduction
  }
}
