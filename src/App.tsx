import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { useOfflineQueue } from '@/hooks/useOfflineQueue'
import { LoginScreen } from '@/components/auth/LoginScreen'
import { NameSetupModal } from '@/components/auth/NameSetupModal'
import { AppShell } from '@/components/layout/AppShell'
import { OfflineIndicator } from '@/components/layout/OfflineIndicator'
import { InstallBanner } from '@/components/layout/InstallBanner'
import { ProposalPage } from '@/components/form/ProposalPage'

export default function App() {
  const { session, user, loading, signInWithGoogle, signOut } = useAuth()
  const { profile, updateName } = useProfile(user)

  useOfflineQueue()

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

  if (!profile || !profile.full_name) {
    return <NameSetupModal onSave={updateName} />
  }

  return (
    <>
      <AppShell userName={profile.full_name} onSignOut={signOut}>
        <ProposalPage profile={profile} />
      </AppShell>
      <OfflineIndicator />
      <InstallBanner />
    </>
  )
}
