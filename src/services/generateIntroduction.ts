import { supabase } from '@/lib/supabase'
import type { ProposalLanguage } from '@/types/catalog'

type GeneratePayload = {
  products: string[]
  clientCountry: string
  language: ProposalLanguage
  salespersonName: string
  companyName: string
}

export async function generateIntroduction(payload: GeneratePayload): Promise<string> {
  const { data, error } = await supabase.functions.invoke('generate-introduction', {
    body: payload
  })

  if (error) {
    throw new Error(error.message || 'Erro na Edge Function generate-introduction')
  }

  const text = data?.introduction as string | undefined
  if (!text?.trim()) {
    throw new Error('A função AI não devolveu texto. Verifica se GEMINI_API_KEY está configurada nos Secrets do Supabase.')
  }

  return text.trim()
}
