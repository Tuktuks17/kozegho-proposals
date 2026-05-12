import { useState, useEffect } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_IN' && s?.provider_token) {
        sessionStorage.setItem('kp:gmail_token', s.provider_token)
      }
      if (event === 'SIGNED_OUT') {
        sessionStorage.removeItem('kp:gmail_token')
      }
      setSession(s)
      setUser(s?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        scopes: 'https://www.googleapis.com/auth/gmail.send',
      }
    })

  const signOut = () => {
    sessionStorage.removeItem('kp:name-confirmed')
    sessionStorage.removeItem('kp:session-name')
    sessionStorage.removeItem('kp:gmail_token')
    return supabase.auth.signOut()
  }

  return { session, user, loading, signInWithGoogle, signOut }
}
