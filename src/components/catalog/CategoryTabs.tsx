import { CATEGORY_ORDER } from '@/data/catalog'
import type { ProductCategory } from '@/types/catalog'
import { cn } from '@/lib/utils'

type Props = {
  active: ProductCategory | 'All'
  onChange: (cat: ProductCategory | 'All') => void
}

const ALL_CATS: Array<ProductCategory | 'All'> = ['All', ...CATEGORY_ORDER]

export function CategoryTabs({ active, onChange }: Props) {
  return (
    <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
      {ALL_CATS.map((cat) => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          className={cn(
            'shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors whitespace-nowrap',
            active === cat
              ? 'bg-kozegho-green text-white'
              : 'bg-white border border-border text-kozegho-dark hover:bg-kozegho-grey'
          )}
        >
          {cat}
        </button>
      ))}
    </div>
  )
}
