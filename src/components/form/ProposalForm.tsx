import { useState } from 'react'
import type { ProposalFormState, PersistedProposal } from '@/types/proposal'
import type { Profile, Customer } from '@/types/database'
import { useProposalForm } from '@/hooks/useProposalForm'
import { useProposalReference } from '@/hooks/useProposalReference'
import { useAutosaveDraft, clearDraft } from '@/hooks/useDraft'
import { supabase } from '@/lib/supabase'
import { SectionDetails } from './SectionDetails'
import { SectionClient } from './SectionClient'
import { SectionProducts } from './SectionProducts'
import { SectionTerms } from './SectionTerms'
import { SectionGenerate } from './SectionGenerate'
import { ExportModal } from '@/components/export/ExportModal'

type Props = {
  profile: Profile
  initialState?: ProposalFormState
  onSuccess: () => void
}

export function ProposalForm({ profile, initialState, onSuccess }: Props) {
  const { form, setField, addItem, removeItem, subtotal } = useProposalForm(initialState)
  const reference = useProposalReference()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [introduction, setIntroduction] = useState('')
  const [saving, setSaving] = useState(false)
  const [exportProposal, setExportProposal] = useState<PersistedProposal | null>(null)
  const [errors, setErrors] = useState<string[]>([])

  useAutosaveDraft(profile.id, form)

  const validate = (): string[] => {
    const errs: string[] = []
    if (!form.subject.trim()) errs.push('Subject is required')
    if (!form.validity_date) errs.push('Validity date is required')
    if (!form.customer_id && !form.customer_draft.company) errs.push('Client is required')
    if (form.items.length === 0) errs.push('Add at least one product')
    return errs
  }

  const handleSubmit = async () => {
    const errs = validate()
    if (errs.length > 0) { setErrors(errs); return }
    setErrors([])
    setSaving(true)

    try {
      let customerId = form.customer_id
      let resolvedCustomer = customer

      // If new customer draft, save it first
      if (!customerId && form.customer_draft.company) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: newCustomer } = await (supabase.from('customers') as any)
          .insert({ ...form.customer_draft, created_by: profile.id })
          .select()
          .single()
        if (newCustomer) {
          customerId = (newCustomer as Customer).id
          resolvedCustomer = newCustomer as Customer
        }
      }

      if (!customerId || !resolvedCustomer) throw new Error('Customer required')

      const persisted: Omit<PersistedProposal, 'id' | 'created_at' | 'updated_at'> = {
        reference,
        customer_id: customerId,
        salesperson_name: profile.full_name,
        language: form.language,
        subject: form.subject,
        introduction,
        items: form.items,
        subtotal,
        total: subtotal,
        validity_date: form.validity_date,
        delivery_weeks: form.delivery_weeks,
        packaging_type: form.packaging_type,
        delivery_terms: form.delivery_terms,
        payment_terms: form.payment_terms,
        warranty: form.warranty,
        additional_notes: form.additional_notes,
        status: 'draft',
        created_by: profile.id
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('proposals') as any)
        .insert(persisted)
        .select()
        .single()

      if (error) throw error

      clearDraft(profile.id)
      setExportProposal(data as PersistedProposal)
    } catch (e) {
      setErrors([String(e)])
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <SectionDetails form={form} reference={reference} onSetField={setField} />
        <SectionClient
          form={form}
          userId={profile.id}
          onSetField={setField}
          onCustomerCreated={setCustomer}
        />
        <SectionProducts
          items={form.items}
          language={form.language}
          onAddItem={addItem}
          onRemoveItem={removeItem}
          subtotal={subtotal}
        />
        <SectionGenerate
          form={form}
          customer={customer}
          salespersonName={profile.full_name}
          introduction={introduction}
          onIntroductionChange={setIntroduction}
        />
        <SectionTerms form={form} onSetField={setField} />

        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3">
            <ul className="list-disc list-inside text-sm text-red-700 space-y-0.5">
              {errors.map((e) => <li key={e}>{e}</li>)}
            </ul>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full rounded-md bg-kozegho-green py-3 text-base font-semibold text-white hover:bg-kozegho-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving…' : 'Create Proposal'}
        </button>
      </div>

      {exportProposal && customer && (
        <ExportModal
          proposal={exportProposal}
          customer={customer}
          onClose={() => { setExportProposal(null); onSuccess() }}
        />
      )}
    </>
  )
}
