import type { ProductFamily } from '@/types/catalog'
import { Plus, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  family: ProductFamily
  onAdd: (family: ProductFamily) => void
}

export function ProductCard({ family, onAdd }: Props) {
  return (
    <div className="bg-white rounded-md border border-border shadow-card p-4 flex flex-col gap-3 hover:border-kozegho-green transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-kozegho-green uppercase tracking-wide">{family.series}</p>
          <h3 className="text-sm font-semibold text-kozegho-dark mt-0.5 leading-tight">{family.name}</h3>
        </div>
        {family.hasDatasheet && (
          <span className="flex items-center gap-1 shrink-0 text-xs text-kozegho-grey-text border border-border rounded px-1.5 py-0.5">
            <FileText className="w-3 h-3" />
            DS
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {family.variants.slice(0, 4).map((v) => (
          <span key={v.id} className="text-xs bg-kozegho-grey text-kozegho-dark px-1.5 py-0.5 rounded">{v.name}</span>
        ))}
        {family.variants.length > 4 && (
          <span className="text-xs text-kozegho-grey-text">+{family.variants.length - 4} more</span>
        )}
      </div>
      {family.note && (
        <p className="text-xs text-kozegho-grey-text italic">{family.note}</p>
      )}
      <button
        onClick={() => onAdd(family)}
        className={cn(
          'mt-auto flex items-center justify-center gap-1.5 w-full rounded-md py-2 text-sm font-medium transition-colors',
          'bg-kozegho-green-light text-kozegho-green hover:bg-kozegho-green hover:text-white'
        )}
      >
        <Plus className="w-4 h-4" />
        Add to proposal
      </button>
    </div>
  )
}
