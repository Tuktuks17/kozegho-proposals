import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { sendProposalEmail } from '@/services/sendEmail'

export type FollowUpDraft = {
  subject: string
  body: string
}

export type GenerateFollowUpInput = {
  customerName: string
  customerEmail: string
  proposalReference: string
  proposalSubject: string
  proposalTotal: number
  proposalCreatedAt: string
  daysOpen: number
  salespersonName: string
  interactionHistory: string
}

export function useFollowUp() {
  const [draft, setDraft] = useState<FollowUpDraft | null>(null)
  const [generating, setGenerating] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateDraft = useCallback(async (input: GenerateFollowUpInput) => {
    setGenerating(true)
    setDraft(null)
    setSent(false)
    setError(null)

    const { data, error: fnError } = await supabase.functions.invoke('generate-followup', {
      body: input,
    })

    setGenerating(false)

    if (fnError) {
      let msg = (fnError as { message: string }).message
      try {
        const body = await (fnError as unknown as { context: Response }).context.clone().json()
        if (body?.raw) msg = `Parse failed — Gemini returned: ${(body.raw as string).substring(0, 150)}`
        else if (body?.error) msg = body.error
      } catch { /* keep generic message */ }
      setError(msg)
      return
    }

    if (data) {
      setDraft(data as FollowUpDraft)
    }
  }, [])

  const sendEmail = useCallback(async (to: string, subject: string, body: string) => {
    setSending(true)
    setError(null)
    try {
      await sendProposalEmail(to, subject, body, [])
      setSent(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSending(false)
    }
  }, [])

  const reset = useCallback(() => {
    setDraft(null)
    setGenerating(false)
    setSending(false)
    setSent(false)
    setError(null)
  }, [])

  return { draft, generating, sending, sent, error, generateDraft, sendEmail, reset }
}
