import type { ProposalItem } from '@/types/proposal'
import { formatCurrency } from '@/lib/utils'
import { FileText } from 'lucide-react'

type Props = {
  items: ProposalItem[]
  subtotal: number
}

export function SummaryPanel({ items, subtotal }: Props) {
  if (items.length === 0) return null

  return (
    <div className="bg-white rounded-lg border border-border shadow-card p-4 sticky top-20">
      <h3 className="text-sm font-display font-semibold text-kozegho-dark mb-3">Proposal Summary</h3>
      <div className="flex flex-col gap-2">
        {items.map((item, idx) => (
          <div key={item.id} className="flex items-start gap-2">
            <span className="text-xs font-bold text-kozegho-green mt-0.5">{idx + 1}.</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-kozegho-dark leading-snug truncate">{item.description}</p>
              <p className="text-xs text-kozegho-grey-text">×{item.quantity}</p>
            </div>
            <span className="text-xs font-semibold text-kozegho-dark shrink-0">{formatCurrency(item.line_total)}</span>
          </div>
        ))}
        <div className="border-t border-border pt-2 flex justify-between items-center">
          <span className="text-sm font-semibold text-kozegho-dark">Total</span>
          <span className="text-base font-bold text-kozegho-dark">{formatCurrency(subtotal)}</span>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-xs text-kozegho-grey-text">
        <FileText className="w-3.5 h-3.5" />
        <span>{items.filter((i) => i.datasheet_url).length} datasheet(s) will be attached</span>
      </div>
    </div>
  )
}
