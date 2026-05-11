import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { ProposalFormState, ProposalItem } from '@/types/proposal'
import type { ProposalLanguage } from '@/types/catalog'
import { todayISO, addDays } from '@/lib/utils'
import { PROPOSAL_LABELS } from '@/i18n/proposalLabels'

export function defaultFormState(): ProposalFormState {
  const lang: ProposalLanguage = 'EN'
  const labels = PROPOSAL_LABELS[lang]
  return {
    salesperson_name: '',
    subject: '',
    validity_date: addDays(todayISO(), 30),
    language: lang,
    customer_id: null,
    customer_draft: { name: '', company: '', email: '', country: '' },
    items: [],
    delivery_weeks: null,
    packaging_type: 'standard',
    delivery_terms: labels.defaultDeliveryTerms,
    payment_terms: labels.defaultPaymentTerms,
    warranty: labels.defaultWarranty,
    additional_notes: ''
  }
}

export function useProposalForm(initialState?: ProposalFormState) {
  const [form, setForm] = useState<ProposalFormState>(() => {
    const defaults = defaultFormState()
    if (!initialState) return defaults
    // Spread defaults first so new fields (e.g. salesperson_name) are always defined,
    // even when loading an old draft that predates the field.
    return { ...defaults, ...initialState, salesperson_name: '' }
  })

  const setField = <K extends keyof ProposalFormState>(key: K, value: ProposalFormState[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'language') {
        const lang = value as ProposalLanguage
        const labels = PROPOSAL_LABELS[lang]
        next.delivery_terms = labels.defaultDeliveryTerms
        next.payment_terms = labels.defaultPaymentTerms
        next.warranty = labels.defaultWarranty
      }
      return next
    })
  }

  const addItem = (item: Omit<ProposalItem, 'id'>) => {
    setForm((prev) => ({ ...prev, items: [...prev.items, { ...item, id: uuidv4() }] }))
  }

  const updateItem = (id: string, patch: Partial<ProposalItem>) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id !== id) return item
        const updated = { ...item, ...patch }
        const base = updated.unit_price * updated.quantity
        updated.line_total = base * (1 - updated.discount_percent / 100)
        return updated
      })
    }))
  }

  const removeItem = (id: string) => {
    setForm((prev) => ({ ...prev, items: prev.items.filter((i) => i.id !== id) }))
  }

  const reorderItems = (newItems: ProposalItem[]) => {
    setForm((prev) => ({ ...prev, items: newItems }))
  }

  const subtotal = form.items.reduce((s, i) => s + i.line_total, 0)

  return { form, setField, addItem, updateItem, removeItem, reorderItems, subtotal, total: subtotal }
}
