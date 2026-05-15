import { useState, useEffect, useCallback } from 'react'

export type GmailThread = {
  threadId: string
  subject: string
  from: string
  date: string
  messageCount: number
  snippet: string
}

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gmail-threads`

export function useGmailThreads(customerEmail: string) {
  // Start loading only if a token is already present
  const [threads, setThreads] = useState<GmailThread[]>([])
  const [loading, setLoading] = useState(() => !!sessionStorage.getItem('kp:gmail_token'))
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const noToken = !sessionStorage.getItem('kp:gmail_token')

  useEffect(() => {
    const token = sessionStorage.getItem('kp:gmail_token')
    if (!token) return  // noToken flag handles this state in the component

    let cancelled = false
    fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ customerEmail }),
    })
      .then(async (res) => {
        if (cancelled) return
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || `Error ${res.status}`)
        } else {
          setError(null)
          setThreads(data.threads ?? [])
        }
        setLoading(false)
      })
      .catch((e) => {
        if (!cancelled) { setError(String(e)); setLoading(false) }
      })

    return () => { cancelled = true }
  }, [customerEmail, refreshKey])

  const refetch = useCallback(() => setRefreshKey(k => k + 1), [])

  return { threads, loading, error, noToken, refetch }
}
