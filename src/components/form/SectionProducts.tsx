import { useState } from 'react'
import { Trash2, ChevronDown, ChevronUp, Package } from 'lucide-react'
import type { ProposalItem } from '@/types/proposal'
import type { ProposalLanguage } from '@/types/catalog'
import { CatalogBrowser } from '@/components/catalog/CatalogBrowser'
import { formatCurrency } from '@/lib/utils'

type Props = {
  items: ProposalItem[]
  language: ProposalLanguage
  onAddItem: (item: ProposalItem) => void
  onRemoveItem: (id: string) => void
  subtotal: number
}

export function SectionProducts({ items, language, onAddItem, onRemoveItem, subtotal }: Props) {
  const [showCatalog, setShowCatalog] = useState(items.length === 0)

  return (
    <section className="bg-white rounded-lg border border-border shadow-card overflow-hidden">
      {/* Selected items */}
      {items.length > 0 && (
        <div className="divide-y divide-border">
          {items.map((item, idx) => (
            <div key={item.id} className="px-5 py-3 flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-kozegho-green-light text-kozegho-green text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{idx + 1}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-kozegho-dark leading-snug">{item.description}</p>
                {item.options.length > 0 && (
                  <p className="text-xs text-kozegho-grey-text mt-0.5">{item.options.map((o) => o.label).join(', ')}</p>
                )}
                <div className="flex items-center gap-3 mt-1 text-xs text-kozegho-grey-text">
                  <span>Qty: {item.quantity}</span>
                  <span>Unit: {formatCurrency(item.unit_price)}</span>
                  {item.discount_percent > 0 && <span className="text-orange-500">-{item.discount_percent}%</span>}
                </div>
                <div className="mt-1">
                  {item.datasheet_url ? (
                    <span className="inline-flex items-center gap-1 text-xs text-kozegho-green bg-kozegho-green-light px-1.5 py-0.5 rounded">
                      📄 {item.datasheet_url.split('/').pop()}
                    </span>
                  ) : (
                    <span className="text-xs text-kozegho-grey-text opacity-50">Datasheet: N/A</span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-kozegho-dark">{formatCurrency(item.line_total)}</p>
                <button onClick={() => onRemoveItem(item.id)} className="mt-1 text-kozegho-grey-text hover:text-red-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          <div className="px-5 py-3 flex justify-end bg-kozegho-grey">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-kozegho-dark">Subtotal:</span>
              <span className="text-base font-bold text-kozegho-dark">{formatCurrency(subtotal)}</span>
            </div>
          </div>
        </div>
      )}

      {items.length === 0 && !showCatalog && (
        <div className="px-5 py-8 flex flex-col items-center gap-3 text-center">
          <Package className="w-8 h-8 text-kozegho-grey-text" />
          <p className="text-sm text-kozegho-grey-text">No products added yet.</p>
        </div>
      )}

      {/* Toggle catalog */}
      <div className="border-t border-border">
        <button
          onClick={() => setShowCatalog(!showCatalog)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-medium text-kozegho-green hover:bg-kozegho-green-light transition-colors"
        >
          <span>{showCatalog ? 'Hide catalog' : '+ Add products from catalog'}</span>
          {showCatalog ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {showCatalog && (
        <div className="p-5 border-t border-border">
          <CatalogBrowser language={language} onAddItem={onAddItem} />
        </div>
      )}
    </section>
  )
}
