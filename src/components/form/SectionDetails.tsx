import type { ProposalFormState } from '@/types/proposal'
import type { ProposalLanguage } from '@/types/catalog'

type Props = {
  form: ProposalFormState
  reference: string
  onSetField: <K extends keyof ProposalFormState>(key: K, value: ProposalFormState[K]) => void
}

const LANGUAGES: { code: ProposalLanguage; label: string }[] = [
  { code: 'PT', label: 'Portuguese' },
  { code: 'ES', label: 'Spanish' },
  { code: 'FR', label: 'French' },
  { code: 'EN', label: 'English' }
]

export function SectionDetails({ form, reference, onSetField }: Props) {
  return (
    <section className="bg-white rounded-lg border border-border shadow-card p-5 flex flex-col gap-4">
      <h2 className="text-base font-display font-semibold text-kozegho-dark">Proposal Details</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-kozegho-grey-text uppercase tracking-wide">Reference</label>
          <input
            readOnly value={reference || '—'}
            className="rounded-md border border-border bg-kozegho-grey px-3 py-2 text-sm text-kozegho-grey-text"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-kozegho-grey-text uppercase tracking-wide">Language</label>
          <select
            value={form.language}
            onChange={(e) => onSetField('language', e.target.value as ProposalLanguage)}
            className="rounded-md border border-border bg-input px-3 py-2 text-sm text-kozegho-dark focus:outline-none focus:ring-2 focus:ring-kozegho-green"
          >
            {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className="text-xs font-semibold text-kozegho-grey-text uppercase tracking-wide">Subject *</label>
          <input
            type="text"
            value={form.subject}
            onChange={(e) => onSetField('subject', e.target.value)}
            placeholder="e.g. Polymer preparation system for WWTP expansion"
            className="rounded-md border border-border bg-input px-3 py-2 text-sm text-kozegho-dark focus:outline-none focus:ring-2 focus:ring-kozegho-green"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-kozegho-grey-text uppercase tracking-wide">Valid Until *</label>
          <input
            type="date"
            value={form.validity_date}
            onChange={(e) => onSetField('validity_date', e.target.value)}
            className="rounded-md border border-border bg-input px-3 py-2 text-sm text-kozegho-dark focus:outline-none focus:ring-2 focus:ring-kozegho-green"
          />
        </div>

      </div>
    </section>
  )
}
