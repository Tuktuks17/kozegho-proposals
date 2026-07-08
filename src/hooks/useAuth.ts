import { useState, useEffect } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import {
  cacheMailCredentials,
  clearMailCredentials,
  providerFromSession,
} from '@/lib/mailProvider'

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
        // providerFromSession is authoritative for EVERY SIGNED_IN delivery:
        // the post-redirect one, the re-fire on each tab refocus, and the
        // cross-tab broadcast — all carry the just-signed-in identities.
        cacheMailCredentials(s.provider_token, providerFromSession(s))
      }
      if (event === 'SIGNED_OUT') {
        clearMailCredentials()
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
        scopes: 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly',
      }
    })

  // Microsoft 365 (Entra ID) — the provider_token returned is a Microsoft Graph
  // access token (Mail.Send + Mail.Read delegated scopes), mirror of the Gmail flow.
  const signInWithMicrosoft = () =>
    supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        redirectTo: window.location.origin,
        scopes: 'email offline_access Mail.Send Mail.Read',
      }
    })

  const signOut = () => {
    sessionStorage.removeItem('kp:name-confirmed')
    sessionStorage.removeItem('kp:session-name')
    clearMailCredentials()
    return supabase.auth.signOut()
  }

  return { session, user, loading, signInWithGoogle, signInWithMicrosoft, signOut }
}
