import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export type Product = {
  id: string
  name: string
  series: string
  description_pt: string | null
  description_en: string | null
  description_fr: string | null
  description_es: string | null
  description_de: string | null
  datasheet_pt: string | null
  datasheet_gb: string | null
  datasheet_fr: string | null
  datasheet_es: string | null
  datasheet_de: string | null
  base_price_eur: number | null
  active: boolean
  created_at: string
}

export type ProductsByGroup = Record<string, Product[]>

const LANG_TO_KEY: Record<string, keyof Product> = {
  pt: 'datasheet_pt',
  en: 'datasheet_gb',
  fr: 'datasheet_fr',
  es: 'datasheet_es',
  de: 'datasheet_de',
}

export function getDatasheetPath(product: Product, language: string): string | null {
  const key = LANG_TO_KEY[language.toLowerCase()] ?? 'datasheet_pt'
  return (product[key] as string | null) ?? null
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .order('series')
      .order('name')
      .then(({ data, error: err }) => {
        if (err) setError(err.message)
        else setProducts((data as Product[]) ?? [])
        setLoading(false)
      })
  }, [])

  const grouped = products.reduce<ProductsByGroup>((acc, p) => {
    if (!acc[p.series]) acc[p.series] = []
    acc[p.series].push(p)
    return acc
  }, {})

  return { products, grouped, loading, error }
}
