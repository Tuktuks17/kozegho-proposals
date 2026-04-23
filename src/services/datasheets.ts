import type { ProposalLanguage, DatasheetLanguage } from '@/types/catalog'

const BASE = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/datasheets`

// Map proposal language to datasheet folder
const LANG_MAP: Record<ProposalLanguage, DatasheetLanguage> = {
  PT: 'PT',
  DE: 'DE',
  ES: 'ES',
  FR: 'FR',
  EN: 'GB'
}

export function resolveDatasheetUrl(
  variantId: string,
  proposalLanguage: ProposalLanguage
): string | null {
  const folder = LANG_MAP[proposalLanguage]
  // Primary convention: {variant_id}_{LANG}.pdf
  return `${BASE}/${folder}/${variantId}_${folder}.pdf`
}

export async function fetchDatasheetBytes(url: string): Promise<ArrayBuffer | null> {
  try {
    const resp = await fetch(url)
    if (!resp.ok) return null
    return resp.arrayBuffer()
  } catch {
    return null
  }
}

export function logoUrl(): string {
  return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/logos/kozegho-logo.png`
}
