import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export function useAlertCount() {
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    supabase
      .from('proposals')
      .select('id', { count: 'exact', head: true })
      .or('outcome.is.null,outcome.eq.open')
      .lt('created_at', sevenDaysAgo)
      .then(({ count: c }) => {
        setCount(c ?? 0)
        setLoading(false)
      })
  }, [])

  return { count, loading }
}
