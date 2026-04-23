import { useEffect, useRef } from 'react'
import type { ProposalFormState } from '@/types/proposal'
import { debounce } from '@/lib/utils'

const KEY = (userId: string) => `kp:draft:${userId}`

export function saveDraft(userId: string, state: ProposalFormState) {
  try {
    localStorage.setItem(KEY(userId), JSON.stringify(state))
  } catch { /* storage full — ignore */ }
}

export function loadDraft(userId: string): ProposalFormState | null {
  try {
    const raw = localStorage.getItem(KEY(userId))
    return raw ? (JSON.parse(raw) as ProposalFormState) : null
  } catch {
    return null
  }
}

export function clearDraft(userId: string) {
  localStorage.removeItem(KEY(userId))
}

export function useAutosaveDraft(userId: string | undefined, state: ProposalFormState) {
  const debouncedSave = useRef(debounce((s: ProposalFormState) => {
    if (userId) saveDraft(userId, s)
  }, 800) as (s: ProposalFormState) => void)

  useEffect(() => {
    if (!userId) return
    debouncedSave.current(state)
  }, [userId, state])
}
