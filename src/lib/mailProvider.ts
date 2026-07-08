import type { Session } from '@supabase/supabase-js'

// Single source of truth for "which mail ecosystem is this session using".
// google → Gmail API with the user's provider_token (existing flow)
// azure  → Microsoft Graph /me with the user's provider_token (delegated)
export type MailProvider = 'google' | 'azure'

const TOKEN_KEY = 'kp:mail_token'
const PROVIDER_KEY = 'kp:mail_provider'
// Pre-dual-provider sessions cached the token under this key — keep reading it
// so an already-open tab survives the deploy without a forced re-login. A token
// under this key is by definition a Gmail token.
const LEGACY_TOKEN_KEY = 'kp:gmail_token'

// The provider that produced the CURRENT provider_token is the identity with the
// most recent sign-in. Do NOT use app_metadata.provider — it records only the
// provider of the very first sign-up, so a Google-first user who now signs in
// with Microsoft (identities auto-linked on matching verified email) would have
// their Graph token routed to the Gmail API.
export function providerFromSession(session: Session): MailProvider {
  const identities = session.user?.identities
  if (identities?.length) {
    const latest = [...identities].sort((a, b) =>
      (b.last_sign_in_at ?? '').localeCompare(a.last_sign_in_at ?? '')
    )[0]
    return latest.provider === 'azure' ? 'azure' : 'google'
  }
  return session.user?.app_metadata?.provider === 'azure' ? 'azure' : 'google'
}

export function cacheMailCredentials(token: string, provider: MailProvider) {
  sessionStorage.setItem(TOKEN_KEY, token)
  sessionStorage.setItem(PROVIDER_KEY, provider)
}

export function clearMailCredentials() {
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(PROVIDER_KEY)
  sessionStorage.removeItem(LEGACY_TOKEN_KEY)
}

export function hasCachedMailToken(): boolean {
  return !!(sessionStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(LEGACY_TOKEN_KEY))
}

// Token and provider must always come from the SAME source, otherwise a token
// from one ecosystem can be labelled with (and sent to) the other:
// - live session token → provider derived from that session's identities
// - cached token → the provider cached in the same SIGNED_IN event
// - legacy cached token → 'google' (only the Gmail flow ever wrote that key)
export function getMailCredentials(session: Session | null): {
  token: string | null
  provider: MailProvider
} {
  if (session?.provider_token) {
    return { token: session.provider_token, provider: providerFromSession(session) }
  }

  const cachedToken = sessionStorage.getItem(TOKEN_KEY)
  if (cachedToken) {
    const cached = sessionStorage.getItem(PROVIDER_KEY)
    return {
      token: cachedToken,
      provider: cached === 'azure' ? 'azure' : 'google',
    }
  }

  const legacyToken = sessionStorage.getItem(LEGACY_TOKEN_KEY)
  if (legacyToken) return { token: legacyToken, provider: 'google' }

  return { token: null, provider: session ? providerFromSession(session) : 'google' }
}
