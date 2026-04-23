import { useState } from 'react'
import { Search } from 'lucide-react'
import type { ProductFamily, ProductCategory } from '@/types/catalog'
import type { ProposalLanguage } from '@/types/catalog'
import { CATALOG, searchCatalog, groupByCategory, CATEGORY_ORDER } from '@/data/catalog'
import { ProductCard } from './ProductCard'
import { CategoryTabs } from './CategoryTabs'
import { ProductConfigModal } from './ProductConfigModal'
import type { ProposalItem } from '@/types/proposal'

type Props = {
  language: ProposalLanguage
  onAddItem: (item: ProposalItem) => void
}

export function CatalogBrowser({ language, onAddItem }: Props) {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<ProductCategory | 'All'>('All')
  const [configFamily, setConfigFamily] = useState<ProductFamily | null>(null)

  const filtered = query.trim() ? searchCatalog(query) : CATALOG
  const shown = activeCategory === 'All'
    ? filtered
    : filtered.filter((f) => f.category === activeCategory)

  const grouped = groupByCategory(shown)
  const categoriesToShow = CATEGORY_ORDER.filter((cat) => grouped[cat].length > 0)

  return (
    <>
      <div className="flex flex-col gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-kozegho-grey-text" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products..."
            className="w-full rounded-md border border-border bg-white pl-9 pr-3 py-2 text-sm text-kozegho-dark focus:outline-none focus:ring-2 focus:ring-kozegho-green"
          />
        </div>

        {/* Category filter */}
        <CategoryTabs active={activeCategory} onChange={setActiveCategory} />

        {/* Product grid by category */}
        {categoriesToShow.map((cat) => (
          <div key={cat}>
            <h3 className="text-xs font-semibold text-kozegho-grey-text uppercase tracking-wide mb-2">{cat}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {grouped[cat].map((family) => (
                <ProductCard key={family.id} family={family} onAdd={setConfigFamily} />
              ))}
            </div>
          </div>
        ))}

        {categoriesToShow.length === 0 && (
          <div className="text-center py-12 text-sm text-kozegho-grey-text">No products match your search.</div>
        )}
      </div>

      {configFamily && (
        <ProductConfigModal
          family={configFamily}
          language={language}
          onConfirm={onAddItem}
          onClose={() => setConfigFamily(null)}
        />
      )}
    </>
  )
}
