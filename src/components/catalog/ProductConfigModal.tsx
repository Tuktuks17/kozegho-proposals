import { useState } from 'react'
import { X } from 'lucide-react'
import type { ProductFamily, ProductVariant, ProductOption } from '@/types/catalog'
import type { ProposalItem, ProposalItemOption } from '@/types/proposal'
import type { ProposalLanguage } from '@/types/catalog'
import { formatCurrency } from '@/lib/utils'
import { resolveDatasheetUrl } from '@/services/datasheets'
import { v4 as uuidv4 } from 'uuid'

type Props = {
  family: ProductFamily
  language: ProposalLanguage
  onConfirm: (item: ProposalItem) => void
  onClose: () => void
}

export function ProductConfigModal({ family, language, onConfirm, onClose }: Props) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(family.variants[0] ?? null)
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set())
  const [quantity, setQuantity] = useState(1)
  const [discount, setDiscount] = useState(0)
  const [description, setDescription] = useState('')

  const toggleOption = (code: string) => {
    setSelectedOptions((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  const basePrice = selectedVariant?.price === 'on_request' ? 0 : (selectedVariant?.price ?? 0)
  const optionsTotal = family.options
    .filter((o) => selectedOptions.has(o.code))
    .reduce((s, o) => s + (o.price === 'on_request' ? 0 : o.price), 0)
  const unitTotal = basePrice + optionsTotal
  const lineTotal = unitTotal * quantity * (1 - discount / 100)

  const handleConfirm = () => {
    if (!selectedVariant) return
    const opts: ProposalItemOption[] = family.options
      .filter((o) => selectedOptions.has(o.code))
      .map((o): ProposalItemOption => ({ code: o.code, label: o.label, price: o.price === 'on_request' ? 0 : o.price }))

    const variantLabel = selectedVariant.priceNote
      ? `${selectedVariant.name} (${selectedVariant.priceNote})`
      : selectedVariant.name

    const datasheetUrl = family.hasDatasheet ? resolveDatasheetUrl(selectedVariant.id, language) : null

    const item: ProposalItem = {
      id: uuidv4(),
      product_id: selectedVariant.id,
      product_family: family.id,
      product_name: `${family.series} — ${variantLabel}`,
      description: description.trim() || `${family.series} — ${variantLabel}`,
      quantity,
      unit_price: unitTotal,
      discount_percent: discount,
      line_total: lineTotal,
      options: opts,
      datasheet_url: datasheetUrl
    }
    onConfirm(item)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 px-4 pb-4 sm:pb-0">
      <div className="bg-white rounded-lg shadow-card w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <p className="text-xs font-medium text-kozegho-green uppercase tracking-wide">{family.series}</p>
            <h3 className="text-base font-semibold text-kozegho-dark">{family.name}</h3>
          </div>
          <button onClick={onClose} className="text-kozegho-grey-text hover:text-kozegho-dark"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
          {/* Variant */}
          <div>
            <label className="text-xs font-semibold text-kozegho-grey-text uppercase tracking-wide block mb-2">Model</label>
            <div className="flex flex-wrap gap-2">
              {family.variants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVariant(v)}
                  className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                    selectedVariant?.id === v.id
                      ? 'border-kozegho-green bg-kozegho-green-light text-kozegho-green font-semibold'
                      : 'border-border text-kozegho-dark hover:border-kozegho-green'
                  }`}
                >
                  {v.priceNote ? `${v.name} (${v.priceNote})` : v.name}
                  <span className="ml-2 text-xs text-kozegho-grey-text">
                    {v.price === 'on_request' ? 'on request' : formatCurrency(v.price)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          {family.options.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-kozegho-grey-text uppercase tracking-wide block mb-2">Options</label>
              <div className="flex flex-col gap-1.5">
                {family.options.map((opt: ProductOption) => (
                  <label key={opt.code} className="flex items-center gap-2.5 cursor-pointer rounded-md px-2 py-1.5 hover:bg-kozegho-grey">
                    <input
                      type="checkbox"
                      checked={selectedOptions.has(opt.code)}
                      onChange={() => toggleOption(opt.code)}
                      className="rounded accent-kozegho-green w-4 h-4"
                    />
                    <span className="text-sm text-kozegho-dark flex-1">{opt.label}</span>
                    <span className="text-sm text-kozegho-grey-text">
                      {opt.price === 'on_request' ? 'on request' : `+${formatCurrency(opt.price)}`}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Qty + discount */}
          <div className="flex gap-3">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs font-semibold text-kozegho-grey-text uppercase tracking-wide">Quantity</label>
              <input
                type="number" min={1} value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="rounded-md border border-border bg-input px-3 py-2 text-sm text-kozegho-dark focus:outline-none focus:ring-2 focus:ring-kozegho-green"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs font-semibold text-kozegho-grey-text uppercase tracking-wide">Discount (%)</label>
              <input
                type="number" min={0} max={100} value={discount}
                onChange={(e) => setDiscount(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                className="rounded-md border border-border bg-input px-3 py-2 text-sm text-kozegho-dark focus:outline-none focus:ring-2 focus:ring-kozegho-green"
              />
            </div>
          </div>

          {/* Custom description */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-kozegho-grey-text uppercase tracking-wide">
              Description in proposal <span className="font-normal normal-case text-kozegho-grey-text">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Leave blank to use product name"
              rows={2}
              className="rounded-md border border-border bg-input px-3 py-2 text-sm text-kozegho-dark focus:outline-none focus:ring-2 focus:ring-kozegho-green resize-none"
            />
          </div>

          {/* Price summary */}
          <div className="bg-kozegho-grey rounded-md px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-kozegho-grey-text">Line total</span>
            <span className="text-base font-bold text-kozegho-dark">
              {selectedVariant?.price === 'on_request' ? 'On request' : formatCurrency(lineTotal)}
            </span>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-border flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-md border border-border py-2.5 text-sm font-medium text-kozegho-dark hover:bg-kozegho-grey transition-colors">
            Cancel
          </button>
          <button
            disabled={!selectedVariant}
            onClick={handleConfirm}
            className="flex-1 rounded-md bg-kozegho-green py-2.5 text-sm font-semibold text-white hover:bg-kozegho-green-dark transition-colors disabled:opacity-50"
          >
            Add to proposal
          </button>
        </div>
      </div>
    </div>
  )
}
