import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Customer } from '@/types/database'

export function useCustomers() {
  const [results, setResults] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)

  const search = useCallback(async (query: string) => {
    if (query.trim().length < 2) { setResults([]); return }
    setLoading(true)
    const { data } = await supabase
      .from('customers')
      .select('*')
      .ilike('company', `%${query}%`)
      .order('company')
      .limit(10)
    setResults((data as Customer[]) ?? [])
    setLoading(false)
  }, [])

  const upsert = useCallback(async (
    customer: Omit<Customer, 'id' | 'created_at' | 'created_by'>,
    userId: string
  ): Promise<Customer | null> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('customers') as any)
      .insert({ ...customer, created_by: userId })
      .select()
      .single()
    return (data as Customer | null)
  }, [])

  return { results, loading, search, upsert }
}
