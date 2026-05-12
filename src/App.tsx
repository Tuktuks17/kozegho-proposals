import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { useOfflineQueue } from '@/hooks/useOfflineQueue'
import { LoginScreen } from '@/components/auth/LoginScreen'
import { NameSetupModal } from '@/components/auth/NameSetupModal'
import { AppShell } from '@/components/layout/AppShell'
import { OfflineIndicator } from '@/components/layout/OfflineIndicator'
import { InstallBanner } from '@/components/layout/InstallBanner'
import { ProposalPage } from '@/components/form/ProposalPage'
import { ProposalHistory } from '@/components/history/ProposalHistory'

type View = 'form' | 'history'

export default function App() {
  const { session, user, loading, signInWithGoogle, signOut } = useAuth()
  const { profile, updateName } = useProfile(user)
  const [view, setView] = useState<View>('form')

  // Confirmed name persists within the browser session (cleared on tab close / signOut)
  const [nameConfirmed, setNameConfirmed] = useState<boolean>(
    () => sessionStorage.getItem('kp:name-confirmed') === 'true'
  )
  const [sessionName, setSessionName] = useState<string>(
    () => sessionStorage.getItem('kp:session-name') || ''
  )

  useOfflineQueue()

  const handleNameSave = (name: string) => {
    updateName(name)
    sessionStorage.setItem('kp:name-confirmed', 'true')
    sessionStorage.setItem('kp:session-name', name)
    setSessionName(name)
    setNameConfirmed(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-kozegho-grey">
        <div className="w-8 h-8 border-2 border-kozegho-green border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session || !user) {
    return <LoginScreen onSignIn={signInWithGoogle} />
  }

  // Wait for profile to load from DB
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-kozegho-grey">
        <div className="w-8 h-8 border-2 border-kozegho-green border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Ask for name at the start of every browser session
  if (!nameConfirmed) {
    return (
      <NameSetupModal
        onSave={handleNameSave}
        initialName={profile.full_name || ''}
      />
    )
  }

  // Use the name confirmed this session (immediately, before DB round-trip completes)
  const displayName = sessionName || profile.full_name
  const effectiveProfile = { ...profile, full_name: displayName }

  return (
    <>
      <AppShell userName={displayName} onSignOut={signOut} view={view} onViewChange={setView}>
        {view === 'form'
          ? <ProposalPage profile={effectiveProfile} />
          : <ProposalHistory profile={effectiveProfile} />
        }
      </AppShell>
      <OfflineIndicator />
      <InstallBanner />
    </>
  )
}
