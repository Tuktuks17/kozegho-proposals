import type { ProposalLanguage } from '@/types/catalog'

const BASE = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/datasheets`

type LangFolder = 'PT' | 'GB' | 'ES' | 'FR'

// Maps proposal language to bucket folder
const LANG_FOLDER: Record<ProposalLanguage, LangFolder> = {
  PT: 'PT',
  EN: 'GB',
  ES: 'ES',
  FR: 'FR',
}

// Language-specific filename prefix used in each folder
const LANG_PREFIX: Record<LangFolder, string> = {
  PT: 'Ficha tecnica_',
  GB: 'Datasheet_',
  ES: 'Hoja tecnica_',
  FR: 'Fiche technique_',
}

// Catalog family ID → base filename (excluding prefix and _LANG.pdf suffix)
// - string: same base across all languages
// - object: per-language base (for files with inconsistent dates/names in the bucket)
type FileBase = string | Partial<Record<LangFolder, string>>

const FAMILY_BASES: Record<string, FileBase> = {
  CS:      'PolySys_CS-150608_5',
  CL_D:    'PolySys_CL-D-150608_5',
  CSL:     { PT: 'PolySys_CSL-150608_5', GB: 'PolySys_CSL-220325_6', ES: 'PolySys_CSL-150608_5', FR: 'PolySys_CSL-150608_5' },
  AFL:     'AFL-150608_5',
  AMR_S:   'AMR-150608_5',
  AMR_T:   'AMR-150608_5',
  APL:     'APL-150608_5',
  ATL:     'ATL-150608_5',
  BL:      'BL-150608_5',
  BS:      'BS-150608_5',
  PD:      'PD-170918_2',
  GAL:     'GAL-150608_5',
  TCC:     'TCC-150608_5',
  TCI:     { PT: 'TCI-150806_5', GB: 'TCI-150608_5', ES: 'TCI-150608_5', FR: 'TCI-150608_5' },
  TCP:     { PT: 'TCP-150806_5', GB: 'TCP-150608_5', ES: 'TCP-150608_5', FR: 'TCP-150608_5' },
  TPP:     { PT: 'TPP-150806_5', GB: 'TPP-150608_5', ES: 'TPP-150608_5', FR: 'TPP-150608_5' },
  VAM:     { PT: 'VAM-150806_5', GB: 'VAM-150608_5', ES: 'VAM-150608_5', FR: 'VAM-150608_5' },
  KP:      'KP-170922_2',
  S1:      { PT: 'S1-150806_5', GB: 'S1-150608_5', ES: 'S1-150608_5', FR: 'S1-150608_5' },
  S2:      { PT: 'S2-150806_5', GB: 'S2-150608_5', ES: 'S2-150608_5', FR: 'S2-150608_5' },
  S3:      { PT: 'S3-150806_5', GB: 'S3-150608_5', ES: 'S3-150608_5', FR: 'S3-150608_5' },
  S8075CD: 'S8075CD-170829_2',
  SS:      'SS-170925_2',
  TD9:     'TD9-171003_2',
  GMX:     'GMX-190315_1',
  DSM:     { PT: 'DS-M-171018_2', GB: 'DSM-1710188_2', ES: 'DSM-171018_2', FR: 'DSM-171018_2' },
  FD:      'FD-170922_2',
  FMP:     'FMP-171019_2',
  // ES uses a different revision date for CNP
  CNP:     { PT: 'CNP-150705_5', GB: 'CNP-150705_5', ES: 'CNP-170705_5', FR: 'CNP-150705_5' },
  DEP:     'DEP-170712_2',
  DICLOX:  'DICLOX-170622_3',
  AMP:     'AMP-171023_2',
  RBT:     'RBT-171019_2',
  // SIGMA family maps to S1 datasheet (covers S1/S2/S3 range); FR uses GB fallback
  SIGMA:   { PT: 'S1-150806_5', GB: 'S1-150608_5', ES: 'S1-150608_5' },
  // KDC (DICLOX) — confirmed in PT/GB/ES/FR folders
  KDC:     'KDC-170622_3',
  // KSENSE — only GB and ES in bucket; PT/FR use GB fallback
  KSENSE:  { GB: 'KSENSE-150608_5', ES: 'KSENSE-150608_5' },
  // Beta 4 and Beta 5 share the same BETA datasheet across all languages
  BETA_4:  'BETA-171003_2',
  BETA_5:  'BETA-171003_2',
}

export function resolveDatasheetUrl(
  familyId: string,
  proposalLanguage: ProposalLanguage
): string | null {
  const bases = FAMILY_BASES[familyId]
  if (!bases) return null

  const folder = LANG_FOLDER[proposalLanguage]
  const base = typeof bases === 'string'
    ? bases
    : (bases[folder] ?? bases['GB'] ?? null)
  if (!base) return null

  const prefix = LANG_PREFIX[folder]
  return `${BASE}/${folder}/${prefix}${base}_${folder}.pdf`
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
