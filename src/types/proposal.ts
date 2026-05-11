import type { ProposalLanguage } from './catalog'

export type ProposalItemOption = { code: string; label: string; price: number }

export type ProposalItem = {
  id: string
  product_id: string
  product_family: string
  product_name: string
  description: string
  quantity: number
  unit_price: number
  discount_percent: number
  line_total: number
  options: ProposalItemOption[]
  datasheet_url: string | null
}

export type PackagingType = 'standard' | 'ocean'

export type ProposalFormState = {
  salesperson_name: string
  subject: string
  validity_date: string
  language: ProposalLanguage
  customer_id: string | null
  customer_draft: { name: string; company: string; email: string; country: string }
  items: ProposalItem[]
  delivery_weeks: number | null
  packaging_type: PackagingType
  delivery_terms: string
  payment_terms: string
  warranty: string
  additional_notes: string
}

export type PersistedProposal = {
  id: string
  reference: string
  customer_id: string
  salesperson_name: string
  language: string
  subject: string
  introduction: string | null
  items: ProposalItem[]
  subtotal: number
  total: number
  validity_date: string | null
  delivery_weeks: number | null
  packaging_type: PackagingType | null
  delivery_terms: string | null
  payment_terms: string | null
  warranty: string | null
  additional_notes: string | null
  status: 'draft' | 'exported'
  email_sent_at?: string | null
  last_email_to?: string | null
  last_email_subject?: string | null
  created_by: string
  created_at: string
  updated_at: string
}
