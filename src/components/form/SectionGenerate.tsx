import { useState } from 'react'
import { Sparkles, Loader2, AlertCircle } from 'lucide-react'
import type { ProposalFormState } from '@/types/proposal'
import type { Customer } from '@/types/database'
import { generateIntroduction } from '@/services/generateIntroduction'
import { PROPOSAL_LABELS } from '@/i18n/proposalLabels'

type Props = {
  form: ProposalFormState
  customer: Customer | null
  salespersonName: string
  introduction: string
  onIntroductionChange: (text: string) => void
}

export function SectionGenerate({ form, customer, salespersonName, introduction, onIntroductionChange }: Props) {
  const [generating, setGenerating] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!customer || form.items.length === 0) return
    setGenerating(true)
    setAiError(null)
    try {
      const text = await generateIntroduction({
        products: form.items.map((i) => i.product_name),
        clientCountry: customer.country,
        language: form.language,
        salespersonName,
        companyName: customer.company
      })
      onIntroductionChange(text)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setAiError(msg)
      const fallback = PROPOSAL_LABELS[form.language]?.fallbackIntroduction ?? ''
      if (!introduction.trim()) onIntroductionChange(fallback)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <section className="bg-white rounded-lg border border-border shadow-card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-display font-semibold text-kozegho-dark">Introduction</h2>
        <button
          onClick={handleGenerate}
          disabled={generating || !customer || form.items.length === 0}
          className="flex items-center gap-1.5 text-sm font-medium text-kozegho-green hover:text-kozegho-green-dark disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
            : <><Sparkles className="w-4 h-4" /> Generate with AI</>
          }
        </button>
      </div>

      {aiError && (
        <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span><strong>AI error:</strong> {aiError}</span>
        </div>
      )}

      <textarea
        rows={5}
        value={introduction}
        onChange={(e) => onIntroductionChange(e.target.value)}
        placeholder="Write a custom introduction, or click 'Generate with AI' after adding products and selecting a client…"
        className="rounded-md border border-border bg-input px-3 py-2 text-sm text-kozegho-dark focus:outline-none focus:ring-2 focus:ring-kozegho-green resize-none"
      />

      {!customer && <p className="text-xs text-kozegho-grey-text">Select a client to enable AI generation.</p>}
      {customer && form.items.length === 0 && <p className="text-xs text-kozegho-grey-text">Add products to enable AI generation.</p>}
    </section>
  )
}
