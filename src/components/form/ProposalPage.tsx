import { useState } from 'react'
import type { Profile } from '@/types/database'
import { loadDraft, clearDraft } from '@/hooks/useDraft'
import { defaultFormState } from '@/hooks/useProposalForm'
import type { ProposalFormState } from '@/types/proposal'
import { ProposalForm } from './ProposalForm'

type Props = { profile: Profile }

export function ProposalPage({ profile }: Props) {
  const [draftBanner, setDraftBanner] = useState<ProposalFormState | null>(() => loadDraft(profile.id))
  const [formKey, setFormKey] = useState(0)
  const [initialState, setInitialState] = useState<ProposalFormState | undefined>(undefined)

  const resumeDraft = () => {
    const draft = loadDraft(profile.id)
    setInitialState(draft ?? undefined)
    setDraftBanner(null)
    setFormKey((k) => k + 1)
  }

  const discardDraft = () => {
    clearDraft(profile.id)
    setDraftBanner(null)
    setInitialState(defaultFormState())
    setFormKey((k) => k + 1)
  }

  const handleSuccess = () => {
    setInitialState(defaultFormState())
    setFormKey((k) => k + 1)
    setDraftBanner(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-display font-bold text-kozegho-dark">New Proposal</h1>
        <p className="text-sm text-kozegho-grey-text mt-0.5">Fill in the details below to create a commercial proposal.</p>
      </div>

      {draftBanner && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-md px-4 py-3">
          <p className="text-sm text-amber-800">You have an unsaved draft. Resume where you left off?</p>
          <div className="flex gap-2 ml-4 shrink-0">
            <button onClick={resumeDraft} className="text-sm font-semibold text-kozegho-green hover:text-kozegho-green-dark">Resume</button>
            <button onClick={discardDraft} className="text-sm text-kozegho-grey-text hover:text-kozegho-dark">Discard</button>
          </div>
        </div>
      )}

      <ProposalForm key={formKey} profile={profile} initialState={initialState} onSuccess={handleSuccess} />
    </div>
  )
}
