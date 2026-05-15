import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export type GmailThread = {
  threadId: string
  subject: string
  from: string
  date: string
  messageCount: number
  snippet: string
}

export function useGmailThreads(customerEmail: string) {
  const [threads, setThreads] = useState<GmailThread[]>([])
  const [loading, setLoading] = useState(() => !!sessionStorage.getItem('kp:gmail_token'))
  const [error, setError] = useState<string | null>(null)
  const [noToken, setNoToken] = useState(!sessionStorage.getItem('kp:gmail_token'))
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (cancelled) return null
        // Prefer the live provider_token from the current session; fall back to
        // the token cached in sessionStorage from the last SIGNED_IN event.
        const token = session?.provider_token || sessionStorage.getItem('kp:gmail_token')
        if (!token) {
          setNoToken(true)
          setLoading(false)
          return null
        }
        setNoToken(false)
        // Pass the Gmail token in the body — supabase.functions.invoke handles
        // Supabase auth automatically via its own Authorization header.
        return supabase.functions.invoke('gmail-threads', {
          body: { customerEmail, gmailToken: token },
        })
      })
      .then(async (result) => {
        if (!result || cancelled) return
        if (result.error) {
          // FunctionsHttpError has a `context` Response with the actual error body from the function
          let msg = (result.error as { message: string }).message
          try {
            const body = await (result.error as unknown as { context: Response }).context.clone().json()
            if (body?.error) msg = body.error
          } catch { /* keep generic message */ }
          setError(msg)
        } else {
          setError(null)
          setThreads((result.data as { threads?: GmailThread[] })?.threads ?? [])
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
