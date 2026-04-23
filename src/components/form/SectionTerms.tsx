import type { ProposalFormState, PackagingType } from '@/types/proposal'

type Props = {
  form: ProposalFormState
  onSetField: <K extends keyof ProposalFormState>(key: K, value: ProposalFormState[K]) => void
}

export function SectionTerms({ form, onSetField }: Props) {
  return (
    <section className="bg-white rounded-lg border border-border shadow-card p-5 flex flex-col gap-4">
      <h2 className="text-base font-display font-semibold text-kozegho-dark">Terms & Conditions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-kozegho-grey-text uppercase tracking-wide">Delivery weeks</label>
          <input
            type="number" min={1}
            value={form.delivery_weeks ?? ''}
            onChange={(e) => onSetField('delivery_weeks', e.target.value ? parseInt(e.target.value) : null)}
            placeholder="e.g. 12"
            className="rounded-md border border-border bg-input px-3 py-2 text-sm text-kozegho-dark focus:outline-none focus:ring-2 focus:ring-kozegho-green"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-kozegho-grey-text uppercase tracking-wide">Packaging</label>
          <div className="flex gap-3">
            {(['standard', 'ocean'] as PackagingType[]).map((type) => (
              <label key={type} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="packaging"
                  value={type}
                  checked={form.packaging_type === type}
                  onChange={() => onSetField('packaging_type', type)}
                  className="accent-kozegho-green w-4 h-4"
                />
                <span className="text-sm text-kozegho-dark capitalize">{type}</span>
              </label>
            ))}
          </div>
        </div>
        {(['delivery_terms', 'payment_terms', 'warranty'] as const).map((field) => (
          <div key={field} className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-kozegho-grey-text uppercase tracking-wide">
              {field.replace(/_/g, ' ')}
            </label>
            <input
              type="text"
              value={form[field]}
              onChange={(e) => onSetField(field, e.target.value)}
              className="rounded-md border border-border bg-input px-3 py-2 text-sm text-kozegho-dark focus:outline-none focus:ring-2 focus:ring-kozegho-green"
            />
          </div>
        ))}
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className="text-xs font-semibold text-kozegho-grey-text uppercase tracking-wide">Additional notes</label>
          <textarea
            rows={3}
            value={form.additional_notes}
            onChange={(e) => onSetField('additional_notes', e.target.value)}
            placeholder="Any additional information to include in the proposal…"
            className="rounded-md border border-border bg-input px-3 py-2 text-sm text-kozegho-dark focus:outline-none focus:ring-2 focus:ring-kozegho-green resize-none"
          />
        </div>
      </div>
    </section>
  )
}
