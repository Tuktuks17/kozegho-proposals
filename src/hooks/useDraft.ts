import { useEffect, useRef } from 'react'
import type { ProposalFormState } from '@/types/proposal'
import { debounce } from '@/lib/utils'

const KEY = (userId: string) => `kp:draft:${userId}`

export function saveDraft(userId: string, state: ProposalFormState) {
  try {
    // Never persist salesperson_name — the field must always be entered manually
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { salesperson_name: _stripped, ...draftState } = state
    localStorage.setItem(KEY(userId), JSON.stringify(draftState))
  } catch { /* storage full — ignore */ }
}

export function loadDraft(userId: string): ProposalFormState | null {
  try {
    const raw = localStorage.getItem(KEY(userId))
    // salesperson_name is intentionally absent from saved drafts;
    // useProposalForm will always override it to '' on load
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
